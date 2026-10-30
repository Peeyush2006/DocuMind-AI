from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class ExtractedWord(BaseModel):
    text: str
    confidence: float
    bbox: BoundingBox
    is_uncertain: bool = False

class TableCell(BaseModel):
    text: str
    row: int
    col: int
    confidence: float = 0.95

class ExtractedBlock(BaseModel):
    id: str
    type: str # "heading", "paragraph", "table", "list_item", "metadata"
    text: str
    confidence: float
    bbox: Optional[BoundingBox] = None
    words: List[ExtractedWord] = []
    table_data: Optional[List[List[str]]] = None # 2D array of rows/cells if type == "table"

class ConfidenceSummary(BaseModel):
    average_confidence: float
    uncertain_word_count: int
    total_word_count: int
    review_recommended: bool

class ExtractionResult(BaseModel):
    document_id: str
    mode: str # "editable" or "layout"
    blocks: List[ExtractedBlock]
    confidence_summary: ConfidenceSummary
    page_count: int = 1
    detected_language: str = "en"
    tiptap_html: str
    raw_text: str

class DocumentCreate(BaseModel):
    title: str
    conversion_mode: str = "editable" # "editable" or "layout"

class DocumentOut(BaseModel):
    id: str
    user_id: str
    title: str
    filename: str
    source_url: str
    enhanced_url: Optional[str] = None
    status: str # "uploaded", "enhanced", "extracted", "edited"
    conversion_mode: str
    page_count: int
    confidence_avg: float
    created_at: str
    updated_at: str

class SaveContentRequest(BaseModel):
    tiptap_html: str
    raw_text: Optional[str] = None

class QuotaStatus(BaseModel):
    plan_id: str
    plan_name: str
    daily_limit: int
    documents_used_today: int
    remaining_today: int
    resets_at_ist: str
    can_process_new: bool
    page_limit_per_doc: int

class AIAssistantRequest(BaseModel):
    action: str # "summarize", "explain", "correct", "translate", "qa"
    content: Optional[str] = None
    query: Optional[str] = None
    target_language: Optional[str] = "Hindi"

class AIAssistantResponse(BaseModel):
    action: str
    result: str
    citations: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None

class ExportResponse(BaseModel):
    format: str
    download_url: str
    filename: str
    size_bytes: int
