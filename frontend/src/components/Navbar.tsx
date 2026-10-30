import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Crown,
  PenTool,
  Minimize2,
  GitMerge,
  Scissors,
  Layers,
  ChevronDown
} from 'lucide-react';
import { QuotaStatus } from '../types';
import { PdfToolType } from './PdfToolsGrid';

interface NavbarProps {
  quota: QuotaStatus | null;
  onOpenUpload: () => void;
  onOpenPricing: () => void;
  onGoHome: () => void;
  onSelectTool: (tool: PdfToolType) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  quota,
  onOpenUpload,
  onOpenPricing,
  onGoHome,
  onSelectTool,
  currentView
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <div
            onClick={onGoHome}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            {/* DocMind AI brand badge */}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00a651] text-white shadow-xs">
              <span className="text-lg font-black leading-none">D</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-[#00a651]">
                DocMind AI
              </span>
            </div>
          </div>

          {/* Quick Nav Tools */}
          <nav className="hidden lg:flex items-center gap-0.5 text-xs font-medium text-slate-600">
            <button
              onClick={onGoHome}
              className={`rounded-md px-3 py-1.5 hover:bg-slate-100 transition-colors ${
                currentView === 'home' ? 'text-slate-900 bg-slate-100 font-semibold' : ''
              }`}
            >
              All Tools
            </button>

            <button
              onClick={() => onSelectTool('editor')}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700"
            >
              Edit
            </button>

            <button
              onClick={() => onSelectTool('compress')}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700"
            >
              Compress
            </button>

            <button
              onClick={() => onSelectTool('merge')}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700"
            >
              Merge
            </button>

            <button
              onClick={() => onSelectTool('split')}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700"
            >
              Split
            </button>

            <button
              onClick={() => onSelectTool('organize')}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700"
            >
              Delete Pages
            </button>

            <button
              onClick={onOpenUpload}
              className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-700 flex items-center gap-1.5"
            >
              <span>AI OCR</span>
            </button>
          </nav>
        </div>

        {/* Right Actions & Quota */}
        <div className="flex items-center gap-3">
          {quota && (
            <div
              className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
            >
              <span className="font-semibold text-slate-700">{quota.plan_name}</span>
              <span className="text-slate-300">•</span>
              <span className={quota.remaining_today === 0 ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                {quota.documents_used_today} / {quota.daily_limit} tasks
              </span>
            </div>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 rounded-md bg-[#00a651] hover:bg-[#009245] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-98 transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>
    </header>
  );
};
