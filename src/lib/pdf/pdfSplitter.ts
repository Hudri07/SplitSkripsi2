import { PDFDocument } from 'pdf-lib';
import { DocumentSection, SplitResultItem } from '../../types';

export interface SplitPdfOptions {
  fileNamePrefix?: string;
  padNumbers?: boolean;
}

/**
 * Split a PDF into separate PDF documents based on section page ranges
 */
export async function splitPdfDocument(
  sourceBuffer: ArrayBuffer,
  sections: DocumentSection[],
  baseFileName: string,
  onProgress?: (current: number, total: number, title: string) => void
): Promise<SplitResultItem[]> {
  if (!sourceBuffer || sourceBuffer.byteLength === 0) {
    throw new Error('Buffer dokumen PDF tidak valid atau kosong.');
  }

  // Clone buffer to guarantee that pdf-lib has an intact, non-detached ArrayBuffer
  const safeBuffer = sourceBuffer.slice(0);
  const sourcePdf = await PDFDocument.load(safeBuffer);
  const totalPagesInDoc = sourcePdf.getPageCount();
  const results: SplitResultItem[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    onProgress?.(i + 1, sections.length, section.title);

    // Create a new blank PDF document
    const newPdf = await PDFDocument.create();

    // Calculate 0-based page indices to copy
    // Ensure bounds are clamped within [1, totalPagesInDoc]
    const startPage = Math.max(1, Math.min(section.start, totalPagesInDoc));
    const endPage = Math.max(startPage, Math.min(section.end, totalPagesInDoc));

    const pageIndices: number[] = [];
    for (let p = startPage; p <= endPage; p++) {
      pageIndices.push(p - 1); // 0-based index
    }

    if (pageIndices.length > 0) {
      // Copy pages from source document
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
    }

    // Serialize PDF to Uint8Array
    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Generate clean safe filename
    const orderStr = String(section.order).padStart(2, '0');
    const safeTitle = sanitizeFileName(section.title);
    const filename = `${orderStr}_${safeTitle}.pdf`;

    results.push({
      id: section.id,
      title: section.title,
      filename: filename,
      blob: blob,
      url: url,
      size: blob.size,
      rangeText: `Halaman ${startPage} - ${endPage} (${section.count} hal)`,
    });
  }

  return results;
}

/**
 * Helper to generate filesystem-safe filenames
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}
