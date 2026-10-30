import React, { useState } from 'react';
import { X, Stamp, Hash, UploadCloud, Download, Check, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface WatermarkPageNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'watermark' | 'page_numbers';
}

export const WatermarkPageNumbersModal: React.FC<WatermarkPageNumbersModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'watermark'
}) => {
  const [tab, setTab] = useState<'watermark' | 'page_numbers'>(initialTab);
  const [file, setFile] = useState<File | null>(null);

  // Watermark options
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.25);
  const [angle, setAngle] = useState(45);
  const [color, setColor] = useState('#94a3b8');

  // Page Numbers options
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [pattern, setPattern] = useState('Page {n} of {total}');

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExecute = async () => {
    if (!file) return;
    try {
      setProcessing(true);
      if (tab === 'watermark') {
        const res = await api.watermarkPdf(file, wmText, opacity, angle, color);
        setResult(res);
      } else {
        const res = await api.pageNumbersPdf(file, position, pattern);
        setResult(res);
      }
    } catch (e) {
      console.error(e);
      alert('Operation failed');
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
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
            {tab === 'watermark' ? <Stamp className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {tab === 'watermark' ? 'Watermark PDF' : 'Add Page Numbers'}
            </h3>
            <p className="text-xs text-slate-500">
              {tab === 'watermark' ? 'Stamp diagonal text watermark across pages' : 'Number all pages in header or footer'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('watermark');
              setResult(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'watermark' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Watermark
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('page_numbers');
              setResult(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'page_numbers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Page Numbers
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {tab === 'watermark' ? 'Watermark Applied!' : 'Page Numbers Added!'}
            </h4>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-md bg-[#00a651] py-2.5 text-xs font-semibold text-white hover:bg-[#008f45] shadow-2xs transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Result</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Process another file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-sky-500 hover:bg-sky-50/20 transition-all">
              <UploadCloud className="h-8 w-8 text-sky-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Select PDF File'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB • Click to change` : 'Click or drop PDF here'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            {tab === 'watermark' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    placeholder="CONFIDENTIAL, DRAFT, SAMPLE..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Opacity: {Math.round(opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.80"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Angle: {angle}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="15"
                      value={angle}
                      onChange={(e) => setAngle(parseInt(e.target.value))}
                      className="w-full accent-sky-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position on Page
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                  >
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Format Pattern
                  </label>
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="Page {n} of {total}"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
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
                onClick={handleExecute}
                disabled={processing || !file}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Apply & Download</span>
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
