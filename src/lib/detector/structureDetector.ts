import { DocumentSection, ExtractedPage, ExtractedParagraph } from '../../types';
import { ACADEMIC_PATTERNS } from './academicPatterns';
import { calculateConfidence, formatSectionTitle, isLikelyTocLine, EvaluationContext } from './confidenceScorer';

interface CandidatePoint {
  title: string;
  normalizedKey: string;
  category: 'frontmatter' | 'chapter' | 'backmatter' | 'other';
  rank: number;
  start: number; // 1-based page or 0-based para
  confidence: number;
  snippet?: string;
  notes?: string[];
  needsReview?: boolean;
}

// Canonical structural rank for Indonesian academic thesis lifecycle
const CANONICAL_RANKS: Record<string, number> = {
  cover: 10,
  title_page: 20,
  approval: 30,
  declaration: 40,
  dedication_motto: 50,
  abstract_id: 60,
  abstract_en: 70,
  preface: 80,
  toc: 90,
  table_list: 100,
  figure_list: 110,
  appendix_list: 120,
  bab_1: 200,
  bab_2: 300,
  bab_3: 400,
  bab_4: 500,
  bab_5: 600,
  bab_6: 700,
  bab_7: 800,
  bibliography: 900,
  appendix: 1000,
  curriculum_vitae: 1100,
};

/**
 * Detect sections from extracted PDF pages with strict structural hierarchy
 * and deduplication so chapters are not fragmented into multiple sub-cards.
 */
export function detectPdfStructure(pages: ExtractedPage[]): {
  sections: DocumentSection[];
  detectedTocPages: number[];
} {
  const totalPages = pages.length;
  if (totalPages === 0) return { sections: [], detectedTocPages: [] };

  // Step 1: Identify all Table of Contents pages first to prevent false positives
  const detectedTocPages: number[] = [];
  pages.forEach((page) => {
    const firstFewLines = page.lines.slice(0, 5).join(' ');
    if (/daftar\s+isi|table\s+of\s+contents?/i.test(firstFewLines)) {
      detectedTocPages.push(page.pageNumber);
    }
  });

  const tocPageSet = new Set(detectedTocPages);

  // Step 2: Detect repeating running headers across pages (e.g. line 0 headers on multiple pages)
  const headerFrequency = new Map<string, number>();
  pages.forEach((page) => {
    if (page.lines.length > 0) {
      const top0 = page.lines[0].trim().toUpperCase();
      if (top0.length > 3 && top0.length < 120) {
        headerFrequency.set(top0, (headerFrequency.get(top0) || 0) + 1);
      }
      if (page.lines.length > 1) {
        const top1 = page.lines[1].trim().toUpperCase();
        if (top1.length > 3 && top1.length < 120) {
          headerFrequency.set(top1, (headerFrequency.get(top1) || 0) + 1);
        }
      }
    }
  });

  // Lines appearing 3 or more times at the very top of pages are running headers
  const isRepeatingHeader = (line: string): boolean => {
    const normalized = line.trim().toUpperCase();
    const count = headerFrequency.get(normalized) || 0;
    return count >= 3;
  };

  const rawCandidates: CandidatePoint[] = [];

  // Step 3: Scan pages for section headers
  pages.forEach((page) => {
    const isTocPage = tocPageSet.has(page.pageNumber);

    // Count how many chapter patterns exist on this page
    let chapterMatchesOnPage = 0;
    page.lines.forEach((line) => {
      if (/^bab\s+(?:i|ii|iii|iv|v|vi|vii|[0-9]+)/i.test(line.trim())) {
        chapterMatchesOnPage++;
      }
    });

    // Check top lines of the page
    for (let lineIdx = 0; lineIdx < Math.min(page.lines.length, 6); lineIdx++) {
      const line = page.lines[lineIdx].trim();
      if (!line) continue;

      // Skip running headers that repeat identically on 3+ pages
      if (lineIdx <= 1 && isRepeatingHeader(line)) {
        continue;
      }

      // Check against academic patterns
      for (const pattern of ACADEMIC_PATTERNS) {
        let isMatch = false;

        for (const regex of pattern.regexList) {
          if (regex.test(line)) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          // If this is a BAB, check if the next line is the subtitle (e.g. BAB IV \n HASIL DAN PEMBAHASAN)
          let fullHeading = line;
          if (pattern.category === 'chapter' && lineIdx + 1 < page.lines.length) {
            const nextLine = page.lines[lineIdx + 1].trim();
            if (nextLine && nextLine.length > 2 && nextLine.length < 80 && !isLikelyTocLine(nextLine)) {
              if (nextLine === nextLine.toUpperCase() || /^[A-Z]/.test(nextLine)) {
                fullHeading = `${line} ${nextLine}`;
              }
            }
          }

          const ctx: EvaluationContext = {
            isInsideTocPage: isTocPage,
            pageIndex: page.pageNumber,
            totalUnits: totalPages,
            otherMatchesOnSameUnit: chapterMatchesOnPage,
            linePositionInUnit: lineIdx,
            hasDotLeader: isLikelyTocLine(line),
          };

          const result = calculateConfidence(pattern, fullHeading, ctx);

          // Only accept if not a ToC reference and confidence is reasonable
          if (!result.isToc && result.confidence >= 50) {
            const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);
            const rank = CANONICAL_RANKS[pattern.key] || 500;

            const existingOnSamePage = rawCandidates.find((c) => c.start === page.pageNumber);
            if (!existingOnSamePage || result.confidence > existingOnSamePage.confidence) {
              if (existingOnSamePage) {
                const idx = rawCandidates.indexOf(existingOnSamePage);
                rawCandidates.splice(idx, 1);
              }

              rawCandidates.push({
                title: formattedTitle,
                normalizedKey: pattern.key,
                category: pattern.category,
                rank: rank,
                start: page.pageNumber,
                confidence: result.confidence,
                snippet: page.lines.slice(0, 3).join(' ').substring(0, 120),
                notes: result.notes,
                needsReview: result.needsReview,
              });
            }
            break; // Matched a pattern for this line
          }
        }
      }
    }
  });

  // Step 4: Structural Filtering & Deduplication
  // This solves the problem where BAB 4 repeats on later pages or gets fragmented.
  const filteredCandidates = filterAndDeduplicateCandidates(rawCandidates, totalPages);

  // Step 5: Build non-overlapping contiguous sections
  const sections = buildContiguousSections(filteredCandidates, totalPages, 1);
  return { sections, detectedTocPages };
}

