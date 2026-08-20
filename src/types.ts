export type DocType = 'pdf';

export interface DocumentSection {
  id: string;
  order: number;
  title: string;
  normalizedKey: string;
  start: number; // 1-based page number for PDF
  end: number;
  count: number;
  confidence: number; // 0 - 100
  isTocReference?: boolean;
  needsReview?: boolean;
  detectedText?: string;
  snippet?: string;
  styleName?: string;
  isCustom?: boolean;
  notes?: string;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  lines: string[];
  hasImages: boolean;
  charCount: number;
}

export interface ExtractedParagraph {
  index: number;
  text: string;
  style?: string;
  isHeading?: boolean;
  headingLevel?: number;
  isBold?: boolean;
  fontSize?: number;
  isCentered?: boolean;
  hasPageBreakBefore?: boolean;
  hasSectionBreak?: boolean;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: DocType;
  totalUnits: number; // total pages for PDF
  unitName: 'Halaman';
  isScannedPdf?: boolean;
  hasHeadings?: boolean;
  estimatedDocType?: string; // 'Skripsi' | 'Tesis' | 'Laporan Magang' | 'Laporan Tugas Akhir' | 'Dokumen Akademik'
  studentName?: string;
  studentNim?: string;
}

export interface AnalysisProgress {
  stepName: string;
  percent: number;
  detail: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export interface SplitResultItem {
  id: string;
  title: string;
  filename: string;
  blob: Blob;
  url: string;
  size: number;
  rangeText: string;
}

export interface SplittingProgress {
  currentSection: number;
  totalSections: number;
  sectionTitle: string;
  percent: number;
  isDone: boolean;
}
