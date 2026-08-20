import React, { useState } from 'react';
import {
  Scissors,
  ShieldCheck,
  FileText,
  HelpCircle,
  Menu,
  User,
  BookOpen,
  FileCheck2,
} from 'lucide-react';

interface NavbarProps {
  onLoadSamplePdf: () => void;
  onStartTour: () => void;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLoadSamplePdf,
  onStartTour,
  isProcessing,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Airbnb-style Brand Logo */}
          <div id="tour-brand-logo" className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF385C] to-[#E00B41] flex items-center justify-center text-white shadow-md shadow-rose-500/20 transition-transform hover:scale-105">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#FF385C]">
                SplitSkripsi
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-bold tracking-wide text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                Pemisah PDF
              </span>
            </div>
          </div>

          {/* Center: Airbnb-styled Floating Feature Pill (Desktop & Tablet) */}
          <div className="hidden md:flex items-center divide-x divide-neutral-200 border border-neutral-200 rounded-full py-2 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.08)] transition-all bg-white text-xs font-semibold text-neutral-800">
            <div className="px-3 py-0.5 flex items-center gap-1.5 hover:text-[#FF385C] transition-colors cursor-default">
              <FileCheck2 className="w-3.5 h-3.5 text-[#FF385C]" />
              <span>Khusus Dokumen PDF</span>
            </div>
            <div className="px-3 py-0.5 flex items-center gap-1.5 hover:text-[#FF385C] transition-colors cursor-default">
              <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
              <span>Pemisah Bab Instan</span>
            </div>
            <div id="tour-privacy-badge" className="pl-3 py-0.5 flex items-center gap-1.5 text-emerald-700 cursor-default">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privasi Aman di Browser</span>
            </div>
          </div>

          {/* Right: Actions & User Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Sample Trigger */}
            <div id="tour-sample-buttons" className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                id="btn-sample-pdf"
                onClick={onLoadSamplePdf}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 rounded-full transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs border border-neutral-200 bg-white"
                title="Muat contoh skripsi PDF 13 halaman"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>Contoh Dokumen</span>
              </button>
            </div>

            {/* Tour / Guide Button */}
            <button
              type="button"
              id="btn-start-tour"
              onClick={onStartTour}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Mulai Panduan Penggunaan"
            >
              <HelpCircle className="w-4 h-4 text-neutral-500" />
              <span className="hidden sm:inline">Panduan</span>
            </button>

            {/* Airbnb User Menu Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-neutral-200 hover:shadow-md transition-all bg-white cursor-pointer"
                aria-label="Menu navigasi"
              >
                <Menu className="w-4 h-4 text-neutral-600 ml-1" />
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Mobile / Dropdown Quick Menu */}
              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-neutral-200 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-neutral-100 font-bold text-neutral-900">
                    Opsi & Panduan
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLoadSamplePdf();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2.5 text-neutral-700 font-medium"
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Coba Skripsi PDF (13 Halaman)</span>
                  </button>
                  <div className="border-t border-neutral-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onStartTour();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2.5 text-neutral-700 font-medium"
                  >
                    <HelpCircle className="w-4 h-4 text-[#FF385C]" />
                    <span>Mulai Tur Panduan</span>
                  </button>
                  <div className="px-4 py-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>100% Privacy Lokal (Di Browser)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