/**
 * Detect sections from extracted DOCX paragraphs
 */
export function detectDocxStructure(paragraphs: ExtractedParagraph[]): {
  sections: DocumentSection[];
  detectedTocIndexes: number[];
} {
  const totalParagraphs = paragraphs.length;
  if (totalParagraphs === 0) return { sections: [], detectedTocIndexes: [] };

  const detectedTocIndexes: number[] = [];
  const rawCandidates: CandidatePoint[] = [];

  // Step 1: Scan for ToC sections
  paragraphs.forEach((p) => {
    if (/daftar\s+isi|table\s+of\s+contents?/i.test(p.text.trim()) && p.text.trim().length < 40) {
      detectedTocIndexes.push(p.index);
    }
  });

  // Step 2: Scan paragraphs
  paragraphs.forEach((p) => {
    const text = p.text.trim();
    if (!text || text.length < 2) return;

    for (const pattern of ACADEMIC_PATTERNS) {
      let isMatch = false;
      for (const regex of pattern.regexList) {
        if (regex.test(text)) {
          isMatch = true;
          break;
        }
      }

      if (isMatch) {
        let fullHeading = text;

        if (pattern.category === 'chapter' && p.index + 1 < paragraphs.length) {
          const nextP = paragraphs[p.index + 1];
          const nextText = nextP.text.trim();
          if (nextText && nextText.length < 80 && !isLikelyTocLine(nextText)) {
            if (nextP.isBold || nextP.isCentered || nextText === nextText.toUpperCase()) {
              fullHeading = `${text} ${nextText}`;
            }
          }
        }

        const ctx: EvaluationContext = {
          isInsideTocPage: isLikelyTocLine(text),
          totalUnits: totalParagraphs,
          otherMatchesOnSameUnit: 1,
          linePositionInUnit: 0,
          isHeadingStyle: p.isHeading,
          headingLevel: p.headingLevel,
          isBold: p.isBold,
          isCentered: p.isCentered,
          fontSize: p.fontSize,
          hasPageBreak: p.hasPageBreakBefore,
          hasDotLeader: isLikelyTocLine(text),
        };

        const result = calculateConfidence(pattern, fullHeading, ctx);

        if (!result.isToc && result.confidence >= 50) {
          const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);
          const rank = CANONICAL_RANKS[pattern.key] || 500;

          const isDuplicate = rawCandidates.some(
            (c) => Math.abs(c.start - p.index) <= 2 && c.normalizedKey === pattern.key
          );

          if (!isDuplicate) {
            rawCandidates.push({
              title: formattedTitle,
              normalizedKey: pattern.key,
              category: pattern.category,
              rank: rank,
              start: p.index,
              confidence: result.confidence,
              snippet: text.substring(0, 100),
              notes: result.notes,
              needsReview: result.needsReview,
            });
          }
          break;
        }
      }
    }
  });

  const filteredCandidates = filterAndDeduplicateCandidates(rawCandidates, totalParagraphs);
  const sections = buildContiguousSections(filteredCandidates, totalParagraphs - 1, 0);
  return { sections, detectedTocIndexes };
}

