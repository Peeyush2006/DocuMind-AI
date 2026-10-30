import React, { useState } from 'react';
import { X, Lock, Unlock, UploadCloud, Download, Check, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';

interface SecurityPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'protect' | 'unlock';
}

export const SecurityPdfModal: React.FC<SecurityPdfModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'protect'
}) => {
  const [mode, setMode] = useState<'protect' | 'unlock'>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleExecute = async () => {
    if (!file || !password) return;
    try {
      setProcessing(true);
      setError(null);
      if (mode === 'protect') {
        const res = await api.protectPdf(file, password);
        setResult(res);
      } else {
        const res = await api.unlockPdf(file, password);
        setResult(res);
      }
    } catch (e: any) {
      setError(e.message || 'Operation failed');
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
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
            {mode === 'protect' ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === 'protect' ? 'Protect / Encrypt PDF' : 'Unlock / Decrypt PDF'}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'protect' ? 'Add AES password security to your document' : 'Remove password restriction from PDF'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('protect');
              setResult(null);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'protect' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Protect PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('unlock');
              setResult(null);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'unlock' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Unlock PDF
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {mode === 'protect' ? 'PDF Encrypted Successfully!' : 'PDF Decrypted Successfully!'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              File is ready for secure download.
            </p>
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
                  setPassword('');
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Process another file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-[#00a651] hover:bg-emerald-50/10 transition-colors">
              <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-800">
                {file ? file.name : 'Select PDF File'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB • Click to change` : 'Click or drop PDF here'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mode === 'protect' ? 'Set Password' : 'Enter PDF Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-[#00a651] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={processing || !file || !password}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{mode === 'protect' ? 'Encrypt PDF' : 'Unlock PDF'}</span>
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
