import { DocumentSection, ExtractedPage, ExtractedParagraph } from '../../types';
import { ACADEMIC_PATTERNS } from './academicPatterns';
import { calculateConfidence, formatSectionTitle, isLikelyTocLine, EvaluationContext } from './confidenceScorer';

interface CandidatePoint {
  title: string;
  normalizedKey: string;
  category: 'frontmatter' | 'chapter' | 'backmatter' | 'other';
  chapterNumber?: number | null;
  start: number; // 1-based page for PDF, 0-based para for DOCX
  end?: number;
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
 * Helper to check if a line is a clean standalone heading
 */
function isStandaloneHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 70) return false;
  // If line starts with list numbers (e.g. 1. Bapak, 2. Ibu, a., -, •) it's body text/list, not a heading
  if (/^(?:\d+[\.\)]|[a-zA-Z][\.\)]|[-•*]|\(\d+\))\s+/i.test(trimmed)) return false;
  // If line ends with comma or semicolon, it's mid-sentence
  if (/[,;]$/.test(trimmed)) return false;
  return true;
}

/**
 * Analyze an unlabelled frontmatter page by its text content to classify it accurately
 */
function classifyFrontmatterPage(page: ExtractedPage): { key: string; title: string; confidence: number } | null {
  const text = page.text.toLowerCase();
  
  // Find the top clean heading line (usually line 0 or 1)
  const topNonEmptyLines = page.lines.map(l => l.trim()).filter(l => l.length > 0).slice(0, 3);
  const headerCandidate = topNonEmptyLines.find(isStandaloneHeadingLine) || '';
  const headerLower = headerCandidate.toLowerCase();

  // 1. Check Publication Approval first (standalone heading or explicit header text)
  if (
    /^(?:halaman\s+|lembar\s+|surat\s+)?(?:pernyataan\s+)?persetujuan\s+publikasi/i.test(headerLower) ||
    /persetujuan\s+publikasi\s+(?:karya\s+ilmiah|skripsi|tugas\s+akhir)/i.test(headerLower)
  ) {
    return {
      key: 'publication_approval',
      title: 'Halaman Persetujuan Publikasi',
      confidence: 95,
    };
  }

  // 2. Motto & Dedication standalone header checks
  if (/^(?:halaman\s+|lembar\s+)?(?:motto\s+dan\s+persembahan|persembahan\s+dan\s+motto)$/i.test(headerLower)) {
    return {
      key: 'dedication_motto',
      title: 'Halaman Motto & Persembahan',
      confidence: 95,
    };
  }

  if (/^(?:halaman\s+|lembar\s+)?(?:motto|semboyan)$/i.test(headerLower)) {
    return {
      key: 'motto',
      title: 'Halaman Motto',
      confidence: 95,
    };
  }

  if (/^(?:halaman\s+|lembar\s+)?(?:persembahan|dedikasi|dedication)$/i.test(headerLower)) {
    return {
      key: 'dedication',
      title: 'Halaman Persembahan',
      confidence: 95,
    };
  }

  // 3. Lembar Persetujuan (Pembimbing / Proposal) vs Lembar Pengesahan (Tim Penguji / Dekan)
  if (
    /^(?:lembar(?:an)?\s+|halaman\s+|tanda\s+)?pengesahan(?:\s+skripsi|\s+tugas\s+akhir|\s+tesis|\s+penguji|\s+tim\s+penguji|\s+dewan\s+penguji|\s+laporan)?$/i.test(headerLower) ||
    /^(?:lembar\s+|halaman\s+)?pengesahan\s+(?:tim\s+penguji|dewan\s+penguji|panitia\s+ujian|dekan)$/i.test(headerLower) ||
    /^approval\s+sheet$/i.test(headerLower)
  ) {
    return {
      key: 'approval_examiner',
      title: /halaman/i.test(headerLower) ? 'Halaman Pengesahan' : 'Lembar Pengesahan',
      confidence: 95,
    };
  }

  if (
    /^(?:lembar(?:an)?\s+|halaman\s+|surat\s+|tanda\s+)?persetujuan(?:\s+skripsi|\s+tugas\s+akhir|\s+tesis|\s+pembimbing|\s+komisi\s+pembimbing|\s+dosen\s+pembimbing|\s+seminar|\s+ujian|\s+naskah)?$/i.test(headerLower) ||
    /^(?:lembar\s+|halaman\s+)?persetujuan\s+(?:pembimbing|dosen\s+pembimbing|komisi\s+pembimbing)$/i.test(headerLower) ||
    /^persetujuan\s+pembimbing$/i.test(headerLower)
  ) {
    return {
      key: 'approval_advisor',
      title: /halaman/i.test(headerLower) ? 'Halaman Persetujuan' : 'Lembar Persetujuan',
      confidence: 95,
    };
  }

  // 4. Pernyataan Keaslian
  if (/^(?:pernyataan\s+|surat\s+pernyataan\s+)?(?:keaslian|orisinalitas|bebas\s+plagiat|bebas\s+plagiarisme)(?:\s+skripsi|\s+karya\s+ilmiah)?$/i.test(headerLower) ||
      /^statement\s+of\s+originality$/i.test(headerLower)) {
    return {
      key: 'declaration',
      title: 'Pernyataan Keaslian',
      confidence: 95,
    };
  }

  // 5. Kata Pengantar
  if (/^(?:kata\s+pengantar|prakata|foreword|preface)$/i.test(headerLower)) {
    return {
      key: 'preface',
      title: 'Kata Pengantar',
      confidence: 95,
    };
  }

  // 6. Daftar Isi
  if (/^(?:daftar\s+isi|table\s+of\s+contents?)$/i.test(headerLower)) {
    return {
      key: 'toc',
      title: 'Daftar Isi',
      confidence: 95,
    };
  }

  // 7. Daftar Tabel
  if (/^(?:daftar\s+tabel|list\s+of\s+tables?)$/i.test(headerLower)) {
    return {
      key: 'table_list',
      title: 'Daftar Tabel',
      confidence: 95,
    };
  }

  // 8. Daftar Gambar
  if (/^(?:daftar\s+(?:gambar|grafik|bagan|diagram|peta)|list\s+of\s+figures?)$/i.test(headerLower)) {
    return {
      key: 'figure_list',
      title: 'Daftar Gambar',
      confidence: 95,
    };
  }

  // 9. Daftar Lampiran
  if (/^(?:daftar\s+lampiran|list\s+of\s+appendi(?:ces|x))$/i.test(headerLower)) {
    return {
      key: 'appendix_list',
      title: 'Daftar Lampiran',
      confidence: 95,
    };
  }

  // 10. Daftar Singkatan & Simbol
  if (/^(?:daftar\s+(?:singkatan|simbol|lambang|notasi|istilah))$/i.test(headerLower)) {
    return {
      key: 'abbreviation_list',
      title: 'Daftar Singkatan & Simbol',
      confidence: 95,
    };
  }

  // 11. Abstrak
  if (/^abstract$/i.test(headerLower)) {
    return {
      key: 'abstract_en',
      title: 'Abstract',
      confidence: 95,
    };
  }

  if (/^(?:abstrak|ringkasan)$/i.test(headerLower)) {
    return {
      key: 'abstract_id',
      title: 'Abstrak',
      confidence: 95,
    };
  }

  // Check if this page has multiple ToC lines (dotted leaders or structured index)
  let tocLinesCount = 0;
  for (const l of page.lines) {
    if (isLikelyTocLine(l)) tocLinesCount++;
  }
  if (tocLinesCount >= 3) {
    const top2 = topNonEmptyLines.join(' ').toLowerCase();
    if (top2.includes('tabel')) {
      return { key: 'table_list', title: 'Daftar Tabel', confidence: 90 };
    }
    if (top2.includes('gambar') || top2.includes('bagan') || top2.includes('grafik')) {
      return { key: 'figure_list', title: 'Daftar Gambar', confidence: 90 };
    }
    if (top2.includes('lampiran')) {
      return { key: 'appendix_list', title: 'Daftar Lampiran', confidence: 90 };
    }
    return {
      key: 'toc',
      title: 'Daftar Isi',
      confidence: 85,
    };
  }

  // Deep Motto text search (ONLY for short quotes/verses if page has minimal lines and not a long text)
  if (page.lines.length <= 15) {
    if (
      /\b(q\.s\.|surah|al-baqarah|al-insyirah|ar-rahman|al-imran|hadits|hadis|man\s+jadda\s+wajada)\b/i.test(text) ||
      ((/(\"|\“)[^\"]{15,}(\"|\”)/.test(page.text)) && (text.includes('sesungguhnya') || text.includes('kegagalan') || text.includes('kesuksesan') || text.includes('bermimpilah')))
    ) {
      return {
        key: 'motto',
        title: 'Halaman Motto',
        confidence: 90,
      };
    }
  }

  // Deep Persembahan search (ONLY for dedicated persembahan page with few lines)
  if (page.lines.length <= 15) {
    if (
      text.includes('kupersembahkan') ||
      (text.includes('persembahan') && (text.includes('ayah') || text.includes('ibu') || text.includes('orang tua') || text.includes('keluarga'))) ||
      (text.includes('teruntuk') && (text.includes('ayah') || text.includes('ibu') || text.includes('keluarga')))
    ) {
      return {
        key: 'dedication',
        title: 'Halaman Persembahan',
        confidence: 90,
      };
    }
  }

  // Page 2 title page check
  if (page.pageNumber === 2 && (text.includes('diajukan untuk') || (text.includes('program studi') && text.includes('fakultas') && text.includes('nim')))) {
    return {
      key: 'title_page',
      title: 'Halaman Judul',
      confidence: 85,
    };
  }

  return null;
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

  // Step 1: Identify all Table of Contents pages
  const detectedTocPages: number[] = [];
  pages.forEach((page) => {
    const firstFewLines = page.lines.slice(0, 5).join(' ');
    if (/daftar\s+isi|table\s+of\s+contents?/i.test(firstFewLines)) {
      detectedTocPages.push(page.pageNumber);
    }
  });

  const tocPageSet = new Set(detectedTocPages);

  // Step 2: Find all raw candidates across the entire document
  const rawCandidates: CandidatePoint[] = [];

  pages.forEach((page) => {
    const isTocPage = tocPageSet.has(page.pageNumber);

    // Count how many chapter patterns exist on this page (if >= 2, likely a ToC)
    let chapterMatchesOnPage = 0;
    page.lines.forEach((line) => {
      if (/^bab\s+(?:i|ii|iii|iv|v|vi|vii|[0-9]+)\b/i.test(line.trim())) {
        chapterMatchesOnPage++;
      }
    });

    // Check prominent top lines (indices 0 to 4)
    for (let lineIdx = 0; lineIdx < Math.min(page.lines.length, 5); lineIdx++) {
      const line = page.lines[lineIdx].trim();
      if (!line) continue;
      if (line.length > 110) continue;

      for (const pattern of ACADEMIC_PATTERNS) {
        // Enforce Cover only on page 1
        if (page.pageNumber > 1 && pattern.key === 'cover') {
          continue;
        }

        // Frontmatter headings must be clean standalone lines in the top 3 lines
        if (pattern.category === 'frontmatter' && (lineIdx > 2 || !isStandaloneHeadingLine(line))) {
          continue;
        }

        let isMatch = false;
        for (const regex of pattern.regexList) {
          if (regex.test(line)) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
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

          if (!result.isToc && result.confidence >= 50) {
            const formattedTitle = formatSectionTitle(fullHeading, pattern.defaultTitle, pattern.key);
            const chapNum = pattern.category === 'chapter' ? extractChapterNumber(pattern.key, line) : null;

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

  // Step 3: Find first chapter start page (BAB I / Chapter 1)
  rawCandidates.sort((a, b) => a.start - b.start);

  const firstChapterCandidate = rawCandidates.find((c) => c.category === 'chapter' && (c.chapterNumber === 1 || c.normalizedKey === 'bab_1'));
  const firstChapterPage = firstChapterCandidate ? firstChapterCandidate.start : (rawCandidates.find(c => c.category === 'chapter')?.start ?? totalPages + 1);

  // Step 4: Build Frontmatter Sections (Pages 1 to firstChapterPage - 1)
  const frontmatterSections: DocumentSection[] = [];

  // 1. Page 1 is ALWAYS Cover Skripsi (strictly page 1 - 1)
  frontmatterSections.push({
    id: 'sec_cover',
    order: 1,
    title: 'Cover Skripsi',
    normalizedKey: 'cover',
    start: 1,
    end: 1,
    count: 1,
    confidence: 99,
    needsReview: false,
    snippet: pages[0]?.lines.slice(0, 3).join(' ').substring(0, 120) || 'Halaman Depan / Cover Skripsi',
  });

  // 2. Scan each subsequent page in the frontmatter zone (from page 2 up to firstChapterPage - 1)
  for (let pNum = 2; pNum < firstChapterPage; pNum++) {
    const pageObj = pages[pNum - 1];
    if (!pageObj) continue;

    const prevSec = frontmatterSections[frontmatterSections.length - 1];

    // Check if this page has explicit candidate from rawCandidates
    const explicitCandidate = rawCandidates.find((c) => c.start === pNum && c.category === 'frontmatter');

    // Count ToC dotted lines on this page
    let tocLinesCount = 0;
    for (const l of pageObj.lines) {
      if (isLikelyTocLine(l)) tocLinesCount++;
    }

    const firstLineTrimmed = pageObj.lines[0]?.trim().toLowerCase() || '';
    const isContinuationHeader = /^\(?(?:lanjutan|sambungan|continued)\)?/i.test(firstLineTrimmed) ||
      /daftar\s+isi\s*\(?lanjutan\)?/i.test(firstLineTrimmed) ||
      /daftar\s+tabel\s*\(?lanjutan\)?/i.test(firstLineTrimmed) ||
      /daftar\s+gambar\s*\(?lanjutan\)?/i.test(firstLineTrimmed);

    // 1. Identify section heading on this page (explicit candidate from pattern match or semantic classification)
    let sectionTitle = '';
    let sectionKey = '';
    let confidence = 85;

    if (explicitCandidate) {
      sectionTitle = explicitCandidate.title;
      sectionKey = explicitCandidate.normalizedKey;
      confidence = explicitCandidate.confidence;
    } else {
      // Perform semantic classification on this frontmatter page
      const classification = classifyFrontmatterPage(pageObj);
      if (classification) {
        sectionTitle = classification.title;
        sectionKey = classification.key;
        confidence = classification.confidence;
      }
    }

    // 2. Check if this page matches a recognized frontmatter section
    if (sectionKey) {
      // If it's the SAME section key as previous section (e.g. Kata Pengantar page 2/3 or Daftar Isi page 2)
      if (prevSec && prevSec.normalizedKey === sectionKey && prevSec.normalizedKey !== 'cover' && prevSec.end === pNum - 1) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Academic sequence protection for Kata Pengantar (Preface):
      // Sections like Lembar Pengesahan, Persetujuan, Motto, Persembahan, Keaslian come BEFORE Kata Pengantar.
      // If Kata Pengantar is active, body mentions of these terms must NOT break Kata Pengantar into a new card.
      if (prevSec && prevSec.normalizedKey === 'preface' && prevSec.end === pNum - 1) {
        const validSuccessorsAfterPreface = new Set([
          'toc', 'table_list', 'figure_list', 'appendix_list', 'abbreviation_list'
        ]);

        if (!validSuccessorsAfterPreface.has(sectionKey)) {
          prevSec.end = pNum;
          prevSec.count = prevSec.end - prevSec.start + 1;
          continue;
        }
      }

      // If it's a genuine NEW distinct section (e.g. Daftar Isi, Daftar Tabel, Daftar Gambar, Lembar Pengesahan)
      frontmatterSections.push({
        id: `sec_fm_${pNum}_${sectionKey}`,
        order: frontmatterSections.length + 1,
        title: sectionTitle,
        normalizedKey: sectionKey,
        start: pNum,
        end: pNum,
        count: 1,
        confidence: confidence,
        needsReview: confidence < 75,
        snippet: pageObj.lines.slice(0, 3).join(' ').substring(0, 120),
      });
      continue;
    }

    // 3. If NO new section heading was detected on this page, check if it is a CONTINUATION of the previous section
    if (prevSec && prevSec.end === pNum - 1) {
      // Continuation of Daftar Isi
      if (prevSec.normalizedKey === 'toc' && (tocLinesCount >= 1 || isContinuationHeader)) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Continuation of Daftar Tabel
      if (prevSec.normalizedKey === 'table_list' && (isContinuationHeader || /tabel/i.test(pageObj.text) || tocLinesCount >= 1)) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Continuation of Daftar Gambar
      if (prevSec.normalizedKey === 'figure_list' && (isContinuationHeader || /gambar/i.test(pageObj.text) || tocLinesCount >= 1)) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Continuation of Daftar Lampiran
      if (prevSec.normalizedKey === 'appendix_list' && (isContinuationHeader || /lampiran/i.test(pageObj.text) || tocLinesCount >= 1)) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Continuation of multi-page Kata Pengantar (Preface)
      if (prevSec.normalizedKey === 'preface' && tocLinesCount === 0) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }

      // Continuation of multi-page Abstract
      if ((prevSec.normalizedKey === 'abstract_id' || prevSec.normalizedKey === 'abstract_en') && prevSec.count < 2 && pageObj.text.trim().length > 50 && tocLinesCount === 0) {
        prevSec.end = pNum;
        prevSec.count = prevSec.end - prevSec.start + 1;
        continue;
      }
    }

    // 4. Fallback: Smart structural inference based on page context (discrete 1-page section)
    let fallbackTitle = 'Halaman Pelengkap Depan';
    let fallbackKey = 'preliminary';

    if (pNum === 2) {
      fallbackTitle = 'Halaman Judul';
      fallbackKey = 'title_page';
    } else if (pageObj.text.toLowerCase().includes('motto') || pageObj.text.toLowerCase().includes('quote') || pageObj.text.toLowerCase().includes('semboyan')) {
      fallbackTitle = 'Halaman Motto';
      fallbackKey = 'motto';
    } else if (pageObj.text.toLowerCase().includes('persembahan') || pageObj.text.toLowerCase().includes('kupersembahkan')) {
      fallbackTitle = 'Halaman Persembahan';
      fallbackKey = 'dedication';
    } else if (pageObj.text.toLowerCase().includes('publikasi')) {
      fallbackTitle = 'Halaman Persetujuan Publikasi';
      fallbackKey = 'publication_approval';
    } else if (pageObj.text.toLowerCase().includes('pengesahan') || pageObj.text.toLowerCase().includes('tim penguji')) {
      fallbackTitle = 'Lembar Pengesahan';
      fallbackKey = 'approval_examiner';
    } else if (pageObj.text.toLowerCase().includes('persetujuan') || pageObj.text.toLowerCase().includes('pembimbing')) {
      fallbackTitle = 'Lembar Persetujuan';
      fallbackKey = 'approval_advisor';
    } else if (pageObj.text.toLowerCase().includes('keaslian') || pageObj.text.toLowerCase().includes('plagiat')) {
      fallbackTitle = 'Pernyataan Keaslian';
      fallbackKey = 'declaration';
    }

    frontmatterSections.push({
      id: `sec_fm_${pNum}_${fallbackKey}`,
      order: frontmatterSections.length + 1,
      title: fallbackTitle,
      normalizedKey: fallbackKey,
      start: pNum,
      end: pNum,
      count: 1,
      confidence: 70,
      needsReview: true,
      snippet: pageObj.lines.slice(0, 3).join(' ').substring(0, 120),
    });
  }

  // Step 5: Process Chapter and Backmatter Candidates
  const bodyCandidates: CandidatePoint[] = [];
  let currentChapterNumber = 0;
  let hasEncounteredFirstChapter = false;

  for (const cand of rawCandidates) {
    if (cand.start < firstChapterPage) {
      // Already processed in frontmatter
      continue;
    }

    if (cand.category === 'chapter') {
      const cNum = cand.chapterNumber ?? (currentChapterNumber + 1);
      if (hasEncounteredFirstChapter && cNum <= currentChapterNumber) {
        continue;
      }
      hasEncounteredFirstChapter = true;
      currentChapterNumber = cNum;
      bodyCandidates.push(cand);
      continue;
    }

    if (cand.category === 'backmatter') {
      bodyCandidates.push(cand);
    }
  }

  // Step 6: Build Contiguous Chapter and Backmatter Sections
  const bodySections: DocumentSection[] = [];

  for (let i = 0; i < bodyCandidates.length; i++) {
    const cand = bodyCandidates[i];
    const isLast = i === bodyCandidates.length - 1;
    const nextStart = isLast ? totalPages + 1 : bodyCandidates[i + 1].start;
    const end = isLast ? totalPages : Math.max(cand.start, nextStart - 1);
    const count = Math.max(1, end - cand.start + 1);

    bodySections.push({
      id: `sec_body_${cand.start}_${cand.normalizedKey}`,
      order: 0, // will be re-numbered
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

  // Combine Frontmatter + Body Sections and assign clean sequential orders (1, 2, 3...)
  const allSections: DocumentSection[] = [...frontmatterSections, ...bodySections].map((sec, idx) => ({
    ...sec,
    order: idx + 1,
  }));

  // Fallback if entire document is single unit
  if (allSections.length === 0) {
    allSections.push({
      id: 'sec_1',
      order: 1,
      title: 'Cover Skripsi',
      normalizedKey: 'cover',
      start: 1,
      end: totalPages,
      count: totalPages,
      confidence: 50,
      needsReview: true,
      snippet: 'Seluruh Dokumen',
    });
  }

  return { sections: allSections, detectedTocPages };
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

  // Step 3: Sort candidates
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
  const result: DocumentSection[] = [];
  const maxIdx = totalParagraphs - 1;

  if (filteredCandidates.length === 0 || filteredCandidates[0].start > 0) {
    const firstCandStart = filteredCandidates.length > 0 ? filteredCandidates[0].start : maxIdx + 1;
    result.push({
      id: 'sec_cover',
      order: 1,
      title: 'Cover Skripsi',
      normalizedKey: 'cover',
      start: 0,
      end: Math.max(0, firstCandStart - 1),
      count: Math.max(1, firstCandStart),
      confidence: 99,
      needsReview: false,
      snippet: 'Bagian Awal Dokumen / Cover Skripsi',
    });
  }

  for (let i = 0; i < filteredCandidates.length; i++) {
    const cand = filteredCandidates[i];
    const isLast = i === filteredCandidates.length - 1;
    const nextStart = isLast ? maxIdx + 1 : filteredCandidates[i + 1].start;
    const end = isLast ? maxIdx : Math.max(cand.start, nextStart - 1);
    const count = Math.max(1, end - cand.start + 1);

    result.push({
      id: `sec_docx_${i + 1}_${cand.normalizedKey}`,
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

  return { sections: result.map((s, idx) => ({ ...s, order: idx + 1 })), detectedTocIndexes };
}
