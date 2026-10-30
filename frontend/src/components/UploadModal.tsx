import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileCheck,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { SampleDocument, QuotaStatus } from '../types';
import { api } from '../api/client';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: QuotaStatus | null;
  onDocumentCreated: (docId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  quota,
  onDocumentCreated
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [conversionMode, setConversionMode] = useState<'editable' | 'layout'>('editable');
  const [samples, setSamples] = useState<SampleDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSamples().then(setSamples).catch(console.error);
      setError(null);
      setFile(null);
      setTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
      setError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image or PDF document to upload.');
      return;
    }
    if (quota && quota.remaining_today <= 0) {
      setError(`Daily processing quota exhausted (${quota.daily_limit}/${quota.daily_limit} used today). Upgrade your plan or wait for the midnight IST reset.`);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const res = await api.uploadDocument(file, title, conversionMode);
      onDocumentCreated(res.document_id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload and processing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleUseSample = async (sampleName: string) => {
    if (quota && quota.remaining_today <= 0) {
      setError(`Daily quota exhausted (${quota.daily_limit}/${quota.daily_limit} used today). Upgrade your plan to process new documents.`);
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const res = await api.useSample(sampleName, conversionMode);
      onDocumentCreated(res.document_id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sample processing failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 p-4 sm:p-6 my-auto sm:my-4">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Scan or Upload Document
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Upload photographs (PNG, JPG, WebP) or single/multi-page PDFs for automated enhancement and text extraction.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        {/* Instant Test Samples */}
        {samples.length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Pre-seeded sample documents:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samples.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  disabled={uploading}
                  onClick={() => handleUseSample(s.name)}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-[#00a651] hover:bg-emerald-50/10 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{s.title}</span>
                  </div>
                  <span className="text-[11px] text-[#00a651] font-semibold shrink-0 ml-2">Load →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition-colors ${
              file
                ? 'border-emerald-500 bg-emerald-50/20'
                : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center">
                <FileCheck className="h-10 w-10 text-emerald-600 mb-2" />
                <span className="text-sm font-semibold text-slate-900">{file.name}</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • Click to change file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                <span className="text-sm font-semibold text-slate-800">
                  Drag and drop your scan here, or click to browse
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supports camera photos, high-res scans, and multi-page PDFs
                </span>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. October Tax Invoice, NDA Agreement"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Conversion Mode Selection (Section 3 of Proposal) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Conversion Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  conversionMode === 'editable'
                    ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="conversion_mode"
                  value="editable"
                  checked={conversionMode === 'editable'}
                  onChange={() => setConversionMode('editable')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>Editable Text Mode</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                    Extracts content into a clean, flowing editable document. Ideal for notes, articles, and letters.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  conversionMode === 'layout'
                    ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="conversion_mode"
                  value="layout"
                  checked={conversionMode === 'layout'}
                  onChange={() => setConversionMode('layout')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Layout-Preservation Mode</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                    Reconstructs spatial alignment, table grids, headers, and metadata tags to match the original scan.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="w-full sm:w-auto rounded-md border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#00a651] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#008f45] active:scale-98 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Enhancing & Extracting...</span>
                </>
              ) : (
                <>
                  <span>Process Document</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
