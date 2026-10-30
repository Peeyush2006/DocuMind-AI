export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  is_uncertain: boolean;
}

export interface ExtractedBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'table' | 'list_item' | 'metadata';
  text: string;
  confidence: number;
  bbox?: BoundingBox;
  words: ExtractedWord[];
  table_data?: string[][];
}

export interface ConfidenceSummary {
  average_confidence: number;
  uncertain_word_count: number;
  total_word_count: number;
  review_recommended: boolean;
}

export interface ExtractionResult {
  document_id: string;
  mode: 'editable' | 'layout';
  blocks: ExtractedBlock[];
  confidence_summary: ConfidenceSummary;
  page_count: number;
  detected_language: string;
  tiptap_html: string;
  raw_text: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  source_url: string;
  enhanced_url?: string;
  status: 'uploaded' | 'enhanced' | 'extracted' | 'edited';
  conversion_mode: 'editable' | 'layout';
  page_count: number;
  confidence_avg: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetails extends DocumentItem {
  extraction?: ExtractionResult;
  latest_content_html?: string;
}

export interface QuotaStatus {
  plan_id: 'free' | 'pro' | 'plus';
  plan_name: string;
  daily_limit: number;
  documents_used_today: number;
  remaining_today: number;
  resets_at_ist: string;
  can_process_new: boolean;
  page_limit_per_doc: number;
}

export interface SampleDocument {
  name: string;
  title: string;
  url: string;
  size_kb: number;
}

export interface AIAssistantResponse {
  action: string;
  result: string;
  citations?: Array<{ section: string; snippet: string }>;
  metadata?: any;
}
