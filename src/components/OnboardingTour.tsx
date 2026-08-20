import React, { useMemo } from 'react';
import {
  Joyride,
  STATUS,
  Step,
  TooltipRenderProps,
  EventHandler,
  EventData,
  EVENTS,
  ACTIONS,
} from 'react-joyride';
import { ChevronRight, ChevronLeft, X, Check, Compass, Layers, FileText, Scissors, SlidersHorizontal, Download } from 'lucide-react';

interface OnboardingTourProps {
  run: boolean;
  stepIndex: number;
  onTourEnd: () => void;
  onStepChange: (index: number) => void;
  currentStage: 'upload' | 'analyzing' | 'structure' | 'download';
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  run,
  stepIndex,
  onTourEnd,
  onStepChange,
  currentStage,
}) => {
  // Construct dynamic tour steps based on the user's active application stage
  const steps = useMemo<Step[]>(() => {
    if (currentStage === 'structure') {
      return [
        {
          target: '#tour-structure-table',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5 mb-1">
                <Layers className="w-4 h-4 text-[#FF385C]" />
                <span>Daftar Bagian & Struktur Bab PDF</span>
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Lihat daftar bab yang tersusun rapi. Anda dapat menekan tombol <strong>Preview</strong> pada setiap bab untuk melihat halamannya, atau menahan (*long-press*) kartu bab untuk memilih dan menghapus massal (*bulk delete*).
              </p>
            </div>
          ),
          placement: 'bottom',
          skipBeacon: true,
        },
        {
          target: '#btn-add-section',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm mb-1">➕ Tambah Bagian Kustom</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Ingin menambahkan pemisah baru (seperti *Sub-Bab* atau *Lampiran Tambahan*)? Klik tombol ini untuk menentukan nama dan batas halamannya.
              </p>
            </div>
          ),
          placement: 'top',
          skipBeacon: true,
        },
        {
          target: '#btn-preview-doc',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm mb-1">👁️ Preview PDF Interaktif</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Buka penampil PDF untuk memeriksa visual dokumen per halaman dengan pembesaran zoom dan layer teks terbaca sebelum memotong berkas.
              </p>
            </div>
          ),
          placement: 'bottom',
          skipBeacon: true,
        },
        {
          target: '#btn-confirm-split',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm mb-1">✂️ Konfirmasi & Pisahkan PDF</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Setelah semua bagian dan rentang halaman sudah sesuai, klik tombol ini untuk memisahkan PDF menjadi berkas-berkas bab terpisah.
              </p>
            </div>
          ),
          placement: 'top',
          skipBeacon: true,
        },
      ];
    }

    if (currentStage === 'download') {
      return [
        {
          target: '#btn-download-all-zip',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5 mb-1">
                <Download className="w-4 h-4 text-[#FF385C]" />
                <span>Unduh Semua Sekaligus (.ZIP)</span>
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Klik tombol ini untuk mengunduh seluruh file hasil potongan skripsi dalam satu arsip ZIP rapi berfolder <code>skripsi [nama siswa] - [nim]</code>.
              </p>
            </div>
          ),
          placement: 'bottom',
          skipBeacon: true,
        },
        {
          target: '#tour-download-list',
          content: (
            <div>
              <h4 className="font-bold text-neutral-900 text-sm mb-1">📥 Unduh Berkas Per Bab</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Anda juga dapat mengunduh berkas bab tertentu saja secara satuan sesuai kebutuhan repositori kampus Anda.
              </p>
            </div>
          ),
          placement: 'top',
          skipBeacon: true,
        },
      ];
    }

    // Default: Upload Stage (All targets are guaranteed visible across mobile, tablet, and desktop)
    return [
      {
        target: '#tour-brand-logo',
        content: (
          <div>
            <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5 mb-1">
              <Compass className="w-4 h-4 text-[#FF385C]" />
              <span>Selamat Datang di <strong className="font-latin text-base font-bold text-[#FF385C]">SplitSkripsi</strong></span>
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Alat bantu untuk memisahkan dokumen PDF Skripsi, Tesis, dan Laporan Akademik secara rapi per bab dengan mudah.
            </p>
          </div>
        ),
        placement: 'bottom',
        skipBeacon: true,
      },
      {
        target: '#drop-zone-area',
        content: (
          <div>
            <h4 className="font-bold text-neutral-900 text-sm mb-1">📁 Upload Dokumen PDF Skripsi</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tarik dan lepaskan berkas skripsi PDF Anda (format <strong>.pdf</strong>) ke area ini atau klik <strong>"Pilih File PDF"</strong>.
            </p>
          </div>
        ),
        placement: 'bottom',
        skipBeacon: true,
      },
      {
        target: '#tour-sample-section',
        content: (
          <div>
            <h4 className="font-bold text-neutral-900 text-sm mb-1">🧪 Uji Coba Dokumen Contoh</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Belum menyiapkan dokumen? Klik tombol <strong>"Muat Contoh PDF Skripsi"</strong> untuk langsung mencoba simulasi pemisahan lengkap.
            </p>
          </div>
        ),
        placement: 'top',
        skipBeacon: true,
      },
      {
        target: '#tour-features-summary',
        content: (
          <div>
            <h4 className="font-bold text-neutral-900 text-sm mb-1">✨ Fitur & Keunggulan</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Dilengkapi penyaringan daftar isi bertitik, pratinjau halaman instan, penghapusan massal, dan pemrosesan lokal 100% di browser.
            </p>
          </div>
        ),
        placement: 'top',
        skipBeacon: true,
      },
      {
        target: '#btn-start-tour',
        content: (
          <div>
            <h4 className="font-bold text-neutral-900 text-sm mb-1">💡 Buka Panduan Kapan Saja</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Anda selalu dapat membuka kembali panduan interaktif ini sewaktu-waktu dengan menekan tombol <strong>Panduan</strong> di navigasi atas.
            </p>
          </div>
        ),
        placement: 'bottom-end',
        skipBeacon: true,
      },
    ];
  }, [currentStage]);

  const handleJoyrideEvent: EventHandler = (data: EventData) => {
    const { status, action, index, type } = data;

    // Handle Finish, Skip, Close, or Tour End
    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE ||
      action === ACTIONS.SKIP ||
      action === ACTIONS.RESET ||
      type === EVENTS.TOUR_END
    ) {
      onTourEnd();
      return;
    }

    // Skip step if target not found
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (index + 1 < steps.length) {
        onStepChange(index + 1);
      } else {
        onTourEnd();
      }
      return;
    }

    // Step change handling
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        onStepChange(index + 1);
      } else if (action === ACTIONS.PREV) {
        onStepChange(Math.max(0, index - 1));
      }
    }
  };

  // Custom Airbnb sleek tooltip component
  const TooltipComponent = ({
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
  }: TooltipRenderProps) => (
    <div
      {...tooltipProps}
      className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 max-w-sm text-neutral-800 z-[10000] animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#FF385C] text-white text-[11px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Panduan ({index + 1}/{steps.length})
          </span>
        </div>
        <button
          {...closeProps}
          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          title="Tutup Panduan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-1 text-xs">{step.content}</div>

      <div className="flex items-center justify-between pt-4 mt-3 border-t border-neutral-100 gap-2">
        <button
          {...skipProps}
          className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold px-2 py-1 transition-colors cursor-pointer"
        >
          Lewati
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-3.5 py-1.5 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          )}

          <button
            {...primaryProps}
            className="btn-rausch px-4 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-500/20 transition-all cursor-pointer"
          >
            <span>{isLastStep ? 'Selesai' : 'Lanjut'}</span>
            {!isLastStep ? <ChevronRight className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous={true}
      scrollToFirstStep={true}
      onEvent={handleJoyrideEvent}
      tooltipComponent={TooltipComponent}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        primaryColor: '#FF385C',
        zIndex: 10000,
        overlayColor: 'rgba(0, 0, 0, 0.65)',
        spotlightRadius: 20,
        scrollOffset: 120,
        overlayClickAction: false,
        dismissKeyAction: 'close',
      }}
      styles={{
        overlay: {
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        },
      }}
    />
  );
};
