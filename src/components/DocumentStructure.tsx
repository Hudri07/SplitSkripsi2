import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DocumentSection,
  DocumentMetadata,
} from '../types';
import {
  Edit3,
  PlusCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Scissors,
  AlertTriangle,
  FileText,
  RotateCcw,
  Check,
  X,
  ArrowRight,
  CheckSquare,
  Square,
  Layers,
  Smartphone,
  Monitor,
} from 'lucide-react';

interface DocumentStructureProps {
  metadata: DocumentMetadata;
  sections: DocumentSection[];
  onUpdateSections: (sections: DocumentSection[]) => void;
  onConfirmSplit: () => void;
  onOpenPreview: (sectionIndex?: number) => void;
  onResetDetection: () => void;
  onBackToUpload: () => void;
  isSplitting: boolean;
}

export const DocumentStructure: React.FC<DocumentStructureProps> = ({
  metadata,
  sections,
  onUpdateSections,
  onConfirmSplit,
  onOpenPreview,
  onResetDetection,
  onBackToUpload,
  isSplitting,
}) => {
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartStr, setEditStartStr] = useState<string>('1');
  const [editEndStr, setEditEndStr] = useState<string>('1');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [deleteWarningModal, setDeleteWarningModal] = useState<{ title: string; message: string } | null>(null);

  // Smart suggestion: track manual deletions and show bulk delete tip if deleted 2 or 3 times
  const [manualDeleteCount, setManualDeleteCount] = useState<number>(0);
  const [showBulkTip, setShowBulkTip] = useState<boolean>(false);
  const [hasDismissedBulkTip, setHasDismissedBulkTip] = useState<boolean>(false);

  // Add new section modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartStr, setNewStartStr] = useState<string>('1');
  const [newEndStr, setNewEndStr] = useState<string>('1');

  // Long press handling refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // --- Inline Edit Handlers ---
  const handleStartEdit = (sec: DocumentSection) => {
    setEditingId(sec.id);
    setEditTitle(sec.title);
    setEditStartStr(String(sec.start));
    setEditEndStr(String(sec.end));
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const startNum = Math.max(1, parseInt(editStartStr, 10) || 1);
    const endNum = Math.max(startNum, parseInt(editEndStr, 10) || startNum);
    const count = endNum - startNum + 1;

    const updated = sections.map((sec) => {
      if (sec.id === editingId) {
        return {
          ...sec,
          title: editTitle.trim() || sec.title,
          start: startNum,
          end: endNum,
          count: count,
          needsReview: false,
          isCustom: true,
        };
      }
      return sec;
    });

    onUpdateSections(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) {
      setDeleteWarningModal({
        title: 'Tidak Dapat Menghapus Bagian',
        message: 'Dokumen minimal harus memiliki 1 bagian tersisa agar dapat diproses.',
      });
      return;
    }
    const updated = sections
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onUpdateSections(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // Detect 2 or 3 manual deletions and show recommendation tip
    const nextCount = manualDeleteCount + 1;
    setManualDeleteCount(nextCount);
    if (nextCount >= 2 && !hasDismissedBulkTip) {
      setShowBulkTip(true);
    }
  };

  // --- Bulk Selection & Deletion Handlers ---
  const isAllSelected = sections.length > 0 && selectedIds.size === sections.length;
  const isSelectionMode = selectedIds.size > 0;

  const toggleSelectSection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sections.map((s) => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleRequestBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size >= sections.length) {
      setDeleteWarningModal({
        title: 'Tidak Dapat Menghapus Semua Bagian',
        message: 'Dokumen minimal harus memiliki 1 bagian tersisa agar dapat dipisahkan menjadi berkas PDF.',
      });
      return;
    }

    // Open custom modal dialog
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    const remaining = sections
      .filter((s) => !selectedIds.has(s.id))
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    onUpdateSections(remaining);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  // --- Long Press Handlers for Touch Devices ---
  const handleTouchStart = (id: string) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      toggleSelectSection(id);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // --- Reordering Handlers ---
  const handleMoveOrder = (sectionIdOrIndex: string | number, direction: 'up' | 'down') => {
    let index: number;
    if (typeof sectionIdOrIndex === 'string') {
      index = sections.findIndex((s) => s.id === sectionIdOrIndex);
    } else {
      index = sectionIdOrIndex;
    }
    if (index < 0 || index >= sections.length) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    const reordered = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    onUpdateSections(reordered);
  };

  // --- Auto-Bridge Contiguous Chapter Spanning Handler ---
  const handleAutoBridgeContiguous = () => {
    if (sections.length <= 1) return;
    // Sort sections by start page
    const sorted = [...sections].sort((a, b) => a.start - b.start);
    const bridged = sorted.map((sec, idx) => {
      const isLast = idx === sorted.length - 1;
      const nextStart = isLast ? metadata.totalUnits : sorted[idx + 1].start;
      const end = isLast ? metadata.totalUnits : Math.max(sec.start, nextStart - 1);
      const count = Math.max(1, end - sec.start + 1);
      return {
        ...sec,
        order: idx + 1,
        end,
        count,
      };
    });
    onUpdateSections(bridged);
  };

  // --- Add Section Handler ---
  const handleAddNewSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const startNum = Math.max(1, parseInt(newStartStr, 10) || 1);
    const endNum = Math.max(startNum, parseInt(newEndStr, 10) || startNum);
    const count = endNum - startNum + 1;

    const newSec: DocumentSection = {
      id: `custom_${Date.now()}`,
      order: sections.length + 1,
      title: newTitle.trim(),
      normalizedKey: newTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      start: startNum,
      end: endNum,
      count: count,
      confidence: 100,
      isCustom: true,
      needsReview: false,
    };

    onUpdateSections([...sections, newSec]);
    setIsAddModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 pb-28 md:pb-12">
      {/* Top Header Card (Airbnb Aesthetic) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF385C]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                {metadata.estimatedDocType || 'Dokumen Skripsi PDF'}
              </span>
              <span className="text-[10px] sm:text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {sections.length} Bab / Bagian
              </span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 mt-1.5 break-words line-clamp-2">
              {metadata.fileName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 mt-0.5">
              <span>Total {metadata.totalUnits} Halaman</span>
              {metadata.studentName && (
                <>
                  <span>•</span>
                  <span className="text-neutral-700 font-medium">
                    Mahasiswa: <strong>{metadata.studentName}</strong>
                  </span>
                </>
              )}
              {metadata.studentNim && (
                <>
                  <span>•</span>
                  <span className="font-mono text-neutral-700">
                    NIM: <strong>{metadata.studentNim}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Tools (Airbnb Rounded Pills) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
          <button
            type="button"
            id="btn-preview-doc"
            onClick={() => onOpenPreview()}
            className="flex-1 sm:flex-none px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-neutral-600" />
            <span>Lihat Semua Halaman</span>
          </button>

          <button
            type="button"
            id="btn-reset-detection"
            onClick={onResetDetection}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 border border-neutral-200 cursor-pointer shadow-2xs"
            title="Reset ke struktur deteksi asli"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={onBackToUpload}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 rounded-full text-xs font-semibold transition-all border border-neutral-200 cursor-pointer shadow-2xs"
          >
            Ganti PDF
          </button>
        </div>
      </div>

      {/* Scanned Warning if any */}
      {metadata.isScannedPdf && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Dokumen PDF Berupa Gambar / Hasil Scan</p>
            <p className="mt-0.5 text-amber-700 text-xs leading-relaxed">
              Dokumen ini tidak memiliki text layer langsung. Anda dapat menggunakan tombol <strong>[Tambah Bagian]</strong> atau <strong>[Edit]</strong> untuk menyesuaikan rentang halaman secara manual.
            </p>
          </div>
        </div>
      )}

      {/* Bulk Action Sticky Bar (Appears when >= 1 item is selected) */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 text-white rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 border border-neutral-800 sticky top-20 z-30"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-rose-600 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                {selectedIds.size}
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  {selectedIds.size} bagian dipilih
                </p>
                <p className="text-[11px] text-neutral-400 hidden sm:block">
                  Tahan kartu untuk memilih lebih banyak atau gunakan tombol di bawah
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-full text-xs font-semibold cursor-pointer transition-colors"
              >
                {isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-full text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleRequestBulkDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.size})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Container Card (Airbnb Aesthetic) */}
      <div id="tour-structure-table" className="bg-white rounded-3xl border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
          <div>
            <h3 className="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
              <span>Daftar Bagian & Bab PDF</span>
              <span className="text-xs font-normal text-neutral-500">
                ({sections.length} bagian)
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Klik ikon mata untuk preview halaman bab tertentu. Tahan kartu pada HP untuk memilih dan menghapus massal (*bulk delete*).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoBridgeContiguous}
              title="Rapatkan rentang bab secara otomatis agar bab saat ini menyambung penuh hingga halaman sebelum bab berikutnya (misal BAB IV Hal 40-77 jika BAB V mulai Hal 78)"
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-200/80 shadow-2xs active:scale-97"
            >
              <Layers className="w-3.5 h-3.5 text-[#FF385C]" />
              <span className="hidden sm:inline">Rapatkan Rentang Bab</span>
              <span className="sm:hidden">Rapatkan</span>
            </button>

            <button
              type="button"
              id="btn-add-section"
              onClick={() => {
                const lastSec = sections[sections.length - 1];
                const nextStart = lastSec ? lastSec.end + 1 : 1;
                setNewStartStr(String(nextStart));
                setNewEndStr(String(nextStart));
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah Bagian</span>
            </button>
          </div>
        </div>

        {/* Desktop View: Full Data Table (visible on lg screens and up) */}
        <div className="hidden lg:block overflow-x-auto airbnb-scrollbar">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                    title={isAllSelected ? 'Batal pilih semua' : 'Pilih semua'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#FF385C]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 w-16 text-center">Urutan</th>
                <th className="py-3 px-5">Nama Bagian / Bab</th>
                <th className="py-3 px-4 w-28 text-center">Halaman Awal</th>
                <th className="py-3 px-4 w-28 text-center">Halaman Akhir</th>
                <th className="py-3 px-4 w-24 text-center">Jumlah</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-5 w-44 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              <AnimatePresence initial={false}>
                {sections.map((sec, idx) => {
                  const isEditing = editingId === sec.id;
                  const isSelected = selectedIds.has(sec.id);

                  return (
                    <motion.tr
                      key={sec.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                      transition={{
                        layout: { type: 'spring', stiffness: 350, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-rose-50/70 border-l-4 border-l-[#FF385C]'
                          : isEditing
                          ? 'bg-amber-50/40'
                          : sec.needsReview
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : 'hover:bg-neutral-50/80'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectSection(sec.id)}
                          className="p-1 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#FF385C]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Order */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-neutral-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Section Title */}
                      <td className="py-3.5 px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                            placeholder="Nama bagian..."
                            autoFocus
                          />
                        ) : (
                          <div>
                            <p className="font-bold text-neutral-900">{sec.title}</p>
                            {sec.detectedText && sec.detectedText !== sec.title && (
                              <p className="text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
                                Teks: "{sec.detectedText}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Start Page */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editStartStr}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditStartStr(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-20 px-2 py-1.5 text-xs font-mono font-bold text-center bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                          />
                        ) : (
                          <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded-md">
                            {sec.start}
                          </span>
                        )}
                      </td>

                      {/* End Page */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editEndStr}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditEndStr(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-20 px-2 py-1.5 text-xs font-mono font-bold text-center bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                          />
                        ) : (
                          <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded-md">
                            {sec.end}
                          </span>
                        )}
                      </td>

                      {/* Count */}
                      <td className="py-3.5 px-4 text-center font-mono text-neutral-600">
                        {sec.count} hal
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {sec.needsReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Perlu Cek
                          </span>
                        ) : sec.isCustom ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Kustom
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Otomatis
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                              title="Simpan perubahan"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {/* Preview specific section button */}
                            <button
                              type="button"
                              onClick={() => onOpenPreview(idx)}
                              className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                              title="Preview Bab ini"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(sec)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                              title="Edit nama dan batas halaman"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveOrder(sec.id, 'up');
                              }}
                              onTouchStart={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              disabled={idx === 0}
                              className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200 active:bg-neutral-300 active:scale-90 rounded-lg transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer touch-manipulation shadow-2xs"
                              title="Geser ke atas"
                              aria-label="Geser ke atas"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveOrder(sec.id, 'down');
                              }}
                              onTouchStart={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              disabled={idx === sections.length - 1}
                              className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200 active:bg-neutral-300 active:scale-90 rounded-lg transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer touch-manipulation shadow-2xs"
                              title="Geser ke bawah"
                              aria-label="Geser ke bawah"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                              title="Hapus bagian ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Responsive Card Layout (with Long Press & Bulk Select) */}
        <div className="lg:hidden p-3 sm:p-4 space-y-3">
          <AnimatePresence initial={false}>
            {sections.map((sec, idx) => {
              const isEditing = editingId === sec.id;
              const isSelected = selectedIds.has(sec.id);
              const isHighConfidence = sec.confidence >= 80;

              return (
                <motion.div
                  key={sec.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                  transition={{
                    layout: { type: 'spring', stiffness: 350, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  onTouchStart={(e) => {
                    if (isEditing) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button, input, textarea, a, select')) {
                      return;
                    }
                    handleTouchStart(sec.id);
                  }}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`rounded-2xl border transition-all p-4 space-y-3 relative select-none ${
                    isSelected
                      ? 'bg-rose-50/70 border-[#FF385C] shadow-md ring-2 ring-rose-500/20'
                      : isEditing
                      ? 'bg-amber-50/50 border-amber-300 shadow-md ring-2 ring-amber-500/20'
                      : sec.needsReview
                      ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
                  }`}
                >
                  {/* Card Header: Selection Checkbox, Order Pill, Title, Confidence Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Select button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectSection(sec.id);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="mt-0.5 p-1 text-neutral-400 hover:text-neutral-900 cursor-pointer shrink-0 touch-manipulation"
                        title="Pilih bagian ini"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#FF385C]" />
                        ) : isSelectionMode ? (
                          <Square className="w-5 h-5 text-neutral-400" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-2xs">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              Nama Bagian
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 text-neutral-900"
                              placeholder="Nama bagian..."
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-sm font-bold text-neutral-900 break-words leading-snug">
                              {sec.title}
                            </h4>
                            {sec.detectedText && sec.detectedText !== sec.title && (
                              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                                "{sec.detectedText}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {sec.needsReview ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Perlu Cek
                        </span>
                      ) : sec.isCustom ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Kustom
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Otomatis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details: Range & Units */}
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2.5 pt-1 bg-white/80 p-2.5 rounded-xl border border-rose-200">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                          Halaman Awal
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editStartStr}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditStartStr(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-center bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                          Halaman Akhir
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editEndStr}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditEndStr(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-center bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                      <div className="flex items-center gap-1.5 text-neutral-700">
                        <span className="text-[11px] text-neutral-400 uppercase font-semibold">Rentang:</span>
                        <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs">
                          Halaman {sec.start} - {sec.end}
                        </span>
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        Total: <strong>{sec.count} Halaman</strong>
                      </div>
                    </div>
                  )}

                  {/* Card Action Controls: Preview, Reorder, Edit & Delete */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveOrder(sec.id, 'up');
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={idx === 0 || isEditing}
                        className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-neutral-700 hover:text-neutral-950 bg-neutral-100/90 hover:bg-neutral-200 active:bg-neutral-300 active:scale-90 rounded-xl border border-neutral-200/80 transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer touch-manipulation shadow-2xs"
                        title="Geser ke atas"
                        aria-label="Geser ke atas"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveOrder(sec.id, 'down');
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={idx === sections.length - 1 || isEditing}
                        className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-neutral-700 hover:text-neutral-950 bg-neutral-100/90 hover:bg-neutral-200 active:bg-neutral-300 active:scale-90 rounded-xl border border-neutral-200/80 transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer touch-manipulation shadow-2xs"
                        title="Geser ke bawah"
                        aria-label="Geser ke bawah"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Batal</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="btn-rausch px-3.5 py-1.5 text-white rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Dedicated Preview Button for this specific section */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPreview(idx);
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-blue-200 touch-manipulation"
                            title="Preview Bab ini"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(sec);
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs touch-manipulation"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(sec.id);
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs touch-manipulation"
                            title="Hapus bagian ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Card Footer Summary */}
        <div className="px-5 sm:px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <span>
            💡 Total <strong>{sections.length} berkas PDF terpisah</strong> akan dihasilkan setelah Anda mengonfirmasi.
          </span>
          <span className="font-semibold text-neutral-700 truncate max-w-xs">
            {metadata.fileName} ({metadata.totalUnits} Halaman)
          </span>
        </div>
      </div>

      {/* Primary Split Action Banner (Desktop / Tablet) */}
      <div className="bg-neutral-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-lg sm:text-xl font-bold">
            Siap Memisahkan Dokumen PDF?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300">
            Sistem akan memotong dokumen menjadi {sections.length} berkas PDF mandiri dalam hitungan detik.
          </p>
        </div>

        <button
          type="button"
          id="btn-confirm-split"
          onClick={onConfirmSplit}
          disabled={isSplitting || sections.length === 0}
          className="btn-rausch w-full md:w-auto px-8 py-4 text-white font-bold text-sm sm:text-base rounded-full shadow-lg shadow-rose-500/30 inline-flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          <Scissors className="w-5 h-5 -rotate-45" />
          <span>{isSplitting ? 'Memisahkan Dokumen...' : 'Konfirmasi & Split Dokumen'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Floating Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-neutral-500 truncate">Hasil Pemisahan</p>
          <p className="text-sm font-bold text-neutral-900">{sections.length} Bagian PDF</p>
        </div>
        <button
          type="button"
          onClick={onConfirmSplit}
          disabled={isSplitting || sections.length === 0}
          className="btn-rausch px-6 py-3 text-white font-bold text-xs rounded-full shadow-md shadow-rose-500/25 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Scissors className="w-4 h-4 -rotate-45" />
          <span>{isSplitting ? 'Memproses...' : 'Split Dokumen'}</span>
        </button>
      </div>

      {/* Add New Section Modal (Airbnb Sheet Aesthetic) with Framer Motion */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="bg-white rounded-3xl border border-neutral-200 w-full max-w-md shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h4 className="font-bold text-neutral-900 text-base">Tambah Bagian Kustom</h4>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewSection} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nama Bagian / Judul Bab
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Misal: BAB VI HASIL TAMBAHAN atau LAMPIRAN C"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 text-xs text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">
                      Halaman Awal
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newStartStr}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewStartStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-center font-bold text-xs text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">
                      Halaman Akhir
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newEndStr}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewEndStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-center font-bold text-xs text-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-rausch px-5 py-2 rounded-full text-white font-bold shadow-sm cursor-pointer"
                  >
                    Simpan Bagian
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Bulk Delete Recommendation Modal Pop-up (Triggered on 2 or 3 manual deletes) */}
      <AnimatePresence>
        {showBulkTip && !hasDismissedBulkTip && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl border border-neutral-200 w-full max-w-lg shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 text-neutral-900 relative"
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowBulkTip(false);
                  setHasDismissedBulkTip(true);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Tutup Pop-up"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with Icon Badge */}
              <div className="flex items-start gap-4 pr-6">
                <div className="w-12 h-12 rounded-2xl bg-[#FF385C] text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block mb-1">
                    💡 Tips Praktis
                  </span>
                  <h3 className="font-bold text-neutral-900 text-base sm:text-lg leading-snug">
                    Hapus Banyak Bab Sekaligus (Bulk Delete)
                  </h3>
                </div>
              </div>

              {/* Body Description & Visual Cards */}
              <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
                <p>
                  Terdeteksi Anda menghapus beberapa bab secara manual satu per satu. Anda dapat menghemat waktu dengan fitur <strong>Hapus Massal</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Card 1: Mobile Guide */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                      <Smartphone className="w-4 h-4 text-[#FF385C]" />
                      <span>Di Ponsel / Tablet</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      <strong>Tahan (<em>long-press</em>)</strong> kartu bab selama 0.5 detik untuk langsung memilih bab.
                    </p>
                  </div>

                  {/* Card 2: Desktop Guide */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                      <Monitor className="w-4 h-4 text-[#FF385C]" />
                      <span>Di Laptop / PC</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      <strong>Centang kotak pilihan</strong> di tabel untuk menandai dan menghapus bab sekaligus.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkTip(false);
                    setHasDismissedBulkTip(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-50 transition-colors cursor-pointer text-center"
                >
                  Mengerti, Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sections.length > 0) {
                      setSelectedIds(new Set([sections[0].id]));
                    }
                    setShowBulkTip(false);
                  }}
                  className="btn-rausch w-full sm:w-auto px-6 py-2.5 rounded-full text-white font-bold text-xs shadow-md shadow-rose-500/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Coba Hapus Massal Sekarang</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl border border-neutral-200 w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 text-neutral-900"
            >
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#FF385C] border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block mb-1">
                    Konfirmasi Hapus Massal
                  </span>
                  <h3 className="font-bold text-neutral-900 text-base sm:text-lg leading-snug">
                    Hapus {selectedIds.size} Bagian Terpilih?
                  </h3>
                </div>
              </div>

              {/* List of items to be deleted */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-600">
                  Bagian-bagian berikut akan dihapus dari daftar pemisahan dokumen:
                </p>
                <div className="max-h-40 overflow-y-auto airbnb-scrollbar space-y-1.5 p-2 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                  {sections
                    .filter((s) => selectedIds.has(s.id))
                    .map((sec) => (
                      <div
                        key={sec.id}
                        className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-neutral-200/60 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="font-semibold text-neutral-800 truncate">{sec.title}</span>
                        </div>
                        <span className="font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                          Hal. {sec.start}-{sec.end}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="text-[11px] text-neutral-500 italic">
                  * Berkas PDF asli Anda tidak akan rusak atau hilang.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus ({selectedIds.size})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Warning Dialog */}
      <AnimatePresence>
        {deleteWarningModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl border border-neutral-200 w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4 text-neutral-900"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base leading-snug">
                    {deleteWarningModal.title}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {deleteWarningModal.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setDeleteWarningModal(null)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-full cursor-pointer transition-colors shadow-xs"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
