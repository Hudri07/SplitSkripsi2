import React from 'react';
import { Loader2, CheckCircle2, FileSearch } from 'lucide-react';
import { AnalysisProgress } from '../types';

interface DocumentAnalyzerProps {
  progress: AnalysisProgress;
  fileName: string;
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ progress, fileName }) => {
  const steps = [
    { label: 'Membaca struktur dokumen & layer teks', minPercent: 10 },
    { label: 'Mendeteksi lembar depan & bab awal', minPercent: 30 },
    { label: 'Memeriksa judul dan gaya teks penomoran', minPercent: 50 },
    { label: 'Menyusun urutan BAB & menyaring Daftar Isi', minPercent: 75 },
    { label: 'Menyiapkan pembagian bab & nomor halaman', minPercent: 95 },
  ];

  return (
    <div className="w-full max-w-xl mx-auto py-12 px-4 sm:px-6 text-center">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-8 sm:p-10 space-y-6">
        {/* Animated Scanner Icon with Airbnb Rose Theme */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[#FF385C] shadow-inner">
            <FileSearch className="w-9 h-9 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF385C] text-white flex items-center justify-center shadow-md">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Menganalisis Dokumen
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto truncate font-medium">
            {fileName}
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-neutral-800">
            <span className="text-[#FF385C]">{progress.stepName || 'Sedang memproses...'}</span>
            <span className="font-mono">{progress.percent}%</span>
          </div>
          <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
            <div
              className="h-full btn-rausch rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, progress.percent)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-neutral-400 italic text-left">
            {progress.detail}
          </p>
        </div>

        {/* Step Checkpoints */}
        <div className="border-t border-neutral-100 pt-5 text-left space-y-3">
          {steps.map((step, idx) => {
            const isCompleted = progress.percent >= step.minPercent + 15;
            const isCurrent = progress.percent >= step.minPercent && progress.percent < step.minPercent + 20;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 text-xs transition-colors ${
                  isCompleted
                    ? 'text-emerald-700 font-semibold'
                    : isCurrent
                    ? 'text-[#FF385C] font-bold'
                    : 'text-neutral-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[#FF385C] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-neutral-300 shrink-0 flex items-center justify-center text-[9px] font-bold text-neutral-500">
                    {idx + 1}
                  </div>
                )}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
