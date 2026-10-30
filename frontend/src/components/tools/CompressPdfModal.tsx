import React, { useState } from 'react';
import { X, Minimize2, UploadCloud, Download, Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';

interface CompressPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompressPdfModal: React.FC<CompressPdfModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'recommended' | 'maximum'>('recommended');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    try {
      setProcessing(true);
      const res = await api.compressPdf(file, level);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Compression failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Minimize2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Compress PDF</h3>
            <p className="text-xs text-slate-500">Reduce file size while optimizing quality for web and email sharing</p>
          </div>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">PDF Compressed Successfully!</h4>
            
            {/* Compression Stats Card */}
            <div className="my-5 rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Original</span>
                <div className="text-xs font-bold text-slate-700">
                  {(result.original_size_bytes / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Compressed</span>
                <div className="text-xs font-bold text-emerald-600">
                  {(result.compressed_size_bytes / 1024).toFixed(1)} KB
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Reduction</span>
                <div className="text-xs font-extrabold text-blue-600">
                  -{result.savings_percent}%
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download Compressed PDF</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Compress another file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all">
              <UploadCloud className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Select PDF to Compress'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB • Click to change` : 'Click or drop PDF here'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            {/* Quality Preset Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Compression Level
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLevel('recommended')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    level === 'recommended'
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Recommended</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Balanced downsampling, crisp text, ~50-70% reduction
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('maximum')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    level === 'maximum'
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Maximum</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Aggressive image downsampling, smallest possible size
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCompress}
                disabled={processing || !file}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    <span>Compress PDF</span>
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
