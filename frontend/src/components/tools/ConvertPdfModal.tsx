import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileDown,
  UploadCloud,
  Download,
  Check,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { api } from '../../api/client';

interface ConvertPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFormat?: 'docx' | 'xlsx' | 'txt';
}

export const ConvertPdfModal: React.FC<ConvertPdfModalProps> = ({
  isOpen,
  onClose,
  targetFormat = 'docx'
}) => {
  const [format, setFormat] = useState<'docx' | 'xlsx' | 'txt'>(targetFormat);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    try {
      setProcessing(true);
      let res;
      if (format === 'docx') {
        res = await api.convertPdfToDocx(file);
      } else if (format === 'xlsx') {
        res = await api.convertPdfToXlsx(file);
      } else {
        res = await api.convertPdfToTxt(file);
      }
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatNames = {
    docx: 'Microsoft Word (.docx)',
    xlsx: 'Excel Spreadsheet (.xlsx)',
    txt: 'Plain Text (.txt)'
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
            {format === 'xlsx' ? (
              <FileSpreadsheet className="h-5 w-5" />
            ) : format === 'docx' ? (
              <FileText className="h-5 w-5" />
            ) : (
              <FileDown className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Convert PDF to {format.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500">
              Transform PDF pages into editable {formatNames[format]} format
            </p>
          </div>
        </div>

        {/* Target Format Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setFormat('docx');
              setResult(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              format === 'docx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            To Word (.docx)
          </button>
          <button
            type="button"
            onClick={() => {
              setFormat('xlsx');
              setResult(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              format === 'xlsx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            To Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => {
              setFormat('txt');
              setResult(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              format === 'txt' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            To Text (.txt)
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Converted to {format.toUpperCase()} Successfully!
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              File ready for instant download ({(result.size_bytes / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={result.download_url}
                download={result.filename}
                className="flex items-center justify-center gap-2 rounded-md bg-[#00a651] py-2.5 text-xs font-semibold text-white hover:bg-[#008f45] shadow-2xs transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download {result.filename}</span>
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="text-xs text-slate-500 hover:underline mt-2"
              >
                Convert another file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all">
              <UploadCloud className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Select PDF to Convert'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB • Click to change` : 'Click or drop PDF here'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={processing || !file}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#00a651] text-white rounded-md hover:bg-[#008f45] disabled:opacity-40 shadow-2xs transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Convert to {format.toUpperCase()}</span>
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
