import React from 'react';
import { X, FileDown, FileText, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import { DocumentDetails } from '../types';
import { api } from '../api/client';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentDetails;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, document }) => {
  if (!isOpen) return null;

  const exportOptions = [
    {
      format: 'docx',
      name: 'Microsoft Word Document (.docx)',
      desc: 'Fully formatted editable document with styles, headers, and formatted tables.',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      format: 'pdf',
      name: 'Searchable Print-Ready PDF (.pdf)',
      desc: 'Crisp typography with preserved styling, table layouts, and pagination.',
      icon: FileDown,
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    {
      format: 'xlsx',
      name: 'Excel Spreadsheet (.xlsx)',
      desc: 'Extracted tabular financial/data grids exported as separate sheets with styled headers.',
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      format: 'txt',
      name: 'Plain Text (.txt)',
      desc: 'Clean, unformatted text stream suitable for code, scripts, or lightweight storage.',
      icon: FileText,
      color: 'text-slate-600 bg-slate-50 border-slate-200'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 p-6 my-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mb-1.5">
            <Download className="h-3 w-3" />
            Multi-Format Exporter
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Export Document
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Choose a digital format to convert and download your verified document.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {exportOptions.map((opt) => {
            const Icon = opt.icon;
            const exportUrl = api.getExportUrl(document.id, opt.format as any);
            return (
              <a
                key={opt.format}
                href={exportUrl}
                download
                className="flex items-start gap-3.5 rounded-xl border border-slate-200 p-3.5 hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-xs transition-all group"
              >
                <div className={`rounded-lg p-2.5 shrink-0 ${opt.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {opt.name}
                    </span>
                    <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{opt.desc}</p>
                </div>
              </a>
            );
          })}
        </div>

        {/* Download original scan */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Need the enhanced original image?</span>
          <a
            href={document.enhanced_url || document.source_url}
            download={`DocMind_AI_Scan_${document.id}.png`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Download Original Scan
          </a>
        </div>
      </div>
    </div>
  );
};
