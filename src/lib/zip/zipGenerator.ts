import JSZip from 'jszip';
import { SplitResultItem } from '../../types';

export async function createZipBundle(
  items: SplitResultItem[],
  zipFileName: string = 'skripsi_split.zip',
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; url: string; filename: string }> {
  const zip = new JSZip();

  // Add each split file into root of zip
  items.forEach((item) => {
    zip.file(item.filename, item.blob);
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
  return {
    blob,
    url,
    filename: zipFileName,
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
