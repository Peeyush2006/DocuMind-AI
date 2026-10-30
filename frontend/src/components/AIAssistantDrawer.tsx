import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCheck,
  Languages,
  MessageSquare,
  Send,
  Loader2,
  Copy,
  Check,
  HelpCircle,
  FileText
} from 'lucide-react';
import { DocumentDetails, AIAssistantResponse } from '../types';
import { api } from '../api/client';

interface AIAssistantDrawerProps {
  document: DocumentDetails;
  currentContentHtml: string;
  onApplyCorrection?: (correctedText: string) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  document,
  currentContentHtml,
  onApplyCorrection
}) => {
  const [activeAction, setActiveAction] = useState<'summarize' | 'explain' | 'correct' | 'translate' | 'qa'>('summarize');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIAssistantResponse | null>(null);
  const [qaQuery, setQaQuery] = useState('');
  const [targetLang, setTargetLang] = useState('Hindi');
  const [copied, setCopied] = useState(false);

  const handleAction = async (action: 'summarize' | 'explain' | 'correct' | 'translate' | 'qa', customQuery?: string) => {
    setActiveAction(action);
    setLoading(true);
    setResponse(null);
    try {
      const res = await api.askAI(document.id, action, {
        content: currentContentHtml,
        query: customQuery || qaQuery,
        target_language: targetLang
      });
      setResponse(res);
    } catch (err) {
      console.error(err);
      alert('AI Assistant request failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (response?.result) {
      navigator.clipboard.writeText(response.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-full sm:w-96 shrink-0">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-slate-100 p-1.5 text-slate-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Document Assistant</h4>
            <p className="text-[11px] text-slate-500">Document Q&A, translation & review</p>
          </div>
        </div>
      </div>

      {/* Action Quick Buttons */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => handleAction('summarize')}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeAction === 'summarize'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Summarize</span>
        </button>

        <button
          onClick={() => handleAction('explain')}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeAction === 'explain'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Explain Terms</span>
        </button>

        <button
          onClick={() => handleAction('correct')}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeAction === 'correct'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span>Fix OCR Typos</span>
        </button>

        <button
          onClick={() => handleAction('translate')}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeAction === 'translate'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          <span>Hindi Translate</span>
        </button>
      </div>

      {/* Main Drawer Output Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-[#00a651] mb-2" />
            <span className="text-xs font-medium text-slate-600">Processing with Document Context...</span>
            <span className="text-[11px] text-slate-400 mt-1">Grounding answers against OCR extractions</span>
          </div>
        ) : response ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-blue-600">
                AI Output: {response.action}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Formatted Markdown/Text Output */}
            <div className="text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap">
              {response.result}
            </div>

            {/* Citations if any */}
            {response.citations && response.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h5 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <CheckCheck className="h-3 w-3 text-emerald-600" />
                  <span>Grounding Citations ({response.citations.length}):</span>
                </h5>
                <div className="space-y-1.5">
                  {response.citations.map((cite, i) => (
                    <div key={i} className="rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-200">
                      <div className="font-bold text-slate-700">{cite.section}</div>
                      <div className="text-slate-500 italic mt-0.5">"{cite.snippet}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Ask anything about this document</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
              Click one of the quick actions above or type a specific question below.
            </p>
          </div>
        )}
      </div>

      {/* Grounded Q&A Input Box */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (qaQuery.trim()) {
              handleAction('qa', qaQuery);
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={qaQuery}
            onChange={(e) => setQaQuery(e.target.value)}
            placeholder="e.g. What is the total amount due?"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading || !qaQuery.trim()}
            className="rounded-md bg-[#00a651] p-2 text-white hover:bg-[#008f45] disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
