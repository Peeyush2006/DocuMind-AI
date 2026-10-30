import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Type,
  Link2,
  FileSignature,
  Image as ImageIcon,
  Eraser,
  PenLine,
  Square,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Bold,
  Italic,
  Download,
  Upload,
  Sparkles,
  MousePointer,
  HelpCircle,
  ExternalLink,
  Circle,
  Minus,
  CheckSquare
} from 'lucide-react';
import { api, backendFetch, backendUrl } from '../../api/client';

interface TextSpan {
  id: string;
  page_index: number;
  text: string;
  original_text: string;
  font_name: string;
  font_family: string;
  font_size: number;
  is_bold: boolean;
  is_italic: boolean;
  color: string;
  bg_color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  origin_x: number;
  origin_y: number;
  pt_bbox: number[];
  pt_origin: number[];
}

interface CustomAnnotation {
  id: string;
  type:
    | 'text'
    | 'signature'
    | 'whiteout'
    | 'highlight'
    | 'underline'
    | 'strikeout'
    | 'link'
    | 'form_field'
    | 'shape'
    | 'image'
    | 'text_replacement';
  page_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  font_name?: string;
  font_size?: number;
  is_bold?: boolean;
  is_italic?: boolean;
  color?: string;
  bg_color?: string;
  image_base64?: string;
  url?: string;
  field_type?: 'checkbox' | 'radio' | 'text';
  checked?: boolean;
  value?: string;
  shape_type?: 'rectangle' | 'circle' | 'line';
  stroke_color?: string;
  fill_color?: string;
  stroke_width?: number;
  pt_bbox?: number[];
  pt_origin?: number[];
}

interface VisualPdfEditorProps {
  onClose: () => void;
}

