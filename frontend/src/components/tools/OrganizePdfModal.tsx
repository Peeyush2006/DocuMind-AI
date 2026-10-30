import React, { useState } from 'react';
import {
  X,
  RotateCw,
  Trash2,
  Undo2,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Check,
  Download,
  Loader2,
  Layers
} from 'lucide-react';
import { api } from '../../api/client';

interface OrganizePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizePdfModal: React.FC<OrganizePdfModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      try {
        setLoadingPages(true);
        const meta = await api.renderPdfPages(f);
        setPages(
          meta.pages.map((p) => ({
            ...p,
            rotation: 0,
            deleted: false
          }))
        );
      } catch (err) {
        console.error(err);
        alert('Failed to load PDF pages');
      } finally {
        setLoadingPages(false);
      }
    }
  };

  const rotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const toggleDelete = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const copy = [...pages];
    const item = copy.splice(fromIndex, 1)[0];
    copy.splice(toIndex, 0, item);
    setPages(copy);
  };

  const handleSave = async () => {
    if (!file) return;
    try {
      setSaving(true);
      const specs = pages.map((p) => ({
        page_index: p.page_index,
        rotation: p.rotation,
        deleted: p.deleted
      }));
      const res = await api.organizePdf(file, specs);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Failed to save organized PDF');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Organize, Rotate & Delete Pages</h3>
            <p className="text-xs text-slate-500">Reorder pages visually, rotate orientations, and discard unwanted pages</p>
          </div>
        </div>

        {result ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">PDF Reorganized Successfully!</h4>
            <p className="text-xs text-slate-500 mt-1">
              New PDF generated with {result.final_page_count} pages ({(result.size_bytes / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download Organized PDF</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPages([]);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Organize another file
              </button>
            </div>
          </div>
        ) : !file ? (
          <div className="py-12 flex items-center justify-center">
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/20 transition-all max-w-md w-full">
              <UploadCloud className="h-10 w-10 text-cyan-500 mb-2" />
              <span className="text-sm font-bold text-slate-800">Select PDF to Organize</span>
              <span className="text-xs text-slate-400 mt-1">Upload to view thumbnail grid</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        ) : loadingPages ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-2" />
            <span className="text-xs font-semibold text-slate-600">Rendering high-res page thumbnails...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pages Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl border border-slate-200">
              {pages.map((p, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col rounded-xl border p-2 bg-white transition-all ${
                    p.deleted
                      ? 'opacity-40 border-red-300 bg-red-50/20'
                      : 'border-slate-200 shadow-xs hover:border-cyan-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5 px-1">
                    <span>Page {idx + 1}</span>
                    {p.rotation > 0 && <span className="text-cyan-600">+{p.rotation}°</span>}
                    {p.deleted && <span className="text-red-600 font-extrabold">DELETED</span>}
                  </div>

                  <div className="relative aspect-[3/4] flex items-center justify-center overflow-hidden rounded bg-slate-100 mb-2">
                    <img
                      src={p.image_url}
                      alt={`Page ${idx + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  </div>

                  {/* Thumbnail Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => movePage(idx, idx - 1)}
                        disabled={idx === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                        title="Move Left"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => movePage(idx, idx + 1)}
                        disabled={idx === pages.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                        title="Move Right"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => rotatePage(idx)}
                        className="rounded p-1 text-slate-500 hover:bg-cyan-50 hover:text-cyan-600"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleDelete(idx)}
                        className={`rounded p-1 transition-colors ${
                          p.deleted
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                        }`}
                        title={p.deleted ? 'Restore Page' : 'Delete Page'}
                      >
                        {p.deleted ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-500">
                {pages.filter((p) => !p.deleted).length} of {pages.length} pages will be kept
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || pages.every((p) => p.deleted)}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving PDF...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Reorganized PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