/**
 * Filter and deduplicate candidates according to canonical academic structure:
 * 1. For each chapter / major section, keep ONLY the first occurrence (minimum start page).
 * 2. Frontmatter cannot appear after BAB 1 has started.
 * 3. Chapter order must strictly progress monotonically (BAB 1 -> BAB 2 -> BAB 3 -> BAB 4 -> BAB 5 -> Daftar Pustaka -> Lampiran).
 * 4. Eliminates false-positive fragments inside chapters so that BAB 4 (hal 40-77) is 1 unified card before BAB 5 (hal 78).
 */
function filterAndDeduplicateCandidates(
  candidates: CandidatePoint[],
  totalUnits: number
): CandidatePoint[] {
  if (candidates.length === 0) return [];

  // Sort strictly by start ascending
  const sorted = [...candidates].sort((a, b) => a.start - b.start);

  const seenKeys = new Set<string>();
  const validCandidates: CandidatePoint[] = [];

  let bab1StartIndex = Infinity;
  let highestChapterRank = 0;

  for (const cand of sorted) {
    // Check if this candidate is BAB 1 or higher
    if (cand.category === 'chapter' && cand.normalizedKey === 'bab_1') {
      if (cand.start < bab1StartIndex) {
        bab1StartIndex = cand.start;
      }
    }

    // Rule 1: Frontmatter items CANNOT appear after BAB 1 has started
    if (cand.category === 'frontmatter' && cand.start >= bab1StartIndex) {
      continue;
    }

    // Rule 2: Chapter and Backmatter Keys MUST be unique (keep only the FIRST start page!)
    // If bab_4 was detected at page 40, any mention of bab_4 at page 56 or 65 is a running header or quote.
    if (seenKeys.has(cand.normalizedKey)) {
      continue;
    }

    // Rule 3: Enforce monotonic chapter progression
    // If we have already started BAB 4 (rank 500), we cannot accept BAB 2 (rank 300) or BAB 3 (rank 400) on later pages.
    if (cand.category === 'chapter' || cand.category === 'backmatter') {
      if (cand.rank < highestChapterRank) {
        continue;
      }
      highestChapterRank = Math.max(highestChapterRank, cand.rank);
    }

    seenKeys.add(cand.normalizedKey);
    validCandidates.push(cand);
  }

  return validCandidates;
}

/**
 * Helper to build ordered, contiguous start-end ranges without gaps
 */
function buildContiguousSections(
  candidates: CandidatePoint[],
  totalUnits: number,
  baseUnit: number // 1 for PDF (pages), 0 for DOCX (paragraphs)
): DocumentSection[] {
  // Sort candidates by start ascending
  const sorted = [...candidates].sort((a, b) => a.start - b.start);
  const result: DocumentSection[] = [];

  // If there are no candidates at all, create a single fallback section
  if (sorted.length === 0) {
    return [
      {
        id: 'sec_1',
        order: 1,
        title: 'Seluruh Dokumen',
        normalizedKey: 'full_document',
        start: baseUnit,
        end: totalUnits,
        count: totalUnits - baseUnit + 1,
        confidence: 50,
        needsReview: true,
        snippet: 'Tidak ditemukan penanda bab otomatis.',
      },
    ];
  }

  // If first detected candidate is not at the beginning (e.g. Abstrak on page 3),
  // insert Cover / Halaman Awal as the first section!
  if (sorted[0].start > baseUnit) {
    const coverEnd = sorted[0].start - 1;
    result.push({
      id: 'sec_cover',
      order: 1,
      title: 'Cover / Halaman Depan',
      normalizedKey: 'cover',
      start: baseUnit,
      end: coverEnd,
      count: coverEnd - baseUnit + 1,
      confidence: 99,
      needsReview: false,
      snippet: 'Bagian awal dokumen sebelum bab/bagian pertama.',
    });
  }

  // Add the detected candidates
  for (let i = 0; i < sorted.length; i++) {
    const cand = sorted[i];
    const isLast = i === sorted.length - 1;
    const nextStart = isLast ? totalUnits + 1 : sorted[i + 1].start;
    const end = isLast ? totalUnits : Math.max(cand.start, nextStart - 1);
    const count = Math.max(1, end - cand.start + 1);

    result.push({
      id: `sec_${i + 1}_${cand.normalizedKey}`,
      order: result.length + 1,
      title: cand.title,
      normalizedKey: cand.normalizedKey,
      start: cand.start,
      end: end,
      count: count,
      confidence: cand.confidence,
      needsReview: cand.needsReview,
      snippet: cand.snippet,
      notes: cand.notes?.join(' • '),
    });
  }

  // Re-number orders sequentially
  return result.map((s, idx) => ({
    ...s,
    order: idx + 1,
  }));
}
