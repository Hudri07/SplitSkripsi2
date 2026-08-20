import { DocumentSection, ExtractedPage, ExtractedParagraph } from '../../types';
import { ACADEMIC_PATTERNS } from './academicPatterns';
import { calculateConfidence, formatSectionTitle, isLikelyTocLine, EvaluationContext } from './confidenceScorer';

interface CandidatePoint {
  title: string;
  normalizedKey: string;
  category: 'frontmatter' | 'chapter' | 'backmatter' | 'other';
  chapterNumber?: number | null;
  start: number; // 1-based page or 0-based para
  confidence: number;
  snippet?: string;
  notes?: string[];
  needsReview?: boolean;
}

/**
 * Extract Roman/Arabic chapter number (e.g. "BAB IV" -> 4, "CHAPTER 5" -> 5)
 */
export function extractChapterNumber(key: string, titleOrLine: string): number | null {
  if (key.startsWith('bab_')) {
    const num = parseInt(key.replace('bab_', ''), 10);
    if (!isNaN(num)) return num;
  }

  const match = titleOrLine.match(/^(?:bab|chapter)\s+([ivxlcdm0-9]+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/i);
  if (!match) return null;

  const raw = match[1].toLowerCase();
  const romanMap: Record<string, number> = {
    i: 1, '1': 1, satu: 1,
    ii: 2, '2': 2, dua: 2,
    iii: 3, '3': 3, tiga: 3,
    iv: 4, '4': 4, empat: 4,
    v: 5, '5': 5, lima: 5,
    vi: 6, '6': 6, enam: 6,
    vii: 7, '7': 7, tujuh: 7,
    viii: 8, '8': 8, delapan: 8,
    ix: 9, '9': 9, sembilan: 9,
    x: 10, '10': 10, sepuluh: 10,
  };

  if (romanMap[raw] !== undefined) return romanMap[raw];
  const num = parseInt(raw, 10);
  return isNaN(num) ? null : num;
}

/**
 * Detect sections from extracted PDF pages with strict Academic Pipeline & Contiguous Chapter Spanning
 */
export function detectPdfStructure(pages: ExtractedPage[]): {
  sections: DocumentSection[];
  detectedTocPages: number[];
} {
  const totalPages = pages.length;
  if (totalPages === 0) return { sections: [], detectedTocPages: [] };

  // Step 1: Identify all Table of Contents pages first
  const detectedTocPages: number[] = [];
  pages.forEach((page) => {
    const firstFewLines = page.lines.slice(0, 5).join(' ');
    if (/daftar\s+isi|table\s+of\s+contents?/i.test(firstFewLines)) {
      detectedTocPages.push(page.pageNumber);
    }
  });

  const tocPageSet = new Set(detectedTocPages);
  const rawCandidates: CandidatePoint[] = [];

  // Step 2: Scan pages for academic section headers
  pages.forEach((page) => {
    const isTocPage = tocPageSet.has(page.pageNumber);

    // Count how many chapter patterns exist on this page (if >= 2, likely a ToC or summary)
    let chapterMatchesOnPage = 0;
    page.lines.forEach((line) => {
      if (/^bab\s+(?:i|ii|iii|iv|v|vi|vii|[0-9]+)\b/i.test(line.trim())) {
        chapterMatchesOnPage++;
      }
    });

    // Check prominent top lines (indices 0 to 5)
    for (let lineIdx = 0; lineIdx < Math.min(page.lines.length, 6); lineIdx++) {
      const line = page.lines[lineIdx].trim();
      if (!line) continue;

      // Reject if line looks like body text paragraph
      if (line.length > 110) continue;

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
          // If this is a BAB, check if the next line is the subtitle (e.g. BAB I \n PENDAHULUAN)
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

          // Only accept if not a ToC line and confidence is high enough
          if (!result.isToc && result.confidence >= 50) {
            const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);
            const chapNum = pattern.category === 'chapter' ? extractChapterNumber(pattern.key, line) : null;

            // Avoid duplicate pattern candidate on the exact same page
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
                chapterNumber: chapNum,
                start: page.pageNumber,
                confidence: result.confidence,
                snippet: page.lines.slice(0, 3).join(' ').substring(0, 120),
                notes: result.notes,
                needsReview: result.needsReview,
              });
            }
            break; // Matched pattern for this line
          }
        }
      }
    }
  });

  // Step 3: Apply Academic State Machine & Contiguous Chapter Pipeline
  // Sort raw candidates by page order
  rawCandidates.sort((a, b) => a.start - b.start);

  const filteredCandidates: CandidatePoint[] = [];
  let currentChapterNumber = 0;
  let hasEncounteredFirstChapter = false;

  for (const cand of rawCandidates) {
    // 1. FRONTMATTER CANDIDATES:
    // Once BAB I has started, reject any frontmatter patterns (e.g. Cover, Kata Pengantar, Daftar Tabel inside Bab IV)
    if (cand.category === 'frontmatter') {
      if (hasEncounteredFirstChapter) {
        // Discard frontmatter noise inside main thesis chapters
        continue;
      }
      filteredCandidates.push(cand);
      continue;
    }

    // 2. CHAPTER CANDIDATES:
    if (cand.category === 'chapter') {
      const cNum = cand.chapterNumber ?? (currentChapterNumber + 1);

      // If chapter number is less than or equal to current active chapter (e.g. running header repeating "BAB IV"),
      // do NOT create duplicate / fragmented cards!
      if (hasEncounteredFirstChapter && cNum <= currentChapterNumber) {
        continue;
      }

      // Valid new chapter progression (e.g. BAB 1 -> BAB 2 -> BAB 3 -> BAB 4 -> BAB 5)
      hasEncounteredFirstChapter = true;
      currentChapterNumber = cNum;
      filteredCandidates.push(cand);
      continue;
    }

    // 3. BACKMATTER CANDIDATES (Daftar Pustaka, Lampiran, Riwayat Hidup):
    if (cand.category === 'backmatter') {
      // Backmatter is accepted once chapters are done or after page 10
      filteredCandidates.push(cand);
    }
  }

  // Step 4: Build non-overlapping contiguous sections (e.g., BAB IV 40-77, BAB V 78-85)
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
    if (!text || text.length < 2 || text.length > 120) return;

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

        // Check if next paragraph is subtitle
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
          const chapNum = pattern.category === 'chapter' ? extractChapterNumber(pattern.key, text) : null;

          // Avoid duplicate nearby candidates (within 2 paragraphs)
          const isDuplicate = rawCandidates.some((c) => Math.abs(c.start - p.index) <= 2 && c.normalizedKey === pattern.key);

          if (!isDuplicate) {
            rawCandidates.push({
              title: formattedTitle,
              normalizedKey: pattern.key,
              category: pattern.category,
              chapterNumber: chapNum,
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

  // Step 3: Filter candidates
  rawCandidates.sort((a, b) => a.start - b.start);
  const filteredCandidates: CandidatePoint[] = [];
  let currentChapterNumber = 0;
  let hasEncounteredFirstChapter = false;

  for (const cand of rawCandidates) {
    if (cand.category === 'frontmatter') {
      if (hasEncounteredFirstChapter) continue;
      filteredCandidates.push(cand);
      continue;
    }
    if (cand.category === 'chapter') {
      const cNum = cand.chapterNumber ?? (currentChapterNumber + 1);
      if (hasEncounteredFirstChapter && cNum <= currentChapterNumber) continue;
      hasEncounteredFirstChapter = true;
      currentChapterNumber = cNum;
      filteredCandidates.push(cand);
      continue;
    }
    if (cand.category === 'backmatter') {
      filteredCandidates.push(cand);
    }
  }

  // Step 4: Build sections
  const sections = buildContiguousSections(filteredCandidates, totalParagraphs - 1, 0);
  return { sections, detectedTocIndexes };
}

/**
 * Helper to build ordered, contiguous start-end ranges (e.g. BAB 4 spans until BAB 5 starts - 1)
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

  // If first detected candidate is not at the beginning (e.g. Abstrak on page 3 or BAB I on page 12),
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

  // Add detected candidates with contiguous range spanning
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
