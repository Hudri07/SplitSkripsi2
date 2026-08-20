import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedPage, DocumentMetadata } from '../../types';
import { detectPdfStructure } from '../detector/structureDetector';
import { detectStudentInfo } from '../detector/studentDetector';

// Setup pdfjs worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface PdfParseResult {
  pages: ExtractedPage[];
  metadata: DocumentMetadata;
  sections: ReturnType<typeof detectPdfStructure>['sections'];
  detectedTocPages: number[];
  pdfDocProxy: pdfjsLib.PDFDocumentProxy;
}

export async function parsePdfDocument(
  fileBuffer: ArrayBuffer,
  fileName: string,
  onProgress?: (percent: number, message: string) => void
): Promise<PdfParseResult> {
  onProgress?.(10, 'Membuka dokumen PDF...');

  // Crucial: Clone buffer so PDF.js worker doesn't detach the caller's ArrayBuffer
  const bufferCopy = fileBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  onProgress?.(25, `Membaca ${numPages} halaman PDF...`);

  const pages: ExtractedPage[] = [];
  let totalChars = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by vertical position (Y coordinate) to form clean lines
    const lineMap = new Map<number, string[]>();

    textContent.items.forEach((item: any) => {
      if ('str' in item && item.str.trim()) {
        // Round Y coordinate to group characters on same baseline
        const y = Math.round(item.transform[5] / 4) * 4;
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item.str);
      }
    });

    // Sort lines descending by Y (top of page down to bottom)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines = sortedY.map((y) => lineMap.get(y)!.join(' ').trim()).filter(Boolean);
    const fullPageText = lines.join('\n');

    totalChars += fullPageText.length;

    pages.push({
      pageNumber: i,
      text: fullPageText,
      lines: lines,
      hasImages: false,
      charCount: fullPageText.length,
    });

    if (i % 3 === 0 || i === numPages) {
      const pct = 25 + Math.round((i / numPages) * 50);
      onProgress?.(pct, `Menganalisis halaman ${i} dari ${numPages}...`);
    }
  }

  onProgress?.(80, 'Mendeteksi struktur BAB, lembar depan, dan daftar pustaka...');

  // Identify scanned PDF without extractable text layer
  const avgCharsPerPage = numPages > 0 ? totalChars / numPages : 0;
  const isScanned = totalChars < 50 || avgCharsPerPage < 15;

  const detectionResult = detectPdfStructure(pages);
  const studentInfo = detectStudentInfo(pages);

  onProgress?.(95, 'Menyusun pembagian struktur berkas...');

  const metadata: DocumentMetadata = {
    fileName: fileName,
    fileSize: fileBuffer.byteLength,
    fileType: 'pdf',
    totalUnits: numPages,
    unitName: 'Halaman',
    isScannedPdf: isScanned,
    hasHeadings: !isScanned,
    estimatedDocType: estimatePdfDocType(pages),
    studentName: studentInfo.name,
    studentNim: studentInfo.nim,
  };

  return {
    pages,
    metadata,
    sections: detectionResult.sections,
    detectedTocPages: detectionResult.detectedTocPages,
    pdfDocProxy: pdfDoc,
  };
}

function estimatePdfDocType(pages: ExtractedPage[]): string {
  const sample = pages.slice(0, 5).map((p) => p.text).join(' ').toLowerCase();
  if (sample.includes('disertasi')) return 'Disertasi';
  if (sample.includes('tesis')) return 'Tesis';
  if (sample.includes('laporan magang') || sample.includes('praktik kerja')) return 'Laporan Magang / PKL';
  if (sample.includes('tugas akhir')) return 'Laporan Tugas Akhir';
  if (sample.includes('skripsi')) return 'Skripsi';
  if (sample.includes('laporan penelitian')) return 'Laporan Penelitian';
  return 'Dokumen Akademik';
}
