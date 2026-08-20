/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FileUploader } from './components/FileUploader';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { DocumentStructure } from './components/DocumentStructure';
import { PdfPreview } from './components/PdfPreview';
import { DownloadPanel } from './components/DownloadPanel';
import { OnboardingTour } from './components/OnboardingTour';
import {
  DocumentMetadata,
  DocumentSection,
  DocType,
  AnalysisProgress,
  SplitResultItem,
} from './types';
import { parsePdfDocument, PdfParseResult } from './lib/pdf/pdfParser';
import { splitPdfDocument } from './lib/pdf/pdfSplitter';
import { generateSampleThesisPdf } from './lib/samples/sampleDocuments';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [stage, setStage] = useState<'upload' | 'analyzing' | 'structure' | 'download'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [originalSections, setOriginalSections] = useState<DocumentSection[]>([]);
  
  // Parsed PDF artifact
  const [pdfResult, setPdfResult] = useState<PdfParseResult | null>(null);

  // Analysis Progress
  const [progress, setProgress] = useState<AnalysisProgress>({
    stepName: 'Mempersiapkan dokumen PDF...',
    percent: 0,
    detail: 'Menunggu proses dimulai...',
    status: 'idle',
  });

  // Splitting state & results
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<SplitResultItem[]>([]);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSectionIdx, setPreviewSectionIdx] = useState<number | undefined>(undefined);

  // Tour state
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  // Check if tour should auto-start on first load
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('splitskripsi_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setTourRunning(true);
        setTourStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartTour = () => {
    setTourRunning(false);
    setTimeout(() => {
      setTourStepIndex(0);
      setTourRunning(true);
    }, 50);
  };

  const handleTourEnd = () => {
    setTourRunning(false);
    setTourStepIndex(0);
    localStorage.setItem('splitskripsi_tour_seen', 'true');
  };

  // Handle file selection from uploader
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  // Load sample PDF
  const handleLoadSamplePdf = async () => {
    try {
      setProgress({
        stepName: 'Menyiapkan Contoh Skripsi PDF...',
        percent: 15,
        detail: 'Membuat dokumen simulasi PDF 13 halaman...',
        status: 'running',
      });
      setStage('analyzing');

      const sample = await generateSampleThesisPdf();
      const file = new File([sample.buffer.slice(0)], sample.filename, { type: 'application/pdf' });
      setSelectedFile(file);
      setFileBuffer(sample.buffer.slice(0));

      await runAnalysis(sample.buffer.slice(0), sample.filename);
    } catch (err: any) {
      console.error('Failed to load sample PDF:', err);
      alert('Gagal memuat contoh PDF: ' + err.message);
      setStage('upload');
    }
  };

  // Start analysis on selected user file
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setStage('analyzing');
    setProgress({
      stepName: 'Membaca file PDF...',
      percent: 5,
      detail: 'Mempersiapkan array buffer...',
      status: 'running',
    });

    try {
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer.slice(0));
      await runAnalysis(buffer.slice(0), selectedFile.name);
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert('Terjadi kesalahan saat menganalisis file PDF: ' + err.message);
      setStage('upload');
    }
  };

  // Core analysis runner for PDF
  const runAnalysis = async (buffer: ArrayBuffer, fileName: string) => {
    try {
      const result = await parsePdfDocument(buffer.slice(0), fileName, (percent, msg) => {
        setProgress({
          stepName: msg,
          percent,
          detail: `Memproses ${percent}%...`,
          status: 'running',
        });
      });

      setPdfResult(result);
      setMetadata(result.metadata);
      setSections(result.sections);
      setOriginalSections(result.sections);

      // Small delay for smooth UI transition
      setTimeout(() => {
        setStage('structure');
      }, 400);
    } catch (err: any) {
      console.error('Run analysis failed:', err);
      alert('Gagal memproses file PDF: ' + err.message);
      setStage('upload');
    }
  };

  // Split Confirmation Action
  const handleConfirmSplit = async () => {
    if (!metadata || sections.length === 0) return;

    setIsSplitting(true);
    try {
      let results: SplitResultItem[] = [];

      // Acquire an intact, non-detached ArrayBuffer
      let currentBuffer: ArrayBuffer | null = null;
      if (selectedFile) {
        currentBuffer = await selectedFile.arrayBuffer();
      } else if (fileBuffer && fileBuffer.byteLength > 0) {
        currentBuffer = fileBuffer.slice(0);
      }

      if (!currentBuffer || currentBuffer.byteLength === 0) {
        throw new Error('Buffer file PDF tidak ditemukan atau telah kedaluwarsa. Silakan upload ulang dokumen.');
      }

      results = await splitPdfDocument(currentBuffer, sections, metadata.fileName);

      setSplitResults(results);
      setStage('download');
    } catch (err: any) {
      console.error('Error during split:', err);
      alert('Terjadi kesalahan saat memisahkan dokumen PDF: ' + err.message);
    } finally {
      setIsSplitting(false);
    }
  };

  // Reset to original automatic detection
  const handleResetDetection = () => {
    setSections([...originalSections]);
  };

  // Full reset back to upload screen
  const handleResetAll = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setMetadata(null);
    setSections([]);
    setOriginalSections([]);
    setPdfResult(null);
    setSplitResults([]);
    setStage('upload');
  };

  const handleOpenPreview = (sectionIndex?: number) => {
    setPreviewSectionIdx(sectionIndex);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-900">
      {/* Top Navbar */}
      <Navbar
        onLoadSamplePdf={handleLoadSamplePdf}
        onStartTour={handleStartTour}
        isProcessing={stage === 'analyzing' || isSplitting}
      />

      {/* Interactive Onboarding Tour */}
      <OnboardingTour
        run={tourRunning}
        stepIndex={tourStepIndex}
        onTourEnd={handleTourEnd}
        onStepChange={setTourStepIndex}
        currentStage={stage}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 pt-20 sm:pt-24 pb-12">
        {stage === 'upload' && (
          <FileUploader
            selectedFile={selectedFile}
            onFileSelected={handleFileSelected}
            onStartAnalysis={handleStartAnalysis}
            onLoadSamplePdf={handleLoadSamplePdf}
            isAnalyzing={false}
          />
        )}

        {stage === 'analyzing' && (
          <DocumentAnalyzer
            progress={progress}
            fileName={selectedFile?.name || 'Dokumen Skripsi PDF'}
          />
        )}

        {stage === 'structure' && metadata && (
          <DocumentStructure
            metadata={metadata}
            sections={sections}
            onUpdateSections={setSections}
            onConfirmSplit={handleConfirmSplit}
            onOpenPreview={handleOpenPreview}
            onResetDetection={handleResetDetection}
            onBackToUpload={handleResetAll}
            isSplitting={isSplitting}
          />
        )}

        {stage === 'download' && metadata && (
          <DownloadPanel
            results={splitResults}
            metadata={metadata}
            onResetAll={handleResetAll}
          />
        )}
      </main>

      {/* Interactive PDF Preview Modal */}
      {previewOpen && pdfResult && (
        <PdfPreview
          pdfDocProxy={pdfResult.pdfDocProxy}
          pages={pdfResult.pages}
          sections={sections}
          initialPage={
            previewSectionIdx !== undefined && sections[previewSectionIdx]
              ? sections[previewSectionIdx].start
              : 1
          }
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Global Airbnb-style Footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-[#F7F7F7] py-8 text-xs text-neutral-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
            <span className="font-latin text-lg font-bold text-neutral-900">© 2026 SplitSkripsi</span>
            <span>·</span>
            <span className="text-neutral-500">Pemisah Dokumen PDF Skripsi, Tesis, & Laporan Akademik</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-neutral-500">100% Client-Side Privacy</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-neutral-700">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Privacy Lokal</span>
            </span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600">PDF (.pdf)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
