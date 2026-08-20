import React, { useState } from 'react';
import {
  Download,
  FileText,
  CheckCircle2,
  RefreshCw,
  Archive,
  ArrowDownToLine,
} from 'lucide-react';
import { SplitResultItem, DocumentMetadata } from '../types';
import JSZip from 'jszip';

interface DownloadPanelProps {
  results: SplitResultItem[];
  metadata: DocumentMetadata;
  onResetAll: () => void;
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({
  results,
  metadata,
  onResetAll,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const handleDownloadSingle = (item: SplitResultItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadedIds((prev) => new Set(prev).add(item.id));
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderName = metadata.fileName.replace(/\.[^/.]+$/, '') + '_Split_PDF';
      const folder = zip.folder(folderName) || zip;

      // Add each split PDF item blob to the zip
      for (const item of results) {
        folder.file(item.filename, item.blob);
      }

      // Generate the zip package
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark all as downloaded
      setDownloadedIds(new Set(results.map((r) => r.id)));
    } catch (err: any) {
      console.error('Failed to create ZIP package:', err);
      alert('Gagal membuat paket ZIP: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  };

  const allDownloaded = results.length > 0 && downloadedIds.size === results.length;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Success Top Hero Card (Airbnb Aesthetic) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pemisahan Selesai
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                {results.length} Berkas PDF Terpisah
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 mt-1">
              Dokumen Skripsi Berhasil Dipisahkan!
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Semua bab telah diekstrak menjadi berkas PDF mandiri berstandar akademik yang siap diunggah ke repositori kampus.
            </p>
          </div>
        </div>

        {/* Big ZIP Download Trigger (Airbnb Rausch Gradient Pill) */}
        <button
          type="button"
          id="btn-download-all-zip"
          onClick={handleDownloadAllZip}
          disabled={isZipping || results.length === 0}
          className="btn-rausch px-7 py-4 text-white font-bold text-sm sm:text-base rounded-full shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isZipping ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Mengompresi ZIP...</span>
            </>
          ) : (
            <>
              <Archive className="w-5 h-5" />
              <span>Download Semua (.ZIP)</span>
            </>
          )}
        </button>
      </div>

      {/* Split Result List (Airbnb Table Card Layout) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
              Daftar Berkas PDF Bab Terpisah
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Klik "Unduh PDF" untuk mengunduh bab tertentu secara satuan
            </p>
          </div>

          <button
            type="button"
            onClick={onResetAll}
            className="text-xs font-bold text-[#FF385C] hover:text-rose-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pisahkan Dokumen Lain</span>
          </button>
        </div>

        <div id="tour-download-list" className="divide-y divide-neutral-100">
          {results.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/80 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5 text-[#FF385C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 break-all">
                      {item.filename}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span>{item.rangeText}</span>
                    <span>•</span>
                    <span className="font-mono">{formatSize(item.size)}</span>
                  </div>
                </div>
              </div>

              {/* Individual Download Action */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(item)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                    downloadedIds.has(item.id)
                      ? 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                      : 'bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 text-[#FF385C]" />
                  <span>
                    {downloadedIds.has(item.id) ? 'Unduh Ulang' : 'Unduh PDF'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
