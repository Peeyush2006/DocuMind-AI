import {
  DocumentItem,
  DocumentDetails,
  QuotaStatus,
  SampleDocument,
  AIAssistantResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  // --- Quota & Plans ---
  async getQuota(): Promise<QuotaStatus> {
    const res = await fetch(`${API_BASE}/quota/status`);
    if (!res.ok) throw new Error('Failed to fetch quota');
    return res.json();
  },

  async setPlan(planId: string): Promise<QuotaStatus> {
    const fd = new FormData();
    fd.append('plan_id', planId);
    const res = await fetch(`${API_BASE}/quota/plan`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to change plan');
    return res.json();
  },

  // --- Document Intelligence & OCR ---
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocument(id: string): Promise<DocumentDetails> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  async getSamples(): Promise<SampleDocument[]> {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error('Failed to fetch samples');
    return res.json();
  },

  async useSample(sampleName: string, conversionMode: string = 'editable'): Promise<any> {
    const res = await fetch(`${API_BASE}/samples/${sampleName}/use?conversion_mode=${conversionMode}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to use sample');
    }
    return res.json();
  },

  async uploadDocument(
    file: File,
    title: string,
    conversionMode: string = 'editable'
  ): Promise<any> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('conversion_mode', conversionMode);
    fd.append('idempotency_key', `upload_${Date.now()}_${Math.random()}`);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload document');
    }
    return res.json();
  },

  async reEnhance(
    docId: string,
    options: {
      do_crop: boolean;
      do_deskew: boolean;
      do_clahe: boolean;
      rotation: number;
    }
  ): Promise<any> {
    const fd = new FormData();
    fd.append('do_crop', String(options.do_crop));
    fd.append('do_deskew', String(options.do_deskew));
    fd.append('do_clahe', String(options.do_clahe));
    fd.append('rotation', String(options.rotation));

    const res = await fetch(`${API_BASE}/documents/${docId}/enhance`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Enhancement failed');
    return res.json();
  },

  async saveDocument(docId: string, tiptapHtml: string, rawText?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${docId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiptap_html: tiptapHtml, raw_text: rawText })
    });
    if (!res.ok) throw new Error('Failed to autosave document');
    return res.json();
  },

  async askAI(
    docId: string,
    action: 'summarize' | 'explain' | 'correct' | 'translate' | 'qa',
    params?: { content?: string; query?: string; target_language?: string }
  ): Promise<AIAssistantResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        content: params?.content,
        query: params?.query,
        target_language: params?.target_language || 'Hindi'
      })
    });
    if (!res.ok) throw new Error('AI Assistant request failed');
    return res.json();
  },

  getExportUrl(docId: string, format: 'pdf' | 'docx' | 'xlsx' | 'txt'): string {
    return `${API_BASE}/documents/${docId}/export/${format}`;
  },

  async deleteDocument(docId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // ==========================================
  // SEJDA PDF SUITE TOOLKIT APIS
  // ==========================================

  async renderPdfPages(file: File): Promise<{
    pdf_id: string;
    filename: string;
    source_url: string;
    total_pages: number;
    pages: Array<{
      page_number: number;
      page_index: number;
      width: number;
      height: number;
      image_url: string;
      rotation: number;
      spans?: any[];
    }>;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/render-pages`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to render PDF pages');
    return res.json();
  },

  async mergePdfs(files: File[]): Promise<{
    download_url: string;
    filename: string;
    total_pages: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await fetch(`${API_BASE}/pdf/merge`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to merge PDFs');
    return res.json();
  },

  async splitPdf(file: File, pages: string): Promise<{
    download_url: string;
    filename: string;
    extracted_pages_count: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('pages', pages);
    const res = await fetch(`${API_BASE}/pdf/split`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to split PDF');
    return res.json();
  },

  async organizePdf(file: File, specs: any[]): Promise<{
    download_url: string;
    filename: string;
    final_page_count: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('specs', JSON.stringify(specs));
    const res = await fetch(`${API_BASE}/pdf/organize`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to organize PDF');
    return res.json();
  },

  async compressPdf(file: File, level: string = 'recommended'): Promise<{
    download_url: string;
    filename: string;
    original_size_bytes: number;
    compressed_size_bytes: number;
    saved_bytes: number;
    savings_percent: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('level', level);
    const res = await fetch(`${API_BASE}/pdf/compress`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to compress PDF');
    return res.json();
  },

  async protectPdf(file: File, password: string): Promise<{
    download_url: string;
    filename: string;
    status: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('password', password);
    const res = await fetch(`${API_BASE}/pdf/protect`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to protect PDF');
    return res.json();
  },

  async unlockPdf(file: File, password: string): Promise<{
    download_url: string;
    filename: string;
    status: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('password', password);
    const res = await fetch(`${API_BASE}/pdf/unlock`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to unlock PDF');
    }
    return res.json();
  },

  async watermarkPdf(
    file: File,
    text: string,
    opacity: number = 0.25,
    angle: number = 45,
    color: string = '#94a3b8'
  ): Promise<{
    download_url: string;
    filename: string;
    watermark_text: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('text', text);
    fd.append('opacity', String(opacity));
    fd.append('angle', String(angle));
    fd.append('color', color);
    const res = await fetch(`${API_BASE}/pdf/watermark`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to apply watermark');
    return res.json();
  },

  async pageNumbersPdf(
    file: File,
    position: string = 'bottom-center',
    formatPattern: string = 'Page {n} of {total}'
  ): Promise<{
    download_url: string;
    filename: string;
    total_pages: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('position', position);
    fd.append('format_pattern', formatPattern);
    const res = await fetch(`${API_BASE}/pdf/page-numbers`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to insert page numbers');
    return res.json();
  },

  async editSavePdf(file: File, annotations: any[]): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('annotations', JSON.stringify(annotations));
    const res = await fetch(`${API_BASE}/pdf/edit-save`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to save edited PDF');
    return res.json();
  },

  async clearPdfTemplate(file: File): Promise<{
    download_url: string;
    filename: string;
    total_spans_cleared: number;
    thumbnails: any[];
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/clear-template`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to clear PDF template');
    return res.json();
  },

  async imagesToPdf(files: File[]): Promise<{
    download_url: string;
    filename: string;
    pages: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await fetch(`${API_BASE}/pdf/images-to-pdf`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert images to PDF');
    return res.json();
  },

  async convertPdfToDocx(file: File): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/to-docx`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert PDF to Word');
    return res.json();
  },

  async convertPdfToXlsx(file: File): Promise<{
    download_url: string;
    filename: string;
    tables_extracted: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/to-xlsx`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to extract tables to Excel');
    return res.json();
  },

  async convertPdfToTxt(file: File): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/pdf/to-txt`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert PDF to Text');
    return res.json();
  }
};
