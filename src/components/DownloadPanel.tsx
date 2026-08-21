import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  Archive,
  ArrowDownToLine,
  FolderArchive,
  Folder,
  User,
  Hash,
  Sparkles,
  Info,
  Check,
  HardDrive,
  ExternalLink,
  AlertCircle,
  FolderUp,
  ArrowUpRight,
  Cloud,
} from 'lucide-react';
import { SplitResultItem, DocumentMetadata } from '../types';
import { buildZipFolderName } from '../lib/detector/studentDetector';
import {
  uploadAllSplitResultsToDrive,
  uploadPdfToDrive,
  requestGoogleDriveAccessToken,
  createDriveFolder,
  DriveUploadProgress,
  DriveFolderResult,
} from '../lib/drive/googleDriveService';
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

  // Google Drive state
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveProgress, setDriveProgress] = useState<DriveUploadProgress | null>(null);
  const [driveResult, setDriveResult] = useState<DriveFolderResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [savedToDriveFileIds, setSavedToDriveFileIds] = useState<Set<string>>(new Set());
  const [uploadingSingleId, setUploadingSingleId] = useState<string | null>(null);

  // Student name & NIM state (customizable before zip generation or drive save)
  const [studentName, setStudentName] = useState<string>(metadata.studentName || '');
  const [studentNim, setStudentNim] = useState<string>(metadata.studentNim || '');

  // Computed folder name based on rule:
  // "skripsi [nama siswa] - [nim]" (if NIM exists)
  // "skripsi [nama siswa]" (if no NIM)
  const activeFolderName = buildZipFolderName(studentName, studentNim, metadata.fileName);
  const activeZipFileName = `${activeFolderName}.zip`;

  // Sorted results ensuring 01 is always first and 09 is last
  const sortedResults = [...results].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' })
  );

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
      
      // Create root folder inside ZIP with rule:
      // "skripsi [nama siswa] - [nim]" or "skripsi [nama siswa]"
      const folder = zip.folder(activeFolderName) || zip;

      // Base date for consistent archive index
      const baseDate = new Date();

      // Add each split PDF item blob in strict ascending order (01, 02, 03... 09)
      sortedResults.forEach((item, idx) => {
        folder.file(item.filename, item.blob, {
          date: new Date(baseDate.getTime() + idx * 1000),
          comment: item.rangeText,
        });
      });

      // Generate the zip package
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeZipFileName;
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

  // Upload all split results directly to a dedicated Google Drive folder
  const handleSaveAllToGoogleDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveError(null);
    setDriveResult(null);

    try {
      const uploadItems = sortedResults.map((r) => ({
        id: r.id,
        filename: r.filename,
        blob: r.blob,
      }));

      const res = await uploadAllSplitResultsToDrive(uploadItems, activeFolderName, (prog) => {
        setDriveProgress(prog);
      });

      setDriveResult(res);
      setSavedToDriveFileIds(new Set(sortedResults.map((r) => r.id)));
    } catch (err: any) {
      console.error('Google Drive save error:', err);
      setDriveError(err?.message || 'Terjadi kesalahan saat mengunggah ke Google Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Upload single PDF to Google Drive
  const handleSaveSingleToDrive = async (item: SplitResultItem) => {
    setUploadingSingleId(item.id);
    try {
      const token = await requestGoogleDriveAccessToken();
      
      // If we already created a folder in this session, upload to it; otherwise create/get folder
      let targetFolderId = driveResult?.folderId;
      if (!targetFolderId) {
        const folder = await createDriveFolder(activeFolderName, token);
        targetFolderId = folder.id;
        setDriveResult({
          folderId: folder.id,
          folderName: activeFolderName,
          folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
          uploadedFiles: [],
        });
      }

      await uploadPdfToDrive(item.blob, item.filename, targetFolderId, token);
      setSavedToDriveFileIds((prev) => new Set(prev).add(item.id));
    } catch (err: any) {
      console.error('Single file upload error:', err);
      alert('Gagal mengunggah ke Google Drive: ' + err.message);
    } finally {
      setUploadingSingleId(null);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  };

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
              Semua bab telah diekstrak menjadi berkas PDF mandiri berstandar akademik. Simpan ke Google Drive atau unduh arsip ZIP.
            </p>
          </div>
        </div>

        {/* Dual Primary Actions: ZIP & Google Drive (Airbnb Rausch & Clean Drive Pill) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Save to Google Drive Button */}
          <button
            type="button"
            id="btn-save-to-google-drive"
            onClick={handleSaveAllToGoogleDrive}
            disabled={isUploadingToDrive || results.length === 0}
            className="px-5 py-3.5 bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 font-bold text-sm rounded-full shadow-sm flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer transition-all hover:border-neutral-400 active:scale-[0.98]"
          >
            {isUploadingToDrive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Menyimpan ke Drive...</span>
              </>
            ) : driveResult ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tersimpan di Drive</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" fill="none">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A8.9 8.9 0 0 0 0 53h27.5z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335"/>
                  <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
                  <path d="M59.8 53H87.3c0-1.55-.4-3.1-1.2-4.5l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25z" fill="#ffba00"/>
                  <path d="M27.5 53h32.3L46.05 29.2 32.3 53z" fill="#2684fc"/>
                </svg>
                <span>Simpan ke Google Drive</span>
              </>
            )}
          </button>

          {/* Download ZIP Button */}
          <button
            type="button"
            id="btn-download-all-zip"
            onClick={handleDownloadAllZip}
            disabled={isZipping || results.length === 0}
            className="btn-rausch px-6 py-3.5 text-white font-bold text-sm rounded-full shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isZipping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mengompresi...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Download (.ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Google Drive Status & Upload Progress Banner (if active/completed) */}
      {(isUploadingToDrive || driveResult || driveError) && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A8.9 8.9 0 0 0 0 53h27.5z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335"/>
                  <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
                  <path d="M59.8 53H87.3c0-1.55-.4-3.1-1.2-4.5l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25z" fill="#ffba00"/>
                  <path d="M27.5 53h32.3L46.05 29.2 32.3 53z" fill="#2684fc"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span>Google Drive Cloud Storage</span>
                  {driveResult && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Berhasil Tersimpan
                    </span>
                  )}
                  {isUploadingToDrive && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                      Sedang Menyimpan...
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {driveResult
                    ? `Folder "${driveResult.folderName}" berhasil dibuat dan diisi dengan seluruh berkas PDF bab.`
                    : isUploadingToDrive
                    ? driveProgress?.status === 'connecting'
                      ? 'Menghubungkan akun Google Anda...'
                      : driveProgress?.status === 'creating_folder'
                      ? `Membuat folder "${activeFolderName}" di Google Drive...`
                      : `Mengunggah berkas ${driveProgress?.current || 0} dari ${driveProgress?.total || results.length}: ${driveProgress?.currentFileName}`
                    : 'Penyimpanan langsung ke Google Drive'}
                </p>
              </div>
            </div>

            {/* Quick Action Button to Open Google Drive Folder */}
            {driveResult && (
              <a
                href={driveResult.folderUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <span>Buka Folder di Google Drive</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploadingToDrive && driveProgress && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
                <span>{driveProgress.currentFileName || 'Menyiapkan berkas...'}</span>
                <span className="font-mono text-neutral-900 font-bold">{driveProgress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${driveProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message with Smart Actions */}
          {driveError && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-neutral-900">Perhatian Penyimpanan Google Drive</p>
                  <p className="text-neutral-700 leading-relaxed">{driveError}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 pl-6.5">
                <button
                  type="button"
                  onClick={handleSaveAllToGoogleDrive}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi Simpan ke Drive</span>
                </button>

                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Buka di Tab Baru</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Folder Structure & Student Metadata Customizer Card */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#FF385C] border border-rose-100 flex items-center justify-center shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>Struktur Folder & Penamaan Arsip</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Otomatis Terorganisir
                </span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Nama folder pada <strong>ZIP</strong> maupun <strong>Google Drive</strong> mengikuti format akademik <code>skripsi [nama siswa] - [nim]</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Inputs for Student Name & NIM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF385C]" />
              <span>Nama Siswa / Mahasiswa</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Contoh: Rahmad Hidayat"
              className="w-full px-4 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:border-[#FF385C] font-medium transition-all text-neutral-900 placeholder:text-neutral-400"
            />
            <p className="text-[11px] text-neutral-400">
              {metadata.studentName ? '✓ Terdeteksi otomatis dari halaman cover dokumen' : 'Bisa Anda ketik atau sesuaikan'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-neutral-500" />
              <span>NIM / Nomor Induk (Opsional)</span>
            </label>
            <input
              type="text"
              value={studentNim}
              onChange={(e) => setStudentNim(e.target.value)}
              placeholder="Contoh: 2011501234 (Kosongkan jika tidak ada)"
              className="w-full px-4 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:border-[#FF385C] font-medium transition-all text-neutral-900 placeholder:text-neutral-400"
            />
            <p className="text-[11px] text-neutral-400">
              {studentNim ? 'Format: skripsi [nama] - [nim]' : 'Jika kosong, folder: skripsi [nama]'}
            </p>
          </div>
        </div>

        {/* Live Structure Preview Box */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200/80 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-neutral-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF385C]" />
              <span>Pratinjau Folder Arsip:</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-500 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
              Nama Target: {activeFolderName}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 text-xs font-mono space-y-2 overflow-x-auto shadow-2xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <Folder className="w-4 h-4 fill-rose-500 text-rose-500 shrink-0" />
              <span className="bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {activeFolderName}/
              </span>
              <span className="text-[10px] text-neutral-400 font-sans font-normal">(Folder Utama ZIP & Google Drive)</span>
            </div>

            <div className="pl-6 space-y-1.5 border-l-2 border-dashed border-neutral-200 ml-2 py-1">
              {sortedResults.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-neutral-700">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-neutral-800">{item.filename}</span>
                </div>
              ))}
              {sortedResults.length > 4 && (
                <div className="text-neutral-400 italic text-[11px] pl-1">
                  ... dan {sortedResults.length - 4} berkas bab lainnya
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>
              Ketika disimpan ke <strong>Google Drive</strong> atau diunduh sebagai <strong>ZIP</strong>, seluruh bab langsung tersusun rapi di dalam satu folder khusus.
            </span>
          </div>
        </div>
      </div>

      {/* Split Result List (Airbnb Table Card Layout) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
              Daftar Berkas PDF Bab Terpisah
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Klik "Unduh PDF" untuk unduh lokal atau klik "Simpan ke Drive" untuk simpan satuan
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
          {sortedResults.map((item, idx) => {
            const isItemSavedToDrive = savedToDriveFileIds.has(item.id);
            const isItemUploading = uploadingSingleId === item.id;

            return (
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
                      {isItemSavedToDrive && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Drive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Individual Actions (Download & Save to Drive) */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleSaveSingleToDrive(item)}
                    disabled={isItemUploading}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                      isItemSavedToDrive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Simpan file ini ke Google Drive"
                  >
                    {isItemUploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : isItemSavedToDrive ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{isItemSavedToDrive ? 'Tersimpan di Drive' : 'Ke Drive'}</span>
                  </button>

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
            );
          })}
        </div>
      </div>
    </div>
  );
};

