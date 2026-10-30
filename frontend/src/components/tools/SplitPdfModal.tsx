import React, { useState } from 'react';
import { X, Scissors, UploadCloud, Download, Check, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface SplitPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SplitPdfModal: React.FC<SplitPdfModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageRanges, setPageRanges] = useState('1-3');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSplit = async () => {
    if (!file || !pageRanges.trim()) return;
    try {
      setProcessing(true);
      const res = await api.splitPdf(file, pageRanges);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Split failed. Please check page numbers.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-3 sm:p-6 shadow-2xl ring-1 ring-slate-900/10 max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Split & Extract PDF Pages</h3>
            <p className="text-xs text-slate-500">Extract specific pages into a new document</p>
          </div>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Pages Extracted Successfully!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Extracted {result.extracted_pages_count} page(s) ({(result.size_bytes / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download Extracted PDF</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Split another file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition-all">
              <UploadCloud className="h-8 w-8 text-amber-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Select PDF to Split'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB • Click to change` : 'Click or drop PDF here'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pages to Extract (e.g. 1-3, 5, 8-10)
              </label>
              <input
                type="text"
                value={pageRanges}
                onChange={(e) => setPageRanges(e.target.value)}
                placeholder="1-3, 5"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSplit}
                disabled={processing || !file || !pageRanges}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    <span>Extract Pages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
