import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  ExternalLink,
  Search,
  UploadCloud,
  Layers
} from 'lucide-react';
import { DocumentItem, SampleDocument } from '../types';
import { api } from '../api/client';

interface DocumentListProps {
  documents: DocumentItem[];
  samples: SampleDocument[];
  onOpenDocument: (docId: string) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onOpenDocument,
  onOpenUpload,
  onRefresh
}) => {
  const [search, setSearch] = useState('');

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to securely delete this document and all generated outputs?')) {
      try {
        await api.deleteDocument(docId);
        onRefresh();
      } catch (err) {
        console.error(err);
        alert('Failed to delete document');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Document Library Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Document Library</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {documents.length} document{documents.length !== 1 ? 's' : ''} stored and editable
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#00a651] focus:outline-none focus:ring-1 focus:ring-[#00a651] shadow-2xs"
            />
          </div>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 rounded-md bg-[#00a651] hover:bg-[#008f45] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-98 shrink-0"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'No documents match your search query.' : 'Upload a document or choose any tool above to get started.'}
          </p>
          <button
            onClick={onOpenUpload}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#00a651] hover:bg-[#008f45] px-4 py-2 text-xs font-semibold text-white shadow-2xs"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((d) => (
            <div
              key={d.id}
              onClick={() => onOpenDocument(d.id)}
              className="group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#00a651]/10 group-hover:text-[#00a651] transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDelete(d.id, e)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Securely delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#00a651] transition-colors line-clamp-1">
                  {d.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{d.filename}</p>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3 text-slate-400" />
                    <span className="capitalize">{d.conversion_mode} mode</span>
                  </span>
                  <span>•</span>
                  <span>{d.page_count} page{d.page_count > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
                <span className="font-semibold text-[#00a651] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  <span>Open Workspace</span>
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
