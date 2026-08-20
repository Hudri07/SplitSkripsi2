import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Shield,
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Layers,
  Award,
  Lock,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface FileUploaderProps {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onStartAnalysis: () => void;
  onLoadSamplePdf: () => void;
  isAnalyzing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  selectedFile,
  onFileSelected,
  onStartAnalysis,
  onLoadSamplePdf,
  isAnalyzing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'skripsi' | 'tesis' | 'magang' | 'ta'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'all', label: 'Semua Dokumen', icon: GraduationCap },
    { id: 'skripsi', label: 'Skripsi S1', icon: BookOpen },
    { id: 'tesis', label: 'Tesis S2 / S3', icon: Award },
    { id: 'magang', label: 'Laporan Magang / PKL', icon: FileSpreadsheet },
    { id: 'ta', label: 'Tugas Akhir / Laporan', icon: Layers },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndSelect = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext !== 'pdf') {
      setErrorMessage('Format file tidak didukung. Aplikasi ini khusus memproses dokumen berformat PDF (.pdf).');
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      setErrorMessage('Ukuran file terlalu besar (maksimal 80MB untuk kelancaran pemrosesan di browser).');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Category Pills Bar (Airbnb Aesthetic) */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2.5 airbnb-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
                isActive
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF385C]' : 'text-neutral-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero Headline */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
          Pisahkan Bab Dokumen Skripsi PDF dengan Mudah
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed">
          Temukan batas halaman Cover, Abstrak, BAB I s/d BAB V, Daftar Pustaka, hingga Lampiran secara rapi langsung dari berkas PDF Anda.
        </p>
      </div>

      {/* Main Upload Box (Airbnb Card Aesthetic) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-6 sm:p-10 transition-all">
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload-input"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {!selectedFile ? (
          <div
            id="drop-zone-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center transition-all ${
              isDragOver
                ? 'border-[#FF385C] bg-rose-50/40 scale-[0.99]'
                : 'border-neutral-200 hover:border-[#FF385C]/60 bg-neutral-50/50 hover:bg-rose-50/20'
            }`}
          >
            {/* Center Upload Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-white border border-neutral-200 text-[#FF385C] flex items-center justify-center shadow-sm transition-transform hover:scale-105">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
              Upload PDF Skripsi
            </h2>
            <p className="text-sm font-semibold text-[#FF385C] mt-1">
              Format Dokumen PDF (.pdf)
            </p>
            <p className="text-xs text-neutral-500 mt-2 max-w-md mx-auto">
              Tarik & letakkan file PDF skripsi ke sini, atau klik untuk memilih file dari penyimpanan perangkat Anda.
            </p>

            {/* Choose File Button */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                id="btn-choose-file"
                className="btn-rausch px-7 py-3 text-white font-bold text-sm rounded-full shadow-md shadow-rose-500/25 inline-flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Pilih File PDF</span>
              </button>
            </div>

            {/* Format Tags */}
            <div className="mt-8 pt-6 border-t border-neutral-200/80 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 font-medium">
              <span className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Format: <strong>PDF (.pdf)</strong>
              </span>
              <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                100% Privasi Lokal (Diproses di Browser)
              </span>
            </div>
          </div>
        ) : (
          /* File Selected State (Airbnb Card Layout) */
          <div id="tour-selected-file-card" className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-8 h-8 text-[#FF385C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-900 text-white">
                      Berkas PDF Terpilih
                    </span>
                    <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Diproses
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 mt-1.5 break-all">
                    {selectedFile.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mt-1">
                    <span>Format: <strong>Dokumen PDF (.pdf)</strong></span>
                    <span>•</span>
                    <span>Ukuran: <strong>{formatFileSize(selectedFile.size)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center shrink-0">
                <button
                  type="button"
                  id="btn-change-file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-full transition-all cursor-pointer shadow-2xs"
                >
                  Ganti PDF
                </button>
              </div>
            </div>

            {/* Action Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-neutral-500 text-center sm:text-left">
                Dokumen PDF akan dipindai untuk menemukan batas bab dan bagian secara terstruktur.
              </p>
              <button
                type="button"
                id="btn-analyze-document"
                onClick={onStartAnalysis}
                disabled={isAnalyzing}
                className="btn-rausch w-full sm:w-auto px-8 py-3.5 text-white font-bold text-sm rounded-full shadow-lg shadow-rose-500/25 inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Periksa Struktur PDF</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Peringatan Berkas</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Demo Test Section (Airbnb Floating Banner) */}
      <div id="tour-sample-section" className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-[#FF385C] border border-rose-100 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
              Ingin melihat contoh hasil pemisahan?
            </h4>
            <p className="text-xs text-neutral-500">
              Gunakan simulasi skripsi PDF 13 halaman standar akademik:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            id="btn-sample-pdf-body"
            onClick={onLoadSamplePdf}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#FF385C]" />
            <span>Muat Contoh PDF Skripsi</span>
          </button>
        </div>
      </div>

      {/* Feature Badges (Airbnb 3-Column Bento Cards) */}
      <div id="tour-features-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#FF385C] border border-rose-100 flex items-center justify-center font-bold text-sm">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-neutral-900 text-sm sm:text-base">
            Presisi Deteksi Bab
          </h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Mendeteksi judul bab naskah utama secara akurat dan menyaring baris referensi pada Daftar Isi bertitik agar tidak salah potong.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center font-bold text-sm">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-neutral-900 text-sm sm:text-base">
            Preview & Hapus Massal
          </h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Periksa halaman tiap bab dengan penampil PDF langsung, atur rentang halaman, atau tahan kartu untuk menghapus beberapa bab sekaligus.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-sm">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-neutral-900 text-sm sm:text-base">
            100% Privasi di Browser
          </h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Seluruh proses pemotongan dan penataan halaman berlangsung sepenuhnya di perangkat Anda tanpa pernah dikirim ke internet.
          </p>
        </div>
      </div>
    </div>
  );
};
