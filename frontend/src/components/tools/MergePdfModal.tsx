import React, { useState } from 'react';
import { X, GitMerge, UploadCloud, Trash2, ArrowUp, ArrowDown, Download, Check, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface MergePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MergePdfModal: React.FC<MergePdfModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const added = Array.from(e.target.files).filter((f) => f.name.endsWith('.pdf'));
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

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    try {
      setProcessing(true);
      const res = await api.mergePdfs(files);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Merge failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
            <GitMerge className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Merge PDF Files</h3>
            <p className="text-xs text-slate-500">Combine multiple PDF documents into a single file</p>
          </div>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">PDFs Merged Successfully!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Combined into {result.total_pages} total pages ({(result.size_bytes / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download Merged PDF</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFiles([]);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Merge more files
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-[#00a651] hover:bg-emerald-50/10 transition-colors">
              <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-800">Click to add PDF documents</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Select multiple PDF files to combine</span>
              <input type="file" multiple accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-slate-400 w-4">{i + 1}.</span>
                      <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === files.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFile(i)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                onClick={handleMerge}
                disabled={processing || files.length < 2}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    <span>Merge {files.length} Files</span>
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