export const VisualPdfEditor: React.FC<VisualPdfEditorProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<any | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);

  // Active floating tool in top bar
  const [activeTool, setActiveTool] = useState<
    'text' | 'links' | 'forms' | 'images' | 'sign' | 'whiteout' | 'annotate' | 'shapes'
  >('text');

  // Sub-tool options and dropdowns
  const [openDropdown, setOpenDropdown] = useState<'forms' | 'images' | 'sign' | 'annotate' | 'shapes' | null>(null);
  const [formSubtype, setFormSubtype] = useState<'checkbox' | 'radio' | 'text'>('checkbox');
  const [annotateSubtype, setAnnotateSubtype] = useState<'highlight' | 'underline' | 'strikeout'>('highlight');
  const [shapeSubtype, setShapeSubtype] = useState<'rectangle' | 'circle' | 'line'>('rectangle');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [pendingLinkCoords, setPendingLinkCoords] = useState<{ x: number; y: number } | null>(null);
  const [linkUrlInput, setLinkUrlInput] = useState('https://');
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Text spans extracted from document
  const [spansByPage, setSpansByPage] = useState<{ [page: number]: TextSpan[] }>({});
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);

  // Custom annotations (signatures, whiteouts, highlights, additions)
  const [annotations, setAnnotations] = useState<CustomAnnotation[]>([]);
  const [selectedAnnotId, setSelectedAnnotId] = useState<string | null>(null);

  // Undo stack
  const [undoHistory, setUndoHistory] = useState<{ spans: { [page: number]: TextSpan[] }; annots: CustomAnnotation[] }[]>([]);

  // Signature modal state
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw');
  const [typedSig, setTypedSig] = useState('');
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Saving & Download state
  const [saving, setSaving] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ download_url: string; filename: string } | null>(null);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [pageScale, setPageScale] = useState<number>(1);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 639px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const updateViewport = () => setIsMobileViewport(media.matches);
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  // Load PDF file into editor
  const loadPdf = async (f: File) => {
    try {
      setLoading(true);
      setFile(f);
      const meta = await api.renderPdfPages(f);
      setPdfMeta(meta);
      setCurrentPageIndex(0);

      // Group detected spans by page
      const grouped: { [page: number]: TextSpan[] } = {};
      meta.pages.forEach((p) => {
        grouped[p.page_index] = p.spans || [];
      });
      setSpansByPage(grouped);
      setAnnotations([]);
      setActiveSpanId(null);
      setUndoHistory([]);
    } catch (err) {
      console.error(err);
      alert('Failed to load PDF. Please ensure it is a valid PDF file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.name.endsWith('.pdf')) {
        await loadPdf(f);
      } else {
        try {
          setLoading(true);
          const converted = await api.imagesToPdf([f]);
          const res = await backendFetch(converted.download_url);
          const blob = await res.blob();
          const pdfFile = new File([blob], `${f.name.replace(/\.[^/.]+$/, '')}.pdf`, { type: 'application/pdf' });
          await loadPdf(pdfFile);
        } catch (err) {
          console.error(err);
          alert('Failed to convert image to PDF');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Pre-load sample invoice into editor
  const loadSampleInvoice = async () => {
    try {
      setLoading(true);
      const resPdf = await backendFetch(backendUrl('/storage/samples/sample_tax_invoice.pdf'));
      if (resPdf.ok) {
        const pdfBlob = await resPdf.blob();
        const pdfFile = new File([pdfBlob], 'sample_tax_invoice.pdf', { type: 'application/pdf' });
        await loadPdf(pdfFile);
        return;
      }
      const res = await backendFetch(backendUrl('/storage/samples/sample_tax_invoice.png'));
      const blob = await res.blob();
      const sampleImg = new File([blob], 'sample_tax_invoice.png', { type: 'image/png' });
      const converted = await api.imagesToPdf([sampleImg]);
      const resConverted = await backendFetch(converted.download_url);
      const pdfBlob = await resConverted.blob();
      const pdfFile = new File([pdfBlob], 'sample_tax_invoice.pdf', { type: 'application/pdf' });
      await loadPdf(pdfFile);
    } catch (e) {
      console.error(e);
      alert('Failed to load sample invoice');
    } finally {
      setLoading(false);
    }
  };

  // Push current state to undo history before modifying
  const pushUndo = () => {
    setUndoHistory((prev) => [
      ...prev.slice(-15),
      {
        spans: JSON.parse(JSON.stringify(spansByPage)),
        annots: JSON.parse(JSON.stringify(annotations))
      }
    ]);
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setSpansByPage(previous.spans);
    setAnnotations(previous.annots);
    setUndoHistory((prev) => prev.slice(0, -1));
    setActiveSpanId(null);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageContainerRef.current) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (activeTool === 'links') {
      setPendingLinkCoords({ x, y });
      setLinkUrlInput('https://');
      setLinkModalOpen(true);
    } else if (activeTool === 'forms') {
      pushUndo();
      const newAnnot: CustomAnnotation = {
        id: `form_${Date.now()}`,
        type: 'form_field',
        field_type: formSubtype,
        page_index: currentPageIndex,
        x,
        y,
        width: formSubtype === 'text' ? 0.22 : 0.04,
        height: 0.035,
        checked: false,
        value: formSubtype === 'text' ? '' : undefined
      };
      setAnnotations((prev) => [...prev, newAnnot]);
      setSelectedAnnotId(newAnnot.id);
    } else if (activeTool === 'shapes') {
      pushUndo();
      const newAnnot: CustomAnnotation = {
        id: `shape_${Date.now()}`,
        type: 'shape',
        shape_type: shapeSubtype,
        page_index: currentPageIndex,
        x,
        y,
        width: shapeSubtype === 'line' ? 0.25 : 0.18,
        height: shapeSubtype === 'line' ? 0.006 : 0.10,
        stroke_color: '#000000',
        fill_color: shapeSubtype === 'rectangle' ? '#ffffff' : undefined,
        stroke_width: 2
      };
      setAnnotations((prev) => [...prev, newAnnot]);
      setSelectedAnnotId(newAnnot.id);
    } else if (activeTool === 'annotate') {
      pushUndo();
      const newAnnot: CustomAnnotation = {
        id: `annot_${Date.now()}`,
        type: annotateSubtype,
        page_index: currentPageIndex,
        x,
        y,
        width: 0.28,
        height: annotateSubtype === 'highlight' ? 0.028 : 0.008,
        color: annotateSubtype === 'highlight' ? '#fef08a' : (annotateSubtype === 'strikeout' ? '#ef4444' : '#2563eb')
      };
      setAnnotations((prev) => [...prev, newAnnot]);
      setSelectedAnnotId(newAnnot.id);
    } else if (activeTool === 'whiteout') {
      pushUndo();
      const newAnnot: CustomAnnotation = {
        id: `annot_${Date.now()}`,
        type: 'whiteout',
        page_index: currentPageIndex,
        x,
        y,
        width: 0.20,
        height: 0.035,
        color: '#ffffff'
      };
      setAnnotations((prev) => [...prev, newAnnot]);
      setSelectedAnnotId(newAnnot.id);
    } else if (activeTool === 'text') {
      setActiveSpanId(null);
    }
  };

  const confirmCreateLink = () => {
    if (!pendingLinkCoords || !linkUrlInput.trim()) {
      setLinkModalOpen(false);
      return;
    }
    pushUndo();
    const newAnnot: CustomAnnotation = {
      id: `link_${Date.now()}`,
      type: 'link',
      url: linkUrlInput.trim(),
      page_index: currentPageIndex,
      x: pendingLinkCoords.x,
      y: pendingLinkCoords.y,
      width: 0.22,
      height: 0.035
    };
    setAnnotations((prev) => [...prev, newAnnot]);
    setSelectedAnnotId(newAnnot.id);
    setLinkModalOpen(false);
    setPendingLinkCoords(null);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      pushUndo();
      const newAnnot: CustomAnnotation = {
        id: `img_${Date.now()}`,
        type: 'image',
        page_index: currentPageIndex,
        x: 0.35,
        y: 0.35,
        width: 0.25,
        height: 0.15,
        image_base64: base64
      };
      setAnnotations((prev) => [...prev, newAnnot]);
      setSelectedAnnotId(newAnnot.id);
    };
    reader.readAsDataURL(imgFile);
    e.target.value = '';
  };

  // In-place text span update
  const updateSpanText = (spanId: string, newText: string) => {
    setSpansByPage((prev) => {
      const currentPageSpans = prev[currentPageIndex] || [];
      return {
        ...prev,
        [currentPageIndex]: currentPageSpans.map((s) =>
          s.id === spanId ? { ...s, text: newText } : s
        )
      };
    });
  };

  const updateSpanStyle = (spanId: string, styleUpdates: Partial<TextSpan>) => {
    pushUndo();
    setSpansByPage((prev) => {
      const currentPageSpans = prev[currentPageIndex] || [];
      return {
        ...prev,
        [currentPageIndex]: currentPageSpans.map((s) =>
          s.id === spanId ? { ...s, ...styleUpdates } : s
        )
      };
    });
  };

  // Clear all text from document while preserving template design
  const clearWholeDocument = () => {
    pushUndo();
    setSpansByPage((prev) => {
      const updated: { [page: number]: TextSpan[] } = {};
      Object.entries(prev).forEach(([pStr, pageSpans]) => {
        const p = parseInt(pStr);
        updated[p] = pageSpans.map((s) => ({
          ...s,
          text: ''
        }));
      });
      return updated;
    });
    setActiveSpanId(null);
  };

  // Restore original document text
  const restoreOriginalText = () => {
    pushUndo();
    setSpansByPage((prev) => {
      const updated: { [page: number]: TextSpan[] } = {};
      Object.entries(prev).forEach(([pStr, pageSpans]) => {
        const p = parseInt(pStr);
        updated[p] = pageSpans.map((s) => ({
          ...s,
          text: s.original_text
        }));
      });
      return updated;
    });
    setActiveSpanId(null);
  };

  const clearActiveField = () => {
    if (activeSpanId) {
      pushUndo();
      updateSpanText(activeSpanId, '');
    }
  };

  // Signature canvas handlers
  const startDrawingSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingSig = () => setIsDrawing(false);

  const stampSignature = () => {
    pushUndo();
    let sigBase64 = '';
    if (sigMode === 'draw') {
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      sigBase64 = canvas.toDataURL('image/png');
    } else {
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 150;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 38px "Brush Script MT", cursive, sans-serif';
        ctx.fillStyle = '#1e3a8a';
        ctx.fillText(typedSig || 'Signature', 30, 90);
        sigBase64 = c.toDataURL('image/png');
      }
    }

    const newAnnot: CustomAnnotation = {
      id: `sig_${Date.now()}`,
      type: 'signature',
      page_index: currentPageIndex,
      x: 0.35,
      y: 0.40,
      width: 0.22,
      height: 0.08,
      image_base64: sigBase64
    };
    setAnnotations((prev) => [...prev, newAnnot]);
    setSelectedAnnotId(newAnnot.id);
    setShowSigModal(false);
  };

  // Apply Changes & Burn into PDF
  const handleApplyChanges = async () => {
    if (!file) return;
    try {
      setSaving(true);
      const replacementAnnotations: CustomAnnotation[] = [];
      Object.entries(spansByPage).forEach(([pIdxStr, spans]) => {
        const pIdx = parseInt(pIdxStr);
        spans.forEach((s) => {
          if (s.text !== s.original_text) {
            replacementAnnotations.push({
              id: `rep_${s.id}`,
              type: 'text_replacement',
              page_index: pIdx,
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
              text: s.text,
              font_name: s.font_name,
              font_size: s.font_size,
              is_bold: s.is_bold,
              is_italic: s.is_italic,
              color: s.color,
              bg_color: s.bg_color || '#ffffff',
              pt_bbox: s.pt_bbox,
              pt_origin: s.pt_origin
            });
          }
        });
      });

      const allAnnotationsToApply = [...replacementAnnotations, ...annotations];
      const res = await api.editSavePdf(file, allAnnotationsToApply);
      setDownloadResult(res);
    } catch (e) {
      console.error(e);
      alert('Failed to save edited PDF');
    } finally {
      setSaving(false);
    }
  };

  const currentPage = pdfMeta?.pages[currentPageIndex];
  const currentSpans = spansByPage[currentPageIndex] || [];
  const currentAnnotations = annotations.filter((a) => a.page_index === currentPageIndex);
  const activeSpan = currentSpans.find((s) => s.id === activeSpanId);

  // Compute scale from PDF points to rendered CSS pixels
  const updatePageScale = () => {
    if (imgRef.current && currentPage && currentPage.height > 0) {
      const renderedH = imgRef.current.clientHeight;
      if (renderedH > 0) {
        setPageScale(renderedH / currentPage.height);
      }
    }
  };

  useEffect(() => {
    updatePageScale();
    if (imgRef.current?.complete) {
      updatePageScale();
    }
    const handleResize = () => updatePageScale();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (imgRef.current) {
      ro = new ResizeObserver(() => updatePageScale());
      ro.observe(imgRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [currentPageIndex, pdfMeta, currentPage]);

  const getVisualFontSize = (ptSize: number) => {
    let scale = pageScale;
    if (scale <= 0 || scale === 1) {
      if (currentPage && currentPage.height > 0) {
        scale = (window.innerHeight * 0.78) / currentPage.height;
      }
    }
    const px = ptSize * scale;
    return Math.max(1, Math.round(px * 100) / 100);
  };

  // -------------------------------------------------------------
  // LANDING VIEW (Matches Screenshot 2 when no PDF is loaded yet)
  // -------------------------------------------------------------
  if (!pdfMeta) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto font-sans text-slate-800">
        {/* Top Navbar */}
        <header className="min-h-14 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onClose}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00a651] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900">DocMind AI</span>
            </div>
            <div className="hidden md:flex items-center gap-5 text-sm text-slate-600 font-medium">
              <span className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
                All Tools <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <span className="hover:text-slate-900 cursor-pointer">Compress</span>
              <span className="text-[#00a651] font-semibold cursor-pointer">Edit</span>
              <span className="hover:text-slate-900 cursor-pointer">Fill & Sign</span>
              <span className="hover:text-slate-900 cursor-pointer">Merge</span>
              <span className="hover:text-slate-900 cursor-pointer">Delete Pages</span>
              <span className="hover:text-slate-900 cursor-pointer">Crop</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 text-center max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              Online PDF editor
              <span className="text-[11px] font-bold px-1.5 py-0.5 border border-slate-300 rounded text-slate-500 uppercase tracking-wider align-top">
                BETA
              </span>
            </h1>
            <p className="mt-2 text-base text-slate-500 font-normal">
              Edit PDF files for free. Fill & sign PDF
            </p>
          </div>

          {/* Upload Button */}
          <div className="flex flex-col items-center gap-3">
            <label className="inline-flex w-full sm:w-auto justify-center items-center gap-3 rounded-md bg-[#00a651] hover:bg-[#008f45] px-5 sm:px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm cursor-pointer transition-all active:scale-98">
              <FileText className="h-5 w-5" />
              <span>{loading ? 'Processing document...' : 'Upload PDF file'}</span>
              <ChevronDown className="h-4 w-4 opacity-80" />
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={loadSampleInvoice}
                disabled={loading}
                className="text-[#00a651] hover:underline font-medium"
              >
                or test with Sample Tax Invoice (instant interactive demo)
              </button>
            </div>
          </div>

          {/* Privacy & Quota Disclaimers */}
          <div className="mt-8 text-xs text-slate-500 leading-relaxed max-w-md">
            <p>Files stay private. Automatically deleted after 2 hours.</p>
            <p className="mt-0.5">Free service for documents up to 200 pages or 50 MB and 3 tasks per hour.</p>
            <div className="mt-2 text-[11px] text-slate-400">
              <span className="hover:underline cursor-pointer">Terms of Use</span> and{' '}
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
            </div>
          </div>

          {/* Desktop Offline Promotion Banner */}
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-xs text-slate-600 shadow-2xs">
            <span className="rounded bg-[#00a651] px-1.5 py-0.2 text-[10px] font-bold text-white uppercase tracking-wider">
              Offline
            </span>
            <span>Rather work offline? Try DocMind AI Desktop</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Guide Section */}
          <div className="mt-14 max-w-2xl border-t border-slate-100 pt-10 text-center">
            <h2 className="text-xl font-bold text-slate-800">
              How To Edit PDF Files Online For Free
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Edit & Sign PDF files online for free. Fill out PDF forms online. Change PDF text. Add text to PDF. Edit existing PDF text in the exact original font. Add image to PDF. Create links in PDF. Edit hyperlinks in PDF. Annotate PDF.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE WORKSPACE VIEW (Matches Screenshot 3 & 4)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#edf2f7] text-slate-800 font-sans select-none overflow-hidden">
      {/* 1. TOP HEADER BAR */}
      <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00a651] text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">DocMind AI</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
              {pdfMeta.filename}
            </span>
            <span className="text-[11px] text-slate-400">
              ({pdfMeta.total_pages} {pdfMeta.total_pages === 1 ? 'page' : 'pages'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Whole Document (Keep Design) */}
          <button
            onClick={clearWholeDocument}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
            title="Clears all text fields while 100% preserving lines, tables, borders, and document design"
          >
            <Eraser className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Clear Document (Keep Design)</span>
            <span className="md:hidden">Clear</span>
          </button>

          {/* Restore Original Text */}
          <button
            onClick={restoreOriginalText}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Restore original text"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Restore</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ml-1"
            title="Exit editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. FLOATING TOP TOOLBAR (Centered Pill as in Screenshot 3 & 4) */}
      <div className="py-2 flex flex-col items-center justify-center shrink-0 z-30">
        <div className="no-scrollbar max-w-full overflow-x-auto bg-white border border-slate-300/80 rounded-md shadow-xs px-1.5 py-1 flex w-max items-center gap-0.5 text-xs text-slate-700 font-medium">
          {/* Text Tool */}
          <button
            onClick={() => {
              setActiveTool('text');
              setSelectedAnnotId(null);
              setOpenDropdown(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'text'
                ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Click any text in the document to edit in place"
          >
            <Type className="h-3.5 w-3.5 text-[#1a73e8]" />
            <span>Text</span>
          </button>

          {/* Links */}
          <button
            onClick={() => {
              setActiveTool('links');
              setOpenDropdown(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'links'
                ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Click anywhere on document to add link"
          >
            <Link2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Links</span>
          </button>

          {/* Forms */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveTool('forms');
                setOpenDropdown(openDropdown === 'forms' ? null : 'forms');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                activeTool === 'forms'
                  ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
              <span>Forms</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>
            {openDropdown === 'forms' && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setActiveTool('forms');
                    setFormSubtype('checkbox');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    formSubtype === 'checkbox' && activeTool === 'forms' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
                  <span>Checkbox</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('forms');
                    setFormSubtype('radio');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    formSubtype === 'radio' && activeTool === 'forms' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Circle className="h-3.5 w-3.5 text-slate-500" />
                  <span>Radio Button</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('forms');
                    setFormSubtype('text');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    formSubtype === 'text' && activeTool === 'forms' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Type className="h-3.5 w-3.5 text-slate-500" />
                  <span>Text Field</span>
                </button>
              </div>
            )}
          </div>

          {/* Images */}
          <button
            onClick={() => {
              setActiveTool('images');
              setOpenDropdown(null);
              imageFileInputRef.current?.click();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'images'
                ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Upload and place image"
          >
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
            <span>Images</span>
            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
          </button>

          {/* Sign */}
          <button
            onClick={() => {
              setActiveTool('sign');
              setOpenDropdown(null);
              setShowSigModal(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'sign'
                ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Create or insert signature"
          >
            <FileSignature className="h-3.5 w-3.5 text-slate-500" />
            <span>Sign</span>
            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
          </button>

          {/* Whiteout */}
          <button
            onClick={() => {
              setActiveTool('whiteout');
              setOpenDropdown(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'whiteout'
                ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Click to place whiteout block"
          >
            <Eraser className="h-3.5 w-3.5 text-slate-500" />
            <span>Whiteout</span>
          </button>

          {/* Annotate */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveTool('annotate');
                setOpenDropdown(openDropdown === 'annotate' ? null : 'annotate');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                activeTool === 'annotate'
                  ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Annotate text"
            >
              <PenLine className="h-3.5 w-3.5 text-slate-500" />
              <span>Annotate</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>
            {openDropdown === 'annotate' && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setActiveTool('annotate');
                    setAnnotateSubtype('highlight');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    annotateSubtype === 'highlight' && activeTool === 'annotate' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="w-3.5 h-3.5 bg-yellow-300 border border-yellow-400 rounded-xs" />
                  <span>Highlight</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('annotate');
                    setAnnotateSubtype('underline');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    annotateSubtype === 'underline' && activeTool === 'annotate' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="w-3.5 h-1 bg-blue-600 rounded-xs" />
                  <span>Underline</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('annotate');
                    setAnnotateSubtype('strikeout');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    annotateSubtype === 'strikeout' && activeTool === 'annotate' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="w-3.5 h-1 bg-red-600 rounded-xs" />
                  <span>Strikeout</span>
                </button>
              </div>
            )}
          </div>

          {/* Shapes */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveTool('shapes');
                setOpenDropdown(openDropdown === 'shapes' ? null : 'shapes');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                activeTool === 'shapes'
                  ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Insert shapes"
            >
              <Square className="h-3.5 w-3.5 text-slate-500" />
              <span>Shapes</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>
            {openDropdown === 'shapes' && (
              <div className="absolute top-full left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setActiveTool('shapes');
                    setShapeSubtype('rectangle');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    shapeSubtype === 'rectangle' && activeTool === 'shapes' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Square className="h-3.5 w-3.5 text-slate-500" />
                  <span>Rectangle</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('shapes');
                    setShapeSubtype('circle');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    shapeSubtype === 'circle' && activeTool === 'shapes' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Circle className="h-3.5 w-3.5 text-slate-500" />
                  <span>Circle</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('shapes');
                    setShapeSubtype('line');
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left ${
                    shapeSubtype === 'line' && activeTool === 'shapes' ? 'text-[#1a73e8] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Minus className="h-3.5 w-3.5 text-slate-500" />
                  <span>Line</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={undoHistory.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-600 transition-colors"
            title="Undo last change"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>Undo</span>
          </button>
        </div>

        {/* Action helper prompt pill */}
        {activeTool !== 'text' && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
            {activeTool === 'links' && 'Click anywhere on the document to place a clickable hyperlink'}
            {activeTool === 'forms' && `Click anywhere on the document to place a ${formSubtype}`}
            {activeTool === 'images' && 'Select an image file to insert onto the page'}
            {activeTool === 'shapes' && `Click anywhere on the document to place a ${shapeSubtype}`}
            {activeTool === 'whiteout' && 'Click anywhere on the document to place a whiteout box'}
            {activeTool === 'annotate' && `Click anywhere on the document to place a ${annotateSubtype}`}
            {activeTool === 'sign' && 'Click "Sign" to draw or type a signature'}
          </div>
        )}
      </div>

      {/* 3. FLOATING PAGE CONTROLS (Directly above page, matches Screenshot 4) */}
      <div className="flex items-center justify-center gap-2 pb-1 shrink-0 z-20">
        <span className="text-sm font-bold text-slate-600">
          {currentPageIndex + 1}
        </span>

        <div className="inline-flex items-center border border-slate-300 rounded-md bg-white shadow-2xs divide-x divide-slate-200">
          <button
            onClick={() => {
              if (pdfMeta.total_pages > 1) {
                alert('Page deletion enabled in organize tools.');
              }
            }}
            className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Delete page"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {}}
            className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Rotate left"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {}}
            className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Rotate right"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Page Switcher if multi-page */}
        {pdfMeta.total_pages > 1 && (
          <div className="inline-flex items-center border border-slate-300 rounded-md bg-white text-xs font-medium text-slate-600 shadow-2xs">
            <button
              disabled={currentPageIndex <= 0}
              onClick={() => {
                setCurrentPageIndex((p) => p - 1);
                setActiveSpanId(null);
              }}
              className="px-2 py-1 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono">
              {currentPageIndex + 1} / {pdfMeta.total_pages}
            </span>
            <button
              disabled={currentPageIndex >= pdfMeta.total_pages - 1}
              onClick={() => {
                setCurrentPageIndex((p) => p + 1);
                setActiveSpanId(null);
              }}
              className="px-2 py-1 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN CANVAS WORKSPACE */}
      <div className="flex-1 overflow-auto pt-10 px-8 flex items-start justify-center relative pb-28">
        <div
          ref={pageContainerRef}
          onClick={handlePageClick}
          className="relative bg-white shadow-xl border border-slate-200/60 rounded-xs select-none transition-transform duration-100 origin-top"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Background rendered PDF raster */}
          {currentPage && (
            <img
              ref={imgRef}
              src={currentPage.image_url}
              alt={`Page ${currentPageIndex + 1}`}
              className="max-h-[82vh] w-auto pointer-events-none block"
              onLoad={updatePageScale}
            />
          )}

          {/* FLOATING IN-LINE CONTEXTUAL FONT TOOLBAR (Screenshot 3) */}
          {activeSpan && (
            <div
              className={`${isMobileViewport ? 'fixed bottom-14 left-2 right-2 z-[60] flex-wrap justify-center shadow-2xl' : 'absolute z-50'} flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 transition-all`}
              style={isMobileViewport ? undefined : {
                left: `${Math.min(Math.max(activeSpan.x * 100, 2), 65)}%`,
                top: activeSpan.y < 0.16 ? `${(activeSpan.y + activeSpan.height) * 100}%` : `${activeSpan.y * 100}%`,
                transform: activeSpan.y < 0.16 ? 'translateY(6px)' : 'translateY(-118%)'
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bold */}
              <button
                type="button"
                onClick={() => updateSpanStyle(activeSpan.id, { is_bold: !activeSpan.is_bold })}
                className={`p-1 rounded font-bold transition-colors ${
                  activeSpan.is_bold ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => updateSpanStyle(activeSpan.id, { is_italic: !activeSpan.is_italic })}
                className={`p-1 rounded italic transition-colors ${
                  activeSpan.is_italic ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Font Family Dropdown */}
              <select
                value={activeSpan.font_name}
                onChange={(e) => {
                  const chosenFont = e.target.value;
                  const isTimes = chosenFont.toLowerCase().includes('times');
                  const isCourier = chosenFont.toLowerCase().includes('courier');
                  const newFamily = isTimes
                    ? "'Times New Roman', Times, serif"
                    : isCourier
                    ? "'Courier New', Courier, monospace"
                    : 'Arial, Helvetica, sans-serif';
                  updateSpanStyle(activeSpan.id, { font_name: chosenFont, font_family: newFamily });
                }}
                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Helvetica">Helvetica / Arial</option>
                <option value="Helvetica-Bold">Helvetica Bold</option>
                <option value="Times-Roman">Times New Roman</option>
                <option value="Times-Bold">Times Bold</option>
                <option value="Courier">Courier New</option>
                <option value="Courier-Bold">Courier Bold</option>
              </select>

              {/* Font Size in Points */}
              <div className="flex items-center gap-0.5 border border-slate-200 bg-slate-50 rounded px-1 py-0.5">
                <button
                  type="button"
                  onClick={() =>
                    updateSpanStyle(activeSpan.id, {
                      font_size: Math.max(6, Math.round((activeSpan.font_size - 1) * 10) / 10)
                    })
                  }
                  className="hover:text-black px-1 font-bold text-slate-600"
                  title="Decrease font size"
                >
                  -
                </button>
                <span className="font-mono text-[11px] min-w-8 text-center font-medium">
                  {activeSpan.font_size} pt
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateSpanStyle(activeSpan.id, {
                      font_size: Math.round((activeSpan.font_size + 1) * 10) / 10
                    })
                  }
                  className="hover:text-black px-1 font-bold text-slate-600"
                  title="Increase font size"
                >
                  +
                </button>
              </div>

              {/* Color Swatch */}
              <label className="flex items-center gap-1 pl-1 cursor-pointer" title="Change text color">
                <div
                  className="w-4 h-4 rounded border border-slate-300 shadow-2xs"
                  style={{ backgroundColor: activeSpan.color }}
                />
                <input
                  type="color"
                  value={activeSpan.color}
                  onChange={(e) => updateSpanStyle(activeSpan.id, { color: e.target.value })}
                  className="sr-only"
                />
              </label>

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Clear field button */}
              <button
                type="button"
                onClick={clearActiveField}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                title="Clear this line"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>

              {/* Finish editing button */}
              <button
                type="button"
                onClick={() => setActiveSpanId(null)}
                className="p-1 rounded text-[#00a651] hover:bg-emerald-50 transition-colors"
                title="Done"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Detected Editable Text Spans */}
          {currentSpans.map((span) => {
            const isActive = activeSpanId === span.id;
            const isModified = span.text !== span.original_text;
            const visualFontSize = getVisualFontSize(span.font_size);

            if (isActive) {
              return (
                <div
                  key={span.id}
                  className="absolute z-40"
                  style={{
                    left: `${span.x * 100}%`,
                    top: `${span.y * 100}%`,
                    width: `${Math.max(span.width * 100, 10)}%`,
                    height: `${span.height * 100}%`
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={span.text}
                    onChange={(e) => updateSpanText(span.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setActiveSpanId(null);
                    }}
                    className="w-full h-full px-0.5 m-0 border border-blue-500 border-dashed rounded-none outline-none leading-none shadow-sm"
                    style={{
                      backgroundColor: span.bg_color || '#ffffff',
                      fontFamily: span.font_family,
                      fontSize: `${visualFontSize}px`,
                      fontWeight: span.is_bold ? 'bold' : 'normal',
                      fontStyle: span.is_italic ? 'italic' : 'normal',
                      color: span.color,
                      lineHeight: 1
                    }}
                  />
                </div>
              );
            }

            return (
              <div
                key={span.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpanId(span.id);
                }}
                className={`absolute group cursor-text transition-all ${
                  isModified
                    ? 'hover:outline hover:outline-1 hover:outline-blue-400/50 hover:outline-dashed'
                    : 'hover:bg-blue-500/5 hover:outline hover:outline-1 hover:outline-blue-400/30 hover:outline-dashed'
                }`}
                style={{
                  left: `${span.x * 100}%`,
                  top: `${span.y * 100}%`,
                  width: `${span.width * 100}%`,
                  height: `${span.height * 100}%`,
                  backgroundColor: isModified ? (span.bg_color || '#ffffff') : 'transparent'
                }}
                title={`Click to edit text: ${span.font_name} ${span.font_size}pt`}
              >
                {/* Render modified or cleared text */}
                {isModified && (
                  <div
                    className="w-full h-full flex items-center px-0.5 overflow-hidden"
                    style={{
                      backgroundColor: span.bg_color || '#ffffff',
                      fontFamily: span.font_family,
                      fontSize: `${visualFontSize}px`,
                      fontWeight: span.is_bold ? 'bold' : 'normal',
                      fontStyle: span.is_italic ? 'italic' : 'normal',
                      color: span.color,
                      lineHeight: 1
                    }}
                  >
                    {span.text !== '' ? (
                      <span className="truncate whitespace-nowrap">{span.text}</span>
                    ) : (
                      <span
                        className="text-slate-300 italic font-normal truncate select-none text-[9px]"
                        title="Cleared field - click to type"
                      >
                        •
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Annotations (Whiteouts, Highlights, Links, Forms, Shapes, Images, Signatures) */}
          {currentAnnotations.map((annot) => {
            const isSelected = selectedAnnotId === annot.id;
            return (
              <div
                key={annot.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnnotId(annot.id);
                }}
                className={`absolute group cursor-move select-none ${
                  isSelected ? 'ring-1.5 ring-blue-500 border border-dashed border-blue-400' : ''
                }`}
                style={{
                  left: `${annot.x * 100}%`,
                  top: `${annot.y * 100}%`,
                  width: `${annot.width * 100}%`,
                  minHeight: `${annot.height * 100}%`
                }}
              >
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotations((prev) => prev.filter((a) => a.id !== annot.id));
                      setSelectedAnnotId(null);
                    }}
                    className="absolute -top-3 -right-3 z-50 rounded-full bg-red-600 p-1 text-white shadow-md hover:bg-red-700"
                    title="Delete element"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}

                {/* Link */}
                {annot.type === 'link' && (
                  <div className="w-full h-full bg-blue-400/20 border border-blue-500 flex items-center px-1.5 gap-1 text-[10px] text-blue-800 font-medium truncate rounded-xs">
                    <Link2 className="h-3 w-3 shrink-0 text-blue-600" />
                    <span className="truncate">{annot.url || 'Link'}</span>
                  </div>
                )}

                {/* Form field: checkbox */}
                {annot.type === 'form_field' && annot.field_type === 'checkbox' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotations((prev) =>
                        prev.map((a) => (a.id === annot.id ? { ...a, checked: !a.checked } : a))
                      );
                    }}
                    className="w-5 h-5 border-2 border-slate-700 bg-white rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:border-blue-600"
                  >
                    {annot.checked && <Check className="h-3.5 w-3.5 text-slate-900 stroke-[3]" />}
                  </div>
                )}

                {/* Form field: radio */}
                {annot.type === 'form_field' && annot.field_type === 'radio' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotations((prev) =>
                        prev.map((a) => (a.id === annot.id ? { ...a, checked: !a.checked } : a))
                      );
                    }}
                    className="w-5 h-5 border-2 border-slate-700 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-xs hover:border-blue-600"
                  >
                    {annot.checked && <div className="w-2.5 h-2.5 bg-slate-900 rounded-full" />}
                  </div>
                )}

                {/* Form field: text field */}
                {annot.type === 'form_field' && annot.field_type === 'text' && (
                  <input
                    type="text"
                    value={annot.value || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnnotations((prev) =>
                        prev.map((a) => (a.id === annot.id ? { ...a, value: val } : a))
                      );
                    }}
                    placeholder="Type text..."
                    className="w-full h-full border border-slate-400 bg-white/95 px-1.5 text-xs text-slate-800 rounded-xs outline-none focus:border-blue-500 shadow-2xs"
                  />
                )}

                {/* Shape: rectangle */}
                {annot.type === 'shape' && annot.shape_type === 'rectangle' && (
                  <div
                    className="w-full h-full border-2 border-black rounded-xs"
                    style={{
                      borderColor: annot.stroke_color || '#000000',
                      backgroundColor: annot.fill_color || 'transparent'
                    }}
                  />
                )}

                {/* Shape: circle */}
                {annot.type === 'shape' && annot.shape_type === 'circle' && (
                  <div
                    className="w-full h-full border-2 border-black rounded-full"
                    style={{
                      borderColor: annot.stroke_color || '#000000',
                      backgroundColor: annot.fill_color || 'transparent'
                    }}
                  />
                )}

                {/* Shape: line */}
                {annot.type === 'shape' && annot.shape_type === 'line' && (
                  <div
                    className="w-full h-0.5 bg-black my-auto"
                    style={{ backgroundColor: annot.stroke_color || '#000000' }}
                  />
                )}

                {/* Underline */}
                {annot.type === 'underline' && (
                  <div className="w-full h-0.5 bg-blue-600 mt-auto shadow-2xs" />
                )}

                {/* Strikeout */}
                {annot.type === 'strikeout' && (
                  <div className="w-full h-0.5 bg-red-600 my-auto shadow-2xs" />
                )}

                {/* Signature / Image */}
                {(annot.type === 'signature' || annot.type === 'image') && annot.image_base64 && (
                  <img
                    src={annot.image_base64}
                    alt="Inserted element"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                )}

                {/* Whiteout */}
                {annot.type === 'whiteout' && (
                  <div className="w-full h-full bg-white border border-slate-300 min-h-[16px]" />
                )}

                {/* Highlight */}
                {annot.type === 'highlight' && (
                  <div className="w-full h-full bg-yellow-300/40 min-h-[16px]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. BOTTOM FLOATING ACTION BAR (Screenshot 3 & 4) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={handleApplyChanges}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-[#00a651] hover:bg-[#008f45] px-7 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-98 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Applying changes...</span>
            </>
          ) : (
            <>
              <span>Apply changes</span>
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </>
          )}
        </button>
      </div>

      {/* Hidden File Input for Image Insertion */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Link Creation Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-[#1a73e8]" />
                <span>Insert Hyperlink</span>
              </h4>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Destination URL
              </label>
              <input
                type="url"
                autoFocus
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmCreateLink();
                }}
                placeholder="https://example.com"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-[#00a651] focus:outline-none"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateLink}
                className="px-4 py-1.5 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45]"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Create Signature</h4>
              <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 my-4">
              <button
                onClick={() => setSigMode('draw')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  sigMode === 'draw'
                    ? 'border-[#00a651] bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Draw
              </button>
              <button
                onClick={() => setSigMode('type')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  sigMode === 'type'
                    ? 'border-[#00a651] bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Type
              </button>
            </div>

            {sigMode === 'draw' ? (
              <div className="space-y-2">
                <canvas
                  ref={sigCanvasRef}
                  width={380}
                  height={150}
                  onMouseDown={startDrawingSig}
                  onMouseMove={drawSig}
                  onMouseUp={stopDrawingSig}
                  onMouseLeave={stopDrawingSig}
                  className="border border-slate-300 rounded-lg bg-slate-50 w-full cursor-crosshair"
                />
                <button
                  onClick={() => {
                    const canvas = sigCanvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 underline"
                >
                  Clear signature
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={typedSig}
                  onChange={(e) => setTypedSig(e.target.value)}
                  placeholder="Type your name..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#00a651] focus:outline-none"
                />
                {typedSig && (
                  <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-center font-serif italic text-2xl text-blue-900">
                    {typedSig}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSigModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={stampSignature}
                className="px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45]"
              >
                Insert Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Result Dialog */}
      {downloadResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#00a651] mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Your document is ready</h3>
            <p className="mt-1 text-xs text-slate-500">
              All modifications have been saved in the exact original font and layout.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={downloadResult.download_url}
                download={downloadResult.filename}
                className="flex items-center justify-center gap-2 rounded-md bg-[#00a651] py-2.5 text-xs font-semibold text-white hover:bg-[#008f45] shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download {downloadResult.filename}</span>
              </a>
              <button
                onClick={() => setDownloadResult(null)}
                className="rounded-md border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Continue editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
