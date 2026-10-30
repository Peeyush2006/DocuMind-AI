import React, { useState } from 'react';
import {
  X,
  RotateCw,
  Crop,
  Sun,
  Compass,
  Check,
  RefreshCw,
  Sliders,
  Sparkles
} from 'lucide-react';
import { DocumentDetails } from '../types';
import { api } from '../api/client';

interface ImageEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentDetails;
  onEnhancementComplete: (updatedDoc: DocumentDetails) => void;
}

export const ImageEnhancerModal: React.FC<ImageEnhancerModalProps> = ({
  isOpen,
  onClose,
  document,
  onEnhancementComplete
}) => {
  const [doCrop, setDoCrop] = useState(true);
  const [doDeskew, setDoDeskew] = useState(true);
  const [doClahe, setDoClahe] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'enhanced' | 'original'>('enhanced');

  if (!isOpen) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApplyEnhancement = async () => {
    try {
      setProcessing(true);
      const res = await api.reEnhance(document.id, {
        do_crop: doCrop,
        do_deskew: doDeskew,
        do_clahe: doClahe,
        rotation
      });
      // Fetch refreshed document
      const refreshed = await api.getDocument(document.id);
      onEnhancementComplete(refreshed);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Enhancement failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 p-6 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mb-1">
              <Sliders className="h-3 w-3" />
              OpenCV Enhancement Pipeline
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Document Preprocessing & Edge Detection
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Image View + Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
          {/* Left 2 Cols: Image Preview */}
          <div className="md:col-span-2 flex flex-col bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between bg-slate-200/70 px-4 py-2 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('enhanced')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'enhanced'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Processed Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('original')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'original'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw Source
                </button>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {activeTab === 'enhanced' ? 'CLAHE + Deskewed' : 'Unprocessed'}
              </span>
            </div>

            {/* Canvas / Image Display */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-[360px] max-h-[460px] overflow-auto">
              <img
                src={
                  activeTab === 'enhanced' && document.enhanced_url
                    ? document.enhanced_url
                    : document.source_url
                }
                alt="Document preview"
                className="max-h-full max-w-full object-contain rounded-md shadow-md transition-transform duration-200"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
          </div>

          {/* Right Col: Enhancement Controls */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Adjustment Modules
            </h4>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4 text-blue-600" />
                <span>Rotate 90° Clockwise</span>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 font-mono">
                {rotation}°
              </span>
            </button>

            {/* Crop & Perspective */}
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-xs">
              <input
                type="checkbox"
                checked={doCrop}
                onChange={(e) => setDoCrop(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Crop className="h-3.5 w-3.5 text-blue-600" />
                  <span>4-Point Contour Crop</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Detects page boundary polygon and executes homography warp to flatten skewed angles.
                </p>
              </div>
            </label>

            {/* Deskew */}
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-xs">
              <input
                type="checkbox"
                checked={doDeskew}
                onChange={(e) => setDoDeskew(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Compass className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Text Line Deskewing</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Calculates horizontal text moment gradient and levels rotated text.
                </p>
              </div>
            </label>

            {/* CLAHE Contrast */}
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs cursor-pointer hover:border-slate-300 transition-colors shadow-xs">
              <input
                type="checkbox"
                checked={doClahe}
                onChange={(e) => setDoClahe(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>CLAHE Contrast Boost</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Removes shadows, flattens flash glare, and sharpens ink strokes for maximum OCR accuracy.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyEnhancement}
            disabled={processing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-98 disabled:opacity-50 transition-all"
          >
            {processing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Applying OpenCV Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Save & Re-Extract Content</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
