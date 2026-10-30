import {
  DocumentItem,
  DocumentDetails,
  QuotaStatus,
  SampleDocument,
  AIAssistantResponse
} from '../types';

const BACKEND_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE = BACKEND_ORIGIN ? `${BACKEND_ORIGIN}/api` : '/api';

export function backendUrl(path: string): string {
  if (/^https?:\/\//i.test(path) || !BACKEND_ORIGIN) return path;
  return `${BACKEND_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function resolveBackendStorageUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.startsWith('/storage/') ? backendUrl(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(resolveBackendStorageUrls) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveBackendStorageUrls(item)])
    ) as T;
  }
  return value;
}

export async function backendFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (BACKEND_ORIGIN.includes('loca.lt')) {
    headers.set('bypass-tunnel-reminder', 'true');
  }
  return fetch(input, { ...init, headers });
}

export const api = {
  // --- Quota & Plans ---
  async getQuota(): Promise<QuotaStatus> {
    const res = await backendFetch(`${API_BASE}/quota/status`);
    if (!res.ok) throw new Error('Failed to fetch quota');
    return res.json().then(resolveBackendStorageUrls);
  },

  async setPlan(planId: string): Promise<QuotaStatus> {
    const fd = new FormData();
    fd.append('plan_id', planId);
    const res = await backendFetch(`${API_BASE}/quota/plan`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to change plan');
    return res.json().then(resolveBackendStorageUrls);
  },

  // --- Document Intelligence & OCR ---
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await backendFetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json().then(resolveBackendStorageUrls);
  },

  async getDocument(id: string): Promise<DocumentDetails> {
    const res = await backendFetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json().then(resolveBackendStorageUrls);
  },

  async getSamples(): Promise<SampleDocument[]> {
    const res = await backendFetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error('Failed to fetch samples');
    return res.json().then(resolveBackendStorageUrls);
  },

  async useSample(sampleName: string, conversionMode: string = 'editable'): Promise<any> {
    const res = await backendFetch(`${API_BASE}/samples/${sampleName}/use?conversion_mode=${conversionMode}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to use sample');
    }
    return res.json().then(resolveBackendStorageUrls);
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

    const res = await backendFetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload document');
    }
    return res.json().then(resolveBackendStorageUrls);
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

    const res = await backendFetch(`${API_BASE}/documents/${docId}/enhance`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Enhancement failed');
    return res.json().then(resolveBackendStorageUrls);
  },

  async saveDocument(docId: string, tiptapHtml: string, rawText?: string): Promise<any> {
    const res = await backendFetch(`${API_BASE}/documents/${docId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiptap_html: tiptapHtml, raw_text: rawText })
    });
    if (!res.ok) throw new Error('Failed to autosave document');
    return res.json().then(resolveBackendStorageUrls);
  },

  async askAI(
    docId: string,
    action: 'summarize' | 'explain' | 'correct' | 'translate' | 'qa',
    params?: { content?: string; query?: string; target_language?: string }
  ): Promise<AIAssistantResponse> {
    const res = await backendFetch(`${API_BASE}/documents/${docId}/ai`, {
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
    return res.json().then(resolveBackendStorageUrls);
  },

  getExportUrl(docId: string, format: 'pdf' | 'docx' | 'xlsx' | 'txt'): string {
    return `${API_BASE}/documents/${docId}/export/${format}`;
  },

  async deleteDocument(docId: string): Promise<any> {
    const res = await backendFetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json().then(resolveBackendStorageUrls);
  },

  // ==========================================
  // DocMind AI PDF tool APIs
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
    const res = await backendFetch(`${API_BASE}/pdf/render-pages`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to render PDF pages');
    return res.json().then(resolveBackendStorageUrls);
  },

  async mergePdfs(files: File[]): Promise<{
    download_url: string;
    filename: string;
    total_pages: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await backendFetch(`${API_BASE}/pdf/merge`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to merge PDFs');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/split`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to split PDF');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/organize`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to organize PDF');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/compress`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to compress PDF');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/protect`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to protect PDF');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/unlock`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to unlock PDF');
    }
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/watermark`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to apply watermark');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/page-numbers`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to insert page numbers');
    return res.json().then(resolveBackendStorageUrls);
  },

  async editSavePdf(file: File, annotations: any[]): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('annotations', JSON.stringify(annotations));
    const res = await backendFetch(`${API_BASE}/pdf/edit-save`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to save edited PDF');
    return res.json().then(resolveBackendStorageUrls);
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
    const res = await backendFetch(`${API_BASE}/pdf/clear-template`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to clear PDF template');
    return res.json().then(resolveBackendStorageUrls);
  },

  async imagesToPdf(files: File[]): Promise<{
    download_url: string;
    filename: string;
    pages: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await backendFetch(`${API_BASE}/pdf/images-to-pdf`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert images to PDF');
    return res.json().then(resolveBackendStorageUrls);
  },

  async convertPdfToDocx(file: File): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await backendFetch(`${API_BASE}/pdf/to-docx`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert PDF to Word');
    return res.json().then(resolveBackendStorageUrls);
  },

  async convertPdfToXlsx(file: File): Promise<{
    download_url: string;
    filename: string;
    tables_extracted: number;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await backendFetch(`${API_BASE}/pdf/to-xlsx`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to extract tables to Excel');
    return res.json().then(resolveBackendStorageUrls);
  },

  async convertPdfToTxt(file: File): Promise<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await backendFetch(`${API_BASE}/pdf/to-txt`, {
      method: 'POST',
      body: fd
    });
    if (!res.ok) throw new Error('Failed to convert PDF to Text');
    return res.json().then(resolveBackendStorageUrls);
  }
};
