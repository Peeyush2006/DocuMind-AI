import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sliders,
  Download,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle,
  FileText,
  Layers,
  Eye,
  Info
} from 'lucide-react';
import { DocumentDetails, ExtractedWord, BoundingBox } from '../types';
import { TipTapEditor } from './TipTapEditor';
import { AIAssistantDrawer } from './AIAssistantDrawer';
import { ImageEnhancerModal } from './ImageEnhancerModal';
import { ExportModal } from './ExportModal';
import { api } from '../api/client';

interface DualPaneWorkspaceProps {
  documentId: string;
  onBack: () => void;
}

export const DualPaneWorkspace: React.FC<DualPaneWorkspaceProps> = ({
  documentId,
  onBack
}) => {
  const [doc, setDoc] = useState<DocumentDetails | null>(null);
  const [contentHtml, setContentHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeHighlightBbox, setActiveHighlightBbox] = useState<BoundingBox | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mobilePane, setMobilePane] = useState<'source' | 'editor'>('source');
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await api.getDocument(documentId);
      setDoc(data);
      setContentHtml(data.latest_content_html || '');
    } catch (e) {
      console.error(e);
      alert('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (newHtml: string) => {
    setContentHtml(newHtml);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await api.saveDocument(documentId, newHtml);
      } catch (err) {
        console.error('Autosave error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1200);
  };

  // Find bounding box for uncertain word clicked in editor
  const handleWordClick = (wordText: string) => {
    setSelectedWord(wordText);
    if (!doc?.extraction?.blocks) return;

    for (const block of doc.extraction.blocks) {
      for (const w of block.words) {
        if (w.text.toLowerCase().includes(wordText.toLowerCase()) || wordText.toLowerCase().includes(w.text.toLowerCase())) {
          setActiveHighlightBbox(w.bbox);
          return;
        }
      }
    }
  };

  if (loading || !doc) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-600">Loading document verification workspace...</span>
        </div>
      </div>
    );
  }

  const isPdf = doc.filename.endsWith('.pdf');

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-100 overflow-hidden">
      {/* Workspace Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 sm:px-4 py-2.5 shadow-xs shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Back to library"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-[34vw] sm:max-w-md">
              {doc.title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-mono truncate max-w-[28vw] sm:max-w-none">{doc.filename}</span>
              <span>•</span>
              <span className="capitalize">{doc.conversion_mode} mode</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!isPdf && (
            <button
              onClick={() => setShowEnhancer(true)}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Enhance Scan</span>
            </button>
          )}

          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
              showAI
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#00a651] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#008f45] active:scale-98 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-white p-2 md:hidden">
        <button type="button" onClick={() => setMobilePane('source')} className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${mobilePane === 'source' ? 'bg-emerald-50 text-[#008f45] ring-1 ring-emerald-200' : 'text-slate-500'}`}>
          <Eye className="h-4 w-4" /> Source Scan
        </button>
        <button type="button" onClick={() => setMobilePane('editor')} className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${mobilePane === 'editor' ? 'bg-emerald-50 text-[#008f45] ring-1 ring-emerald-200' : 'text-slate-500'}`}>
          <FileText className="h-4 w-4" /> Editor
        </button>
      </div>

      {/* Main Dual-Pane Body */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left Pane: Original Document Scan Viewer */}
        <div className={`${mobilePane === 'source' ? 'flex' : 'hidden'} md:flex w-full md:w-1/2 min-w-0 flex-col border-r border-slate-200 bg-[#edf2f7] overflow-hidden relative`}>
          {/* Scan Viewer Toolbar */}
          <div className="flex items-center justify-between bg-white border-b border-slate-200 px-3 py-1.5 text-xs text-slate-700 z-10 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-[#00a651]" />
              <span className="font-semibold text-slate-800">Source Document Scan</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono w-10 text-center text-slate-600 font-medium">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Reset Zoom"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Document Image Container */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div
              className="relative shadow-xl border border-slate-200/80 rounded-xs bg-white transition-transform duration-150 origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {doc.enhanced_url?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${doc.enhanced_url}#toolbar=0`}
                  className="w-[calc(100vw-2rem)] md:w-[500px] h-[70vh] md:h-[75vh] rounded"
                  title="PDF Source Document"
                />
              ) : (
                <img
                  src={doc.enhanced_url || doc.source_url}
                  alt="Original document scan"
                  className="max-h-[70vh] md:max-h-[75vh] max-w-full w-auto object-contain rounded select-none block"
                />
              )}

              {/* Bounding box highlight for selected uncertain word */}
              {activeHighlightBbox && (
                <div
                  className="absolute border-2 border-red-500 bg-red-500/25 rounded-xs transition-all duration-200 animate-pulse"
                  style={{
                    left: `${activeHighlightBbox.x * 100}%`,
                    top: `${activeHighlightBbox.y * 100}%`,
                    width: `${activeHighlightBbox.width * 100}%`,
                    height: `${activeHighlightBbox.height * 100}%`
                  }}
                  title={`Selected token: "${selectedWord}"`}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Online Rich Text Editor */}
        <div className={`${mobilePane === 'editor' ? 'flex' : 'hidden'} md:flex min-w-0 flex-1 flex-col bg-white overflow-hidden`}>
          <TipTapEditor
            initialContent={contentHtml}
            onContentChange={handleContentChange}
            onWordClick={handleWordClick}
            isSaving={isSaving}
          />
        </div>

        {/* AI Assistant Drawer if toggled */}
        {showAI && (
          <div className="fixed inset-x-0 bottom-0 top-[65px] z-30 bg-white md:static md:inset-auto md:z-auto md:h-full">
          <AIAssistantDrawer
            document={doc}
            currentContentHtml={contentHtml}
            onClose={() => setShowAI(false)}
          />
          </div>
        )}
      </div>

      {/* Modals */}
      {showEnhancer && (
        <ImageEnhancerModal
          isOpen={showEnhancer}
          onClose={() => setShowEnhancer(false)}
          document={doc}
          onEnhancementComplete={(updated) => {
            setDoc(updated);
            setContentHtml(updated.latest_content_html || '');
          }}
        />
      )}

      {showExport && (
        <ExportModal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          document={doc}
        />
      )}
    </div>
  );
};
