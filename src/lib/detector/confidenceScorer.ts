import { ACADEMIC_PATTERNS, SectionPattern } from './academicPatterns';

export interface DetectionCandidate {
  rawText: string;
  matchedPattern: SectionPattern;
  extractedTitle: string;
  locationIndex: number; // 1-based page for PDF, 0-based para for DOCX
  confidence: number;
  isTocReference: boolean;
  needsReview: boolean;
  notes: string[];
}

export interface EvaluationContext {
  // Common context
  isInsideTocPage?: boolean;
  tocPageNumbers?: Set<number>;
  pageIndex?: number;
  totalUnits: number;
  otherMatchesOnSameUnit: number;
  linePositionInUnit: number; // 0 = first line/top
  hasDotLeader?: boolean;
  hasTrailingPageNumber?: boolean;

  // DOCX specific
  isHeadingStyle?: boolean;
  headingLevel?: number;
  isBold?: boolean;
  isCentered?: boolean;
  fontSize?: number;
  hasPageBreak?: boolean;
  surroundingText?: string;
}

/**
 * Checks if a line is a Table of Contents entry (e.g. "BAB I PENDAHULUAN ...... 1")
 */
export function isLikelyTocLine(text: string): boolean {
  const trimmed = text.trim();

  // Pattern with dot leaders or page numbers at the end
  if (/(\.{3,}|\u2026|\u00b7{3,}|_{3,}|\-{3,})\s*\d+$/i.test(trimmed)) {
    return true;
  }

  // Pattern with trailing page number at end of line (e.g., "BAB I PENDAHULUAN   1" or "BAB I PENDAHULUAN (hal. 1)")
  if (/\b(?:hal\.?|hlm\.?|page|p\.)?\s*\d+\s*$/i.test(trimmed) && trimmed.length > 20) {
    return true;
  }

  // Contains dotted leader anywhere
  if (/\.{4,}/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Clean & normalize section title
 */
export function formatSectionTitle(rawHeading: string, defaultTitle: string, patternKey: string): string {
  let cleaned = rawHeading
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean trailing dots and page numbers
  cleaned = cleaned.replace(/(\.{2,}|\u2026).*$/g, '').trim();
  cleaned = cleaned.replace(/\s+\d+\s*$/g, '').trim();

  if (cleaned.length < 2) {
    return defaultTitle;
  }

  // Standardized frontmatter names
  if (patternKey === 'cover') {
    return 'Cover Skripsi';
  }
  if (patternKey === 'title_page') {
    return 'Halaman Judul';
  }
  if (patternKey === 'publication_approval') {
    return 'Halaman Persetujuan Publikasi';
  }
  if (patternKey === 'approval_advisor') {
    if (/halaman/i.test(cleaned)) return 'Halaman Persetujuan';
    return 'Lembar Persetujuan';
  }
  if (patternKey === 'approval_examiner' || patternKey === 'approval') {
    if (/publikasi/i.test(cleaned)) return 'Halaman Persetujuan Publikasi';
    if (/persetujuan/i.test(cleaned) && !/pengesahan/i.test(cleaned)) {
      return /halaman/i.test(cleaned) ? 'Halaman Persetujuan' : 'Lembar Persetujuan';
    }
    if (/halaman/i.test(cleaned)) return 'Halaman Pengesahan';
    return 'Lembar Pengesahan';
  }
  if (patternKey === 'declaration') {
    return 'Pernyataan Keaslian';
  }
  if (patternKey === 'motto') {
    return 'Halaman Motto';
  }
  if (patternKey === 'dedication') {
    return 'Halaman Persembahan';
  }
  if (patternKey === 'dedication_motto') {
    if (/motto/i.test(cleaned) && !/persembahan/i.test(cleaned)) return 'Halaman Motto';
    if (/persembahan|kupersembahkan/i.test(cleaned) && !/motto/i.test(cleaned)) return 'Halaman Persembahan';
    return 'Halaman Motto & Persembahan';
  }
  if (patternKey === 'abstract_id') {
    return 'Abstrak';
  }
  if (patternKey === 'abstract_en') {
    return 'Abstract';
  }
  if (patternKey === 'preface') {
    return 'Kata Pengantar';
  }
  if (patternKey === 'toc') {
    return 'Daftar Isi';
  }
  if (patternKey === 'table_list') {
    return 'Daftar Tabel';
  }
  if (patternKey === 'figure_list') {
    return 'Daftar Gambar';
  }
  if (patternKey === 'appendix_list') {
    return 'Daftar Lampiran';
  }
  if (patternKey === 'bibliography') {
    return 'Daftar Pustaka';
  }
  if (patternKey === 'appendix') {
    if (/lampiran\s+[a-z0-9]+/i.test(cleaned)) {
      return cleaned.toUpperCase();
    }
    return 'Lampiran';
  }
  if (patternKey === 'curriculum_vitae') {
    return 'Riwayat Hidup';
  }

  // If pattern is a chapter like bab_1, format neatly e.g. "BAB I - PENDAHULUAN"
  if (patternKey.startsWith('bab_')) {
    const babMatch = cleaned.match(/^(?:bab|chapter)\s+([ivxlcdm0-9]+)[\s:.\-]*(.*)$/i);
    if (babMatch) {
      const num = babMatch[1].toUpperCase();
      let sub = babMatch[2]?.trim();
      if (!sub) {
        // Find default subtitle if any
        const defMatch = defaultTitle.match(/^(?:bab|chapter)\s+[ivxlcdm0-9]+\s+(.*)$/i);
        sub = defMatch ? defMatch[1] : '';
      }
      return sub ? `BAB ${num} - ${sub.toUpperCase()}` : `BAB ${num}`;
    }
  }

  return cleaned.toUpperCase();
}

/**
 * Calculate the confidence score for a candidate section match
 */
export function calculateConfidence(
  pattern: SectionPattern,
  rawText: string,
  ctx: EvaluationContext
): { confidence: number; isToc: boolean; needsReview: boolean; notes: string[] } {
  let confidence = 75;
  const notes: string[] = [];
  let isToc = false;

  const trimmed = rawText.trim();
  const isTocLine = isLikelyTocLine(trimmed) || ctx.hasDotLeader || ctx.hasTrailingPageNumber;

  // 1. Critical ToC Reference check
  if (isTocLine) {
    isToc = true;
    confidence = 10;
    notes.push('Terdeteksi sebagai referensi Daftar Isi (memiliki titik-titik/nomor halaman rujukan)');
    return { confidence, isToc, needsReview: true, notes };
  }

  // If inside a ToC page:
  // Allow the heading "DAFTAR ISI" itself if at top of the ToC page (line position <= 2)
  if (ctx.isInsideTocPage) {
    if (pattern.key === 'toc' && ctx.linePositionInUnit <= 2) {
      // This is the Table of Contents heading itself!
      confidence = 98;
      notes.push('Judul halaman Daftar Isi');
      return { confidence, isToc: false, needsReview: false, notes };
    }

    // Otherwise, other patterns (like BAB I ... in the middle of ToC page) are ToC entries
    isToc = true;
    confidence = 10;
    notes.push('Terdeteksi di dalam halaman Daftar Isi');
    return { confidence, isToc, needsReview: true, notes };
  }

  // If multiple chapter mentions appear in the exact same unit/page, this is definitely a ToC or summary list
  if (ctx.otherMatchesOnSameUnit >= 2 && pattern.category === 'chapter') {
    isToc = true;
    confidence = 10;
    notes.push('Ditemukan banyak penyebutan BAB pada halaman yang sama (halaman Daftar Isi)');
    return { confidence, isToc, needsReview: true, notes };
  }

  // 2. Exact match at top of page or prominent position
  if (ctx.linePositionInUnit <= 2) {
    confidence += 15;
    notes.push('Posisi berada di baris awal halaman');
  } else if (ctx.linePositionInUnit <= 5) {
    confidence += 5;
  }

  // 3. Document Styling cues (DOCX)
  if (ctx.isHeadingStyle) {
    if (ctx.headingLevel === 1) {
      confidence += 20;
      notes.push('Menggunakan Style Heading 1');
    } else {
      confidence += 10;
      notes.push(`Menggunakan Style Heading ${ctx.headingLevel}`);
    }
  }

  if (ctx.isBold) {
    confidence += 8;
    notes.push('Format teks tebal (Bold)');
  }

  if (ctx.isCentered) {
    confidence += 5;
    notes.push('Perataan teks tengah (Center)');
  }

  if (ctx.hasPageBreak) {
    confidence += 12;
    notes.push('Didahului pemisah halaman (Page Break)');
  }

  // 4. Standalone text length check
  if (trimmed.length > 120) {
    // Too long for a standalone heading, likely a paragraph body mentioning the keyword
    confidence -= 35;
    notes.push('Teks terlalu panjang untuk judul bab independen');
  } else if (trimmed.length < 50) {
    confidence += 5;
  }

  // 5. Check all-caps standard academic formatting
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 4) {
    confidence += 5;
    notes.push('Huruf kapital (ALL CAPS standar judul akademik)');
  }

  // Cap confidence
  confidence = Math.max(5, Math.min(99, confidence));
  const needsReview = confidence < 70;

  if (needsReview) {
    notes.push('Perlu diperiksa');
  }

  return { confidence, isToc, needsReview, notes };
}
