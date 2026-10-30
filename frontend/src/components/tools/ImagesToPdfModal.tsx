import React, { useState } from 'react';
import { X, Image, UploadCloud, Download, Check, Loader2, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { api } from '../../api/client';

interface ImagesToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImagesToPdfModal: React.FC<ImagesToPdfModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const added = Array.from(e.target.files).filter((f) =>
        ['image/png', 'image/jpeg', 'image/webp'].includes(f.type) ||
        /\.(png|jpg|jpeg|webp)$/i.test(f.name)
      );
      setFiles((prev) => [...prev, ...added]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...files];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setFiles(copy);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const copy = [...files];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setFiles(copy);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    try {
      setProcessing(true);
      const res = await api.imagesToPdf(files);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Conversion failed');
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
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Image className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">JPG & PNG to PDF</h3>
            <p className="text-xs text-slate-500">Convert one or multiple image files into a single PDF</p>
          </div>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Images Converted to PDF!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Generated {result.pages} page(s) ({(result.size_bytes / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download Generated PDF</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFiles([]);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Convert more images
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-all">
              <UploadCloud className="h-8 w-8 text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">Select Images</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG, WEBP</span>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-20"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === files.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-20"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeFile(i)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={processing || files.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 shadow-sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Convert to PDF</span>
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
