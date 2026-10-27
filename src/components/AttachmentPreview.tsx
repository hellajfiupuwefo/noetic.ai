import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Layers, 
  AlertCircle,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { DeckAttachment } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Helper to sanitize base64 strings
function cleanBase64Str(str: string): string {
  if (!str) return '';
  const idx = str.indexOf(',');
  const raw = idx !== -1 ? str.slice(idx + 1) : str;
  return raw.replace(/[^A-Za-z0-9+/=]/g, '');
}

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !(pdfjsLib as any).GlobalWorkerOptions?.workerSrc) {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

interface AttachmentPreviewProps {
  attachment: DeckAttachment;
  onClose?: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // PDF state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfScale, setPdfScale] = useState<number>(1.2);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Load and parse content based on type
  useEffect(() => {
    let isCancelled = false;

    async function loadContent() {
      setIsLoadingText(true);
      setPdfError(null);

      try {
        const cleaned = cleanBase64Str(attachment.base64);

        if (attachment.previewType === 'pdf') {
          // Initialize PDF rendering
          const binaryStr = atob(cleaned);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            useSystemFonts: true
          });

          const pdf = await loadingTask.promise;
          if (isCancelled) return;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(1);

          // Also extract text for text view tab
          const textPieces: string[] = [];
          const maxExtract = Math.min(pdf.numPages, 10);
          for (let i = 1; i <= maxExtract; i++) {
            const page = await pdf.getPage(i);
            const textResult = await page.getTextContent();
            const pageStr = textResult.items
              .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
              .join(' ');
            if (pageStr.trim()) {
              textPieces.push(`=== PAGE ${i} ===\n${pageStr}`);
            }
          }
          if (!isCancelled) {
            setTextContent(textPieces.join('\n\n') || 'No selectable text found in this PDF.');
          }
        } else if (attachment.previewType === 'doc') {
          // Parse DOCX via Mammoth
          const binaryStr = atob(cleaned);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const res = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
          if (!isCancelled) {
            setTextContent(res.value.trim() || 'Document appears empty.');
          }
        } else if (attachment.previewType === 'text') {
          // Plain text / markdown / code
          const decoded = decodeURIComponent(
            escape(atob(cleaned))
          );
          if (!isCancelled) {
            setTextContent(decoded);
          }
        }
      } catch (err: any) {
        console.warn('Preview parse error:', err);
        // Fallback simple base64 decode if UTF-8 escape fails
        try {
          const raw = atob(cleanBase64Str(attachment.base64));
          if (!isCancelled) setTextContent(raw.slice(0, 50000));
        } catch {
          if (!isCancelled) setPdfError('Native preview rendered below.');
        }
      } finally {
        if (!isCancelled) setIsLoadingText(false);
      }
    }

    loadContent();

    return () => {
      isCancelled = true;
    };
  }, [attachment]);

  // Render PDF page to canvas whenever currentPage or pdfScale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || activeTab !== 'visual') return;
    let isCancelled = false;

    async function renderPage() {
      setIsRenderingPage(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        console.warn('PDF page render error:', err);
        if (!isCancelled) {
          setPdfError('Canvas render issue; switching to extracted text view.');
          setActiveTab('text');
        }
      } finally {
        if (!isCancelled) setIsRenderingPage(false);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, pdfScale, activeTab]);

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = attachment.dataUrl || `data:${attachment.mimeType};base64,${attachment.base64}`;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t theme-border animate-fadeIn">
      {/* Top Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-indigo-500/5 p-2.5 rounded-xl border border-indigo-500/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold theme-text-primary break-all">
            {attachment.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
            {attachment.mimeType}
          </span>
        </div>

        {/* View Mode Tabs (for PDF & DOC) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {attachment.previewType === 'pdf' && (
            <div className="inline-flex rounded-lg border theme-border overflow-hidden bg-surface text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  activeTab === 'visual'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'theme-text-muted hover:theme-text-primary'
                }`}
              >
                Visual Page View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'theme-text-muted hover:theme-text-primary'
                }`}
              >
                Extracted Text
              </button>
            </div>
          )}

          {/* Action buttons */}
          <button
            type="button"
            onClick={handleCopyText}
            disabled={!textContent}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg theme-bg-surface theme-border border hover:theme-bg-hover text-xs font-medium theme-text-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Copy extracted document text"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{copySuccess ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg theme-bg-surface theme-border border hover:theme-bg-hover text-xs font-medium theme-text-primary transition-colors cursor-pointer"
            title="Download original file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="rounded-xl overflow-hidden border theme-border theme-bg-elevated shadow-inner">
        {/* 1. PDF Visual Mode */}
        {attachment.previewType === 'pdf' && activeTab === 'visual' && (
          <div className="flex flex-col items-center justify-center p-3 bg-slate-900/60 min-h-[360px]">
            {/* Page Navigation & Zoom Bar */}
            {numPages > 0 && (
              <div className="flex items-center justify-between w-full max-w-lg mb-3 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 shadow">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isRenderingPage}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] px-2">
                    Page {currentPage} of {numPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= numPages || isRenderingPage}
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfScale(s => Math.max(0.6, s - 0.2))}
                    className="p-1 rounded hover:bg-slate-700 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px]">{Math.round(pdfScale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))}
                    className="p-1 rounded hover:bg-slate-700 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Canvas Viewer */}
            <div className="relative max-h-[500px] overflow-auto rounded-lg shadow-2xl bg-white border border-slate-600 flex items-center justify-center">
              {isRenderingPage && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center text-xs text-white z-10">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Rendering Page {currentPage}...
                </div>
              )}
              <canvas ref={canvasRef} className="max-w-full block" />
            </div>

            {pdfError && (
              <div className="w-full mt-2">
                <div className="mb-2 text-xs text-indigo-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-indigo-400" />
                  <span>Viewing via native document reader:</span>
                </div>
                <iframe
                  src={attachment.dataUrl || `data:application/pdf;base64,${cleanBase64Str(attachment.base64)}`}
                  className="w-full h-[480px] rounded-lg border border-slate-700 bg-white shadow-xl"
                  title={attachment.name}
                />
              </div>
            )}
          </div>
        )}

        {/* 2. Text / Extracted Text View (for PDF text tab, DOCX, or TXT/MD) */}
        {(activeTab === 'text' || attachment.previewType === 'doc' || attachment.previewType === 'text') && (
          <div className="p-4 bg-slate-950/70 text-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-3">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {attachment.previewType === 'doc' 
                    ? 'Microsoft Word Document Content' 
                    : attachment.previewType === 'pdf'
                    ? 'Extracted PDF Text Transcript'
                    : 'Plain Text & Code Document'}
                </span>
              </span>
              <span className="font-mono text-[11px]">
                {textContent ? `${textContent.split(/\s+/).filter(Boolean).length} words · ${textContent.length} characters` : 'Reading...'}
              </span>
            </div>

            {isLoadingText ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-indigo-300">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Extracting document text and sections...</span>
              </div>
            ) : textContent ? (
              <pre className="text-xs font-mono leading-relaxed max-h-[420px] overflow-y-auto whitespace-pre-wrap select-text p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                {textContent}
              </pre>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No textual content could be previewed from this attachment.
              </div>
            )}
          </div>
        )}

        {/* 3. Image View */}
        {attachment.previewType === 'image' && (
          <div className="p-4 bg-slate-950/70 flex flex-col items-center justify-center">
            <img
              src={attachment.dataUrl || `data:${attachment.mimeType};base64,${attachment.base64}`}
              alt={attachment.name}
              className="max-h-[480px] max-w-full object-contain rounded-lg shadow-xl border border-slate-700"
            />
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              Direct high-resolution image asset ready for multimodal AI processing
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
