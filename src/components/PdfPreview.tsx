import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentSection, ExtractedPage } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Bookmark,
  Layers,
  Maximize2,
  Minimize2,
  Menu,
} from 'lucide-react';

interface PdfPreviewProps {
  pdfDocProxy: pdfjsLib.PDFDocumentProxy | null;
  pages: ExtractedPage[];
  sections: DocumentSection[];
  initialPage?: number;
  onClose: () => void;
  onSplitAtPage?: (pageNumber: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfDocProxy,
  pages,
  sections,
  initialPage = 1,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalPages = pdfDocProxy?.numPages || pages.length || 1;

  // Find which section the current page belongs to
  const currentSection = sections.find(
    (sec) => currentPage >= sec.start && currentPage <= sec.end
  );

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Calculate smart default zoom based on viewport on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      const containerHeight = scrollContainerRef.current.clientHeight;

      // Typical A4 PDF page ratio (width / height ≈ 595 / 842 ≈ 0.7)
      if (containerWidth < 640) {
        // Mobile screen: fit to width comfortably
        setZoom(0.65);
      } else if (containerHeight < 750) {
        // Laptop screen: fit page height
        setZoom(0.85);
      } else {
        // Desktop / Large screen
        setZoom(1.0);
      }
    }
  }, []);

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, onClose]);

  // Page rendering logic
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDocProxy || !canvasRef.current) return;
      setIsLoadingPage(true);

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocProxy.getPage(currentPage);
        if (isCancelled) return;

        // Use pixel ratio for crisp rendering without displacement
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale: zoom * dpr });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF Page render error:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPage(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDocProxy, currentPage, zoom]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(2.2, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, +(prev - 0.15).toFixed(2)));

  const handleFitWidth = useCallback(() => {
    if (scrollContainerRef.current) {
      const availableWidth = scrollContainerRef.current.clientWidth - 48;
      // Standard A4 width is 595.28 points
      const optimalZoom = Math.min(1.8, Math.max(0.5, availableWidth / 620));
      setZoom(+optimalZoom.toFixed(2));
    }
  }, []);

  const handleFitPage = useCallback(() => {
    if (scrollContainerRef.current) {
      const availableHeight = scrollContainerRef.current.clientHeight - 120;
      // Standard A4 height is 841.89 points
      const optimalZoom = Math.min(1.6, Math.max(0.5, availableHeight / 860));
      setZoom(+optimalZoom.toFixed(2));
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-neutral-200 w-full max-w-6xl h-[94vh] max-h-[960px] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-900 animate-in zoom-in-98 duration-150">
        {/* Top Control Bar (Airbnb Header) */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-neutral-200 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Document Info & Current Chapter Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer shrink-0"
              title="Buka Daftar Bagian"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-rose-50 text-[#FF385C] border border-rose-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 truncate">
                  Pratinjau PDF
                </h3>
                {currentSection && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 truncate max-w-[200px]">
                    {currentSection.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Halaman <strong className="text-neutral-900">{currentPage}</strong> dari {totalPages}
              </p>
            </div>
          </div>

          {/* Center / Right: Navigation & Zoom Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Page Navigation Controls */}
            <div className="flex items-center bg-neutral-50 rounded-full p-1 border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-neutral-200/80 rounded-full text-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Halaman sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2 text-xs font-mono font-bold text-neutral-800 flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentPage}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(v) && v >= 1 && v <= totalPages) {
                      setCurrentPage(v);
                    }
                  }}
                  className="w-10 bg-white border border-neutral-300 rounded-md text-center text-xs py-0.5 text-neutral-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF385C]"
                />
                <span className="text-neutral-400 text-[11px]">/ {totalPages}</span>
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1.5 hover:bg-neutral-200/80 rounded-full text-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Halaman berikutnya (Panah Kanan)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Zoom Presets (Fit Page / Fit Width) */}
            <div className="hidden lg:flex items-center gap-1 bg-neutral-50 rounded-full p-1 border border-neutral-200 shadow-2xs text-[11px] font-semibold text-neutral-600">
              <button
                type="button"
                onClick={handleFitPage}
                className="px-2.5 py-1 hover:bg-white hover:text-neutral-900 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title="Sesuaikan Tinggi Layar"
              >
                <Minimize2 className="w-3 h-3 text-neutral-500" />
                <span>Layar</span>
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                className="px-2.5 py-1 hover:bg-white hover:text-neutral-900 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title="Sesuaikan Lebar Penuh"
              >
                <Maximize2 className="w-3 h-3 text-neutral-500" />
                <span>Lebar</span>
              </button>
            </div>

            {/* Zoom In & Out */}
            <div className="hidden sm:flex items-center bg-neutral-50 rounded-full p-1 border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 hover:bg-neutral-200/80 rounded-full text-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono px-2 text-neutral-700 font-bold min-w-[44px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.2}
                className="p-1.5 hover:bg-neutral-200/80 rounded-full text-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer ml-1"
              title="Tutup Pratinjau (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout (Sidebar + Canvas Render Area) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Section Jump Sidebar (Desktop Always, Mobile Drawer) */}
          <div
            className={`w-64 bg-neutral-50/90 border-r border-neutral-200 overflow-y-auto airbnb-scrollbar p-3 shrink-0 space-y-1.5 transition-all z-20 ${
              sidebarOpenMobile
                ? 'absolute inset-y-0 left-0 bg-white shadow-2xl block md:relative md:shadow-none'
                : 'hidden md:block'
            }`}
          >
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#FF385C]" />
                Daftar Bagian ({sections.length})
              </span>
              {sidebarOpenMobile && (
                <button
                  type="button"
                  onClick={() => setSidebarOpenMobile(false)}
                  className="md:hidden p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {sections.map((sec, idx) => {
              const isSelected = currentPage >= sec.start && currentPage <= sec.end;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(sec.start);
                    setSidebarOpenMobile(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 text-[#FF385C] border border-rose-200 shadow-2xs font-bold'
                      : 'hover:bg-neutral-100 text-neutral-700 border border-transparent'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full shrink-0 font-bold ${
                      isSelected
                        ? 'bg-[#FF385C] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{sec.title}</p>
                    <p className="text-[10px] text-neutral-500 font-normal mt-0.5">
                      Hal. {sec.start} - {sec.end} ({sec.count} hal)
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Canvas Render Viewport (Proper Centering with Clean Padding) */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto airbnb-scrollbar bg-neutral-100/70 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start relative"
          >
            {/* Loading Indicator */}
            {isLoadingPage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200 shadow-lg text-xs font-bold text-neutral-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF385C] animate-ping" />
                  <span>Memuat Halaman {currentPage}...</span>
                </div>
              </div>
            )}

            {/* Centered Outer Canvas Frame */}
            <div className="w-full flex-1 flex flex-col items-center justify-center my-auto">
              <div className="relative shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl border border-neutral-200/90 bg-white p-2.5 sm:p-4 transition-transform mx-auto">
                <canvas
                  ref={canvasRef}
                  className="block rounded-lg max-w-full bg-white shadow-2xs"
                />
              </div>

              {/* Text Layer Snippet Box */}
              {pages[currentPage - 1]?.lines && pages[currentPage - 1].lines.length > 0 && (
                <div className="mt-6 max-w-2xl w-full bg-white border border-neutral-200 rounded-2xl p-4 text-xs text-neutral-700 shadow-xs">
                  <p className="font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FF385C]" />
                    <span>Layer Teks Terbaca (Halaman {currentPage}):</span>
                  </p>
                  <div className="max-h-24 overflow-y-auto airbnb-scrollbar font-mono text-[11px] text-neutral-500 space-y-0.5">
                    {pages[currentPage - 1].lines.slice(0, 8).map((line, lIdx) => (
                      <p key={lIdx} className="truncate">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
