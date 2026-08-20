import JSZip from 'jszip';
import { SplitResultItem } from '../../types';
import { buildZipFolderName } from '../detector/studentDetector';

export interface CreateZipOptions {
  studentName?: string;
  studentNim?: string;
  fallbackBaseName?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Creates a ZIP archive containing an inner folder named:
 * "skripsi [nama siswa] - [nim]" (if NIM exists)
 * "skripsi [nama siswa]" (if no NIM)
 * and all split PDF chapter files inside that folder.
 */
export async function createZipBundle(
  items: SplitResultItem[],
  options: CreateZipOptions = {}
): Promise<{ blob: Blob; url: string; filename: string; folderName: string }> {
  const { studentName, studentNim, fallbackBaseName = 'skripsi', onProgress } = options;

  const folderName = buildZipFolderName(studentName, studentNim, fallbackBaseName);
  const zip = new JSZip();

  // Create subfolder inside ZIP
  const folder = zip.folder(folderName) || zip;

  // Ensure files are strictly sorted in natural ascending order (01, 02, 03... 09, 10)
  const sortedItems = [...items].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Set a consistent base timestamp so archive viewers display files in logical order
  const fixedDate = new Date();

  // Add each split file into the subfolder
  sortedItems.forEach((item, idx) => {
    folder.file(item.filename, item.blob, {
      date: new Date(fixedDate.getTime() + idx * 1000),
      comment: item.rangeText,
    });
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  const url = URL.createObjectURL(blob);
  const zipFileName = `${folderName}.zip`;

  return {
    blob,
    url,
    filename: zipFileName,
    folderName,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
