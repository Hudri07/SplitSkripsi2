import React, { useState, useEffect } from 'react';
import {
  Scissors,
  ShieldCheck,
  FileText,
  HelpCircle,
  Menu,
  User,
  BookOpen,
  FileCheck2,
  X,
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-2 sm:top-4 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      <div className="max-w-6xl mx-auto">
        <nav
          className={`pointer-events-auto bg-white/90 backdrop-blur-md rounded-full border transition-all duration-300 py-2 sm:py-2.5 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 ${
            isScrolled
              ? 'border-neutral-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.1)] bg-white/95'
              : 'border-neutral-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
          }`}
          aria-label="Navigasi Utama"
        >
          {/* Left: Airbnb-style Brand Logo */}
          <div
            id="tour-brand-logo"
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#FF385C] to-[#E00B41] flex items-center justify-center text-white shadow-md shadow-rose-500/20 transition-transform hover:scale-105 shrink-0">
              <Scissors className="w-4 h-4 -rotate-45" />
            </div>
            <div className="flex items-center">
              <span className="font-latin text-2xl sm:text-[26px] font-bold tracking-normal text-[#FF385C] leading-none select-none">
                SplitSkripsi
              </span>
              <span className="hidden lg:inline-block ml-2 text-[10px] font-bold tracking-wide text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                PDF Splitter
              </span>
            </div>
          </div>

          {/* Center: Airbnb-styled Floating Feature Pill (Desktop & Tablet) */}
          <div className="hidden md:flex items-center divide-x divide-neutral-200 border border-neutral-200/80 rounded-full py-1.5 px-3 shadow-2xs transition-all bg-neutral-50/80 text-[11px] font-semibold text-neutral-700">
            <div className="px-2.5 py-0.5 flex items-center gap-1.5 hover:text-[#FF385C] transition-colors cursor-default">
              <FileCheck2 className="w-3.5 h-3.5 text-[#FF385C]" />
              <span>Dokumen PDF</span>
            </div>
            <div className="px-2.5 py-0.5 flex items-center gap-1.5 hover:text-[#FF385C] transition-colors cursor-default">
              <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
              <span>Pemisah Bab</span>
            </div>
            <div
              id="tour-privacy-badge"
              className="pl-2.5 py-0.5 flex items-center gap-1.5 text-emerald-700 cursor-default"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Offline Lokal</span>
            </div>
          </div>

          {/* Right: Actions & User Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Sample Trigger */}
            <div id="tour-sample-buttons" className="hidden sm:flex items-center">
              <button
                type="button"
                id="btn-sample-pdf"
                onClick={onLoadSamplePdf}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 active:scale-95 rounded-full transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs border border-neutral-200 bg-white"
                title="Muat contoh skripsi PDF 13 halaman"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden md:inline">Contoh Dokumen</span>
                <span className="md:hidden">Contoh</span>
              </button>
            </div>

            {/* Tour / Guide Button */}
            <button
              type="button"
              id="btn-start-tour"
              onClick={onStartTour}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 active:scale-95 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer"
              title="Mulai Panduan Penggunaan"
            >
              <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Panduan</span>
            </button>

            {/* Airbnb User Menu Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full border border-neutral-200/90 hover:shadow-md hover:border-neutral-300 active:scale-95 transition-all bg-white cursor-pointer"
                aria-label="Menu navigasi"
              >
                {mobileMenuOpen ? (
                  <X className="w-3.5 h-3.5 text-neutral-700 ml-1" />
                ) : (
                  <Menu className="w-3.5 h-3.5 text-neutral-700 ml-1" />
                )}
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                  <User className="w-3 h-3" />
                </div>
              </button>

              {/* Mobile / Dropdown Floating Menu */}
              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-white/98 backdrop-blur-lg rounded-3xl border border-neutral-200 shadow-2xl py-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-neutral-100 font-bold text-neutral-900 flex items-center justify-between">
                    <span>Opsi & Panduan</span>
                    <span className="text-[10px] font-normal text-neutral-400">SplitSkripsi</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLoadSamplePdf();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2.5 text-neutral-700 font-medium cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Coba Skripsi PDF (13 Hal)</span>
                  </button>
                  <div className="border-t border-neutral-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onStartTour();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2.5 text-neutral-700 font-medium cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-[#FF385C]" />
                    <span>Mulai Tur Panduan</span>
                  </button>
                  <div className="px-4 py-2.5 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center gap-1.5 bg-neutral-50/70 rounded-b-2xl mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>100% Pemrosesan Lokal di Browser</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};
