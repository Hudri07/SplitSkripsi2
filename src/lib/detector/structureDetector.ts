import { DocumentSection, ExtractedPage, ExtractedParagraph } from '../../types';
import { ACADEMIC_PATTERNS } from './academicPatterns';
import { calculateConfidence, formatSectionTitle, isLikelyTocLine, EvaluationContext } from './confidenceScorer';

interface CandidatePoint {
  title: string;
  normalizedKey: string;
  start: number; // 1-based page or 0-based para
  confidence: number;
  snippet?: string;
  notes?: string[];
  needsReview?: boolean;
}

/**
 * Detect sections from extracted PDF pages
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
  const candidates: CandidatePoint[] = [];

  // Step 2: Scan pages for section headers
  pages.forEach((page) => {
    const isTocPage = tocPageSet.has(page.pageNumber);

    // Count how many chapter patterns exist on this page
    let chapterMatchesOnPage = 0;
    page.lines.forEach((line) => {
      if (/^bab\s+(?:i|ii|iii|iv|v|vi|vii|[0-9]+)/i.test(line.trim())) {
        chapterMatchesOnPage++;
      }
    });

    // Check lines (especially top lines)
    for (let lineIdx = 0; lineIdx < Math.min(page.lines.length, 8); lineIdx++) {
      const line = page.lines[lineIdx].trim();
      if (!line) continue;

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
            // If next line is uppercase subtitle without page break / dot leaders
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
          if (!result.isToc && result.confidence >= 45) {
            const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);

            // Avoid duplicate pattern candidate on the exact same page
            const existingOnSamePage = candidates.find((c) => c.start === page.pageNumber);
            if (!existingOnSamePage || result.confidence > existingOnSamePage.confidence) {
              if (existingOnSamePage) {
                const idx = candidates.indexOf(existingOnSamePage);
                candidates.splice(idx, 1);
              }

              candidates.push({
                title: formattedTitle,
                normalizedKey: pattern.key,
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

  // Step 3: Build non-overlapping contiguous sections
  const sections = buildContiguousSections(candidates, totalPages, 1);
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
  const candidates: CandidatePoint[] = [];

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

        if (!result.isToc && result.confidence >= 45) {
          const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);

          // Avoid duplicate nearby candidates (within 2 paragraphs)
          const isDuplicate = candidates.some((c) => Math.abs(c.start - p.index) <= 2 && c.normalizedKey === pattern.key);

          if (!isDuplicate) {
            candidates.push({
              title: formattedTitle,
              normalizedKey: pattern.key,
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

  // Step 3: Build sections
  const sections = buildContiguousSections(candidates, totalParagraphs - 1, 0);
  return { sections, detectedTocIndexes };
}

/**
 * Helper to build ordered, contiguous start-end ranges
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

  // Re-number orders
  return result.map((s, idx) => ({
    ...s,
    order: idx + 1,
  }));
}
