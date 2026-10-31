import os
import shutil
import uuid
import fitz
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from app.config import (
    BASE_DIR, STORAGE_DIR, UPLOADS_DIR, PROCESSED_DIR, EXPORTS_DIR, SAMPLES_DIR,
    FREE_DAILY_DOC_LIMIT, PRO_DAILY_DOC_LIMIT, PLUS_DAILY_DOC_LIMIT
)
from app.models.schemas import (
    DocumentOut, QuotaStatus, ExtractionResult, SaveContentRequest,
    AIAssistantRequest, AIAssistantResponse, ExportResponse
)
from app.db.repository import (
    init_db, get_quota_status, reserve_quota_slot, finalize_quota_slot,
    release_quota_slot, update_user_plan, save_document_record,
    get_document_record, list_documents, delete_document_record,
    save_extraction_data, get_extraction_data, save_document_version,
    get_latest_version
)
from app.services.enhancer import enhance_document_image
from app.services.ocr_engine import process_document_ocr
from app.services.exporter import export_to_docx, export_to_pdf, export_to_xlsx, export_to_txt
from app.services.ai_assistant import (
    summarize_document, explain_difficult_terms, suggest_corrections,
    translate_content, answer_document_question, clean_text_from_html
)
from app.services.sample_generator import seed_sample_documents
from app.services.pdf_toolkit import (
    render_pdf_thumbnails, merge_pdfs, split_pdf, organize_pdf_pages,
    compress_pdf, protect_pdf, unlock_pdf, add_watermark, add_page_numbers,
    apply_pdf_editor_annotations, clear_pdf_template, convert_images_to_pdf,
    convert_pdf_to_docx, convert_pdf_to_xlsx, convert_pdf_to_txt
)
import json

# Initialize DB and pre-seed samples
init_db()
seed_sample_documents()

app = FastAPI(
    title="DocuMind AI Backend API",
    description="Intelligent Document Scanning, Extraction, Online Editing and Conversion Platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGIN", "*").split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories for image previews and downloads
app.mount("/storage/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/storage/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")
app.mount("/storage/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")
app.mount("/storage/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="samples")

@app.get("/")
def api_root():
    return RedirectResponse(
        url="https://main.d3sxcjwd3wtri0.amplifyapp.com/",
        status_code=307,
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DocuMind AI Platform API",
        "timestamp": datetime.now().isoformat(),
        "capabilities": [
            "OpenCV 4-Point Homography Warp & CLAHE",
            "Multi-Engine OCR with Per-Word Confidence",
            "Dual Mode: Clean Editable & Layout Preservation",
            "Dual-Pane Verification Workspace",
            "DOCX / PDF / XLSX / TXT Exporters",
            "AI Assistant (Summarize, Explain, Fix Typos, Translate Hindi/Eng, Grounded Q&A)",
            "Freemium Quota Enforcement with Midnight IST Reset"
        ]
    }

@app.get("/api/quota/status", response_model=QuotaStatus)
def quota_status(user_id: str = "default_user"):
    return get_quota_status(user_id)

@app.post("/api/quota/plan")
def change_plan(plan_id: str = Form(...), user_id: str = "default_user"):
    if plan_id not in ["free", "pro", "plus"]:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    update_user_plan(plan_id, user_id)
    return get_quota_status(user_id)

@app.get("/api/samples")
def list_samples():
    samples = []
    for item in SAMPLES_DIR.glob("*.*"):
        if item.suffix.lower() in [".png", ".jpg", ".jpeg", ".pdf"]:
            samples.append({
                "name": item.name,
                "title": item.stem.replace("_", " ").title(),
                "url": f"/storage/samples/{item.name}",
                "size_kb": round(item.stat().st_size / 1024, 1)
            })
    return samples

@app.post("/api/samples/{sample_name}/use")
def use_sample(sample_name: str, conversion_mode: str = "editable", user_id: str = "default_user"):
    # 1. Quota Check & Reservation
    if not reserve_quota_slot(user_id):
        quota = get_quota_status(user_id)
        raise HTTPException(
            status_code=429,
            detail=f"Daily processing quota exhausted ({quota['daily_limit']}/{quota['daily_limit']}). Resets at midnight IST."
        )

    sample_src = SAMPLES_DIR / sample_name
    if not sample_src.exists():
        release_quota_slot(user_id)
        raise HTTPException(status_code=404, detail="Sample not found")

    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    ext = sample_src.suffix.lower()
    dest_filename = f"{doc_id}{ext}"
    dest_path = UPLOADS_DIR / dest_filename
    shutil.copyfile(str(sample_src), str(dest_path))

    title = sample_src.stem.replace("_", " ").title()

    doc_record = {
        "id": doc_id,
        "user_id": user_id,
        "title": title,
        "filename": dest_filename,
        "original_ext": ext,
        "source_path": str(dest_path),
        "enhanced_path": None,
        "status": "uploaded",
        "conversion_mode": conversion_mode,
        "page_count": 1,
        "confidence_avg": 0.0
    }
    save_document_record(doc_record)

    # Automatically trigger enhancement & OCR for the sample so it is ready immediately!
    enhanced_filename = f"{doc_id}_enhanced.png"
    enhanced_path = PROCESSED_DIR / enhanced_filename
    try:
        enhance_document_image(str(dest_path), str(enhanced_path), do_crop=True, do_deskew=True, do_clahe=True)
        doc_record["enhanced_path"] = str(enhanced_path)
        doc_record["status"] = "enhanced"
    except Exception:
        doc_record["enhanced_path"] = str(dest_path)

    # Perform OCR
    extraction_res = process_document_ocr(doc_record["enhanced_path"], conversion_mode)
    extraction_res.document_id = doc_id
    doc_record["status"] = "extracted"
    doc_record["confidence_avg"] = extraction_res.confidence_summary.average_confidence
    doc_record["page_count"] = extraction_res.page_count

    save_document_record(doc_record)
    save_extraction_data(doc_id, extraction_res.dict())
    save_document_version(doc_id, extraction_res.tiptap_html, extraction_res.raw_text)

    # Finalize quota deduction
    finalize_quota_slot(user_id)

    return {
        "document_id": doc_id,
        "title": title,
        "status": doc_record["status"],
        "confidence_avg": doc_record["confidence_avg"],
        "extraction": extraction_res
    }

@app.get("/api/documents", response_model=List[DocumentOut])
def get_documents(user_id: str = "default_user"):
    docs = list_documents(user_id)
    out = []
    for d in docs:
        preview_filename = f"{d['id']}_preview.png"
        preview_path = PROCESSED_DIR / preview_filename
        if not preview_path.exists():
            source_p = d.get("source_path") or str(UPLOADS_DIR / d["filename"])
            ext = d.get("original_ext", "").lower()
            if (ext == ".pdf" or d["filename"].endswith(".pdf")) and Path(source_p).exists():
                try:
                    pdf_doc = fitz.open(source_p)
                    if len(pdf_doc) > 0:
                        pix = pdf_doc[0].get_pixmap(dpi=150)
                        pix.save(str(preview_path))
                    pdf_doc.close()
                except Exception as ex:
                    print(f"Error rendering PDF preview for {d['id']}:", ex)

        if preview_path.exists():
            enh_url = f"/storage/processed/{preview_filename}"
        elif d.get("enhanced_path") and not d["enhanced_path"].endswith(".pdf"):
            enh_url = f"/storage/processed/{Path(d['enhanced_path']).name}"
        else:
            enh_url = f"/storage/uploads/{d['filename']}"

        out.append(DocumentOut(
            id=d["id"],
            user_id=d["user_id"],
            title=d["title"],
            filename=d["filename"],
            source_url=f"/storage/uploads/{d['filename']}",
            enhanced_url=enh_url,
            status=d["status"],
            conversion_mode=d.get("conversion_mode", "editable"),
            page_count=d.get("page_count", 1),
            confidence_avg=d.get("confidence_avg", 0.0),
            created_at=d["created_at"],
            updated_at=d["updated_at"]
        ))
    return out

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    conversion_mode: str = Form("editable"),
    idempotency_key: Optional[str] = Form(None),
    user_id: str = Form("default_user")
):
    # 1. Enforce Server-Side Quota Before Storing & Processing
    if not reserve_quota_slot(user_id, idempotency_key):
        quota = get_quota_status(user_id)
        raise HTTPException(
            status_code=429,
            detail=f"Daily document processing allowance reached ({quota['daily_limit']}/{quota['daily_limit']} used). Resets at midnight IST."
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".pdf"]:
        release_quota_slot(user_id)
        raise HTTPException(status_code=400, detail="Supported formats: PNG, JPG, JPEG, WEBP, PDF")

    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    dest_filename = f"{doc_id}{ext}"
    dest_path = UPLOADS_DIR / dest_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_title = title if title and title.strip() else Path(file.filename).stem.replace("_", " ").title()

    doc_record = {
        "id": doc_id,
        "user_id": user_id,
        "title": doc_title,
        "filename": dest_filename,
        "original_ext": ext,
        "source_path": str(dest_path),
        "enhanced_path": None,
        "status": "uploaded",
        "conversion_mode": conversion_mode,
        "page_count": 1,
        "confidence_avg": 0.0
    }
    save_document_record(doc_record)

    # Auto-enhance if image
    if ext in [".png", ".jpg", ".jpeg", ".webp"]:
        enhanced_filename = f"{doc_id}_enhanced.png"
        enhanced_path = PROCESSED_DIR / enhanced_filename
        try:
            enhance_document_image(str(dest_path), str(enhanced_path), do_crop=True, do_deskew=True, do_clahe=True)
            doc_record["enhanced_path"] = str(enhanced_path)
            doc_record["status"] = "enhanced"
        except Exception:
            doc_record["enhanced_path"] = str(dest_path)
    else:
        # Render high-resolution page 0 preview PNG for PDF documents
        preview_filename = f"{doc_id}_preview.png"
        preview_path = PROCESSED_DIR / preview_filename
        try:
            pdf_doc = fitz.open(str(dest_path))
            if len(pdf_doc) > 0:
                pix = pdf_doc[0].get_pixmap(dpi=150)
                pix.save(str(preview_path))
                doc_record["enhanced_path"] = str(preview_path)
            else:
                doc_record["enhanced_path"] = str(dest_path)
            pdf_doc.close()
        except Exception:
            doc_record["enhanced_path"] = str(dest_path)

    # Run extraction
    try:
        # If enhanced_path is a preview image of a PDF, run OCR on the original PDF dest_path for best text extraction
        ocr_input = str(dest_path) if ext == ".pdf" else doc_record["enhanced_path"]
        extraction_res = process_document_ocr(ocr_input, conversion_mode)
        extraction_res.document_id = doc_id
        doc_record["status"] = "extracted"
        doc_record["confidence_avg"] = extraction_res.confidence_summary.average_confidence
        doc_record["page_count"] = extraction_res.page_count

        save_document_record(doc_record)
        save_extraction_data(doc_id, extraction_res.dict())
        save_document_version(doc_id, extraction_res.tiptap_html, extraction_res.raw_text)
        finalize_quota_slot(user_id)
    except Exception as e:
        release_quota_slot(user_id)
        raise HTTPException(status_code=500, detail=f"Extraction failure: {str(e)}")

    return {
        "document_id": doc_id,
        "title": doc_title,
        "status": doc_record["status"],
        "confidence_avg": doc_record["confidence_avg"],
        "extraction": extraction_res
    }

@app.get("/api/documents/{doc_id}")
def get_document_details(doc_id: str):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    extraction = get_extraction_data(doc_id)
    version = get_latest_version(doc_id)

    # Ensure viewable raster preview exists for PDF files
    ext = doc.get("original_ext", "").lower()
    enhanced_p = doc.get("enhanced_path")
    if ext == ".pdf" or (enhanced_p and enhanced_p.endswith(".pdf")):
        preview_filename = f"{doc_id}_preview.png"
        preview_path = PROCESSED_DIR / preview_filename
        if not preview_path.exists():
            source_p = doc.get("source_path") or str(UPLOADS_DIR / doc["filename"])
            if Path(source_p).exists():
                try:
                    pdf_doc = fitz.open(source_p)
                    if len(pdf_doc) > 0:
                        pix = pdf_doc[0].get_pixmap(dpi=150)
                        pix.save(str(preview_path))
                    pdf_doc.close()
                except Exception as ex:
                    print(f"Error rendering PDF preview for {doc_id}:", ex)
        if preview_path.exists():
            enhanced_url = f"/storage/processed/{preview_filename}"
        else:
            enhanced_url = f"/storage/uploads/{doc['filename']}"
    else:
        enhanced_url = f"/storage/processed/{Path(doc['enhanced_path']).name}" if doc.get("enhanced_path") else f"/storage/uploads/{doc['filename']}"

    return {
        "id": doc["id"],
        "user_id": doc["user_id"],
        "title": doc["title"],
        "filename": doc["filename"],
        "source_url": f"/storage/uploads/{doc['filename']}",
        "enhanced_url": enhanced_url,
        "status": doc["status"],
        "conversion_mode": doc.get("conversion_mode", "editable"),
        "page_count": doc.get("page_count", 1),
        "confidence_avg": doc.get("confidence_avg", 0.0),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
        "extraction": extraction,
        "latest_content_html": version["content_html"] if version else (extraction.get("tiptap_html", "") if extraction else "")
    }

@app.post("/api/documents/{doc_id}/enhance")
def re_enhance_document(
    doc_id: str,
    do_crop: bool = Form(True),
    do_deskew: bool = Form(True),
    do_clahe: bool = Form(True),
    rotation: int = Form(0)
):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ext = doc["original_ext"]
    if ext == ".pdf":
        return {"message": "Enhancement not required for digital PDF"}

    enhanced_filename = f"{doc_id}_enhanced_{rotation}.png"
    enhanced_path = PROCESSED_DIR / enhanced_filename

    enhancement_meta = enhance_document_image(
        doc["source_path"],
        str(enhanced_path),
        do_crop=do_crop,
        do_deskew=do_deskew,
        do_clahe=do_clahe,
        rotation_degrees=rotation
    )

    doc["enhanced_path"] = str(enhanced_path)
    doc["status"] = "enhanced"
    save_document_record(doc)

    # Re-run OCR with new enhanced image
    extraction_res = process_document_ocr(str(enhanced_path), doc.get("conversion_mode", "editable"))
    extraction_res.document_id = doc_id
    doc["status"] = "extracted"
    doc["confidence_avg"] = extraction_res.confidence_summary.average_confidence
    save_document_record(doc)
    save_extraction_data(doc_id, extraction_res.dict())
    save_document_version(doc_id, extraction_res.tiptap_html, extraction_res.raw_text)

    return {
        "enhanced_url": f"/storage/processed/{enhanced_filename}",
        "enhancement_meta": enhancement_meta,
        "extraction": extraction_res
    }

@app.post("/api/documents/{doc_id}/save")
def save_document_content(doc_id: str, req: SaveContentRequest):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    raw_text = req.raw_text or clean_text_from_html(req.tiptap_html)
    save_document_version(doc_id, req.tiptap_html, raw_text)
    
    return {"message": "Document autosaved successfully", "doc_id": doc_id, "timestamp": datetime.now().isoformat()}

@app.post("/api/documents/{doc_id}/ai", response_model=AIAssistantResponse)
def execute_ai_assistant(doc_id: str, req: AIAssistantRequest):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    version = get_latest_version(doc_id)
    html_content = req.content or (version["content_html"] if version else "")
    text_content = clean_text_from_html(html_content)

    if req.action == "summarize":
        res_text = summarize_document(text_content, doc["title"])
        return AIAssistantResponse(action="summarize", result=res_text)

    elif req.action == "explain":
        res_text = explain_difficult_terms(text_content)
        return AIAssistantResponse(action="explain", result=res_text)

    elif req.action == "correct":
        corrections = suggest_corrections(text_content)
        res_text = f"Found {corrections['corrections_count']} formatting & OCR correction candidate(s):\n\n"
        for item in corrections["items"]:
            res_text += f"• **Original:** `{item['original']}` $\\rightarrow$ **Suggested:** `{item['suggestion']}` ({item['reason']})\n"
        res_text += f"\n*{corrections['recommendation']}*"
        return AIAssistantResponse(action="correct", result=res_text, metadata=corrections)

    elif req.action == "translate":
        res_text = translate_content(text_content, req.target_language or "Hindi")
        return AIAssistantResponse(action="translate", result=res_text)

    elif req.action == "qa":
        qa_data = answer_document_question(text_content, req.query or "What is this document?")
        return AIAssistantResponse(
            action="qa",
            result=qa_data["answer"],
            citations=qa_data["citations"]
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown AI action: {req.action}")

@app.get("/api/documents/{doc_id}/export/{format_type}")
def export_document(doc_id: str, format_type: str):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    version = get_latest_version(doc_id)
    html_content = version["content_html"] if version else ""
    title = doc["title"]
    fmt = format_type.lower()

    if fmt == "docx":
        path = export_to_docx(html_content, title, doc_id)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "pdf":
        path = export_to_pdf(html_content, title, doc_id)
        media_type = "application/pdf"
    elif fmt == "xlsx":
        # Extract tables from extraction if available
        ext_data = get_extraction_data(doc_id)
        table_data = None
        if ext_data and "blocks" in ext_data:
            for b in ext_data["blocks"]:
                if b.get("type") == "table" and b.get("table_data"):
                    table_data = b["table_data"]
                    break
        path = export_to_xlsx(html_content, title, doc_id, table_data=table_data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif fmt == "txt":
        path = export_to_txt(html_content, title, doc_id)
        media_type = "text/plain"
    else:
        raise HTTPException(status_code=400, detail="Supported export formats: pdf, docx, xlsx, txt")

    file_p = Path(path)
    return FileResponse(
        path=str(file_p),
        media_type=media_type,
        filename=file_p.name
    )

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    doc = get_document_record(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Secure deletion of source & enhanced files
    if doc.get("source_path") and Path(doc["source_path"]).exists():
        try:
            os.remove(doc["source_path"])
        except Exception:
            pass

    if doc.get("enhanced_path") and Path(doc["enhanced_path"]).exists() and doc["enhanced_path"] != doc["source_path"]:
        try:
            os.remove(doc["enhanced_path"])
        except Exception:
            pass

    # Delete exports matching doc_id
    for exp_file in EXPORTS_DIR.glob(f"*{doc_id[:6]}*"):
        try:
            os.remove(exp_file)
        except Exception:
            pass

    delete_document_record(doc_id)
    return {"message": "Document and all associated assets deleted securely", "doc_id": doc_id}

# ==========================================
# SEJDA PDF TOOLKIT API ENDPOINTS
# ==========================================

@app.post("/api/pdf/render-pages")
async def api_render_pdf_pages(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    upload_id = f"pdf_{uuid.uuid4().hex[:10]}"
    dest_path = UPLOADS_DIR / f"{upload_id}.pdf"
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pages = render_pdf_thumbnails(str(dest_path))
    return {
        "pdf_id": upload_id,
        "filename": file.filename,
        "source_url": f"/storage/uploads/{upload_id}.pdf",
        "total_pages": len(pages),
        "pages": pages
    }

@app.post("/api/pdf/merge")
async def api_merge_pdfs(files: List[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 PDF files are required to merge")

    saved_paths = []
    for f in files:
        pid = f"merge_{uuid.uuid4().hex[:8]}"
        p = UPLOADS_DIR / f"{pid}.pdf"
        with open(p, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
        saved_paths.append(str(p))

    out_name = f"Merged_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = merge_pdfs(saved_paths, str(out_path))
    return result

@app.post("/api/pdf/split")
async def api_split_pdf(file: UploadFile = File(...), pages: str = Form(...)):
    pid = f"split_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Parse pages list (comma separated or range string like "1,2,3" or "1-3")
    page_numbers = []
    for part in pages.replace(" ", "").split(","):
        if "-" in part:
            start, end = part.split("-")
            page_numbers.extend(range(int(start), int(end) + 1))
        elif part.isdigit():
            page_numbers.append(int(part))

    out_name = f"Split_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = split_pdf(str(p), page_numbers, str(out_path))
    return result

@app.post("/api/pdf/organize")
async def api_organize_pdf(file: UploadFile = File(...), specs: str = Form(...)):
    pid = f"org_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    page_specs = json.loads(specs)
    out_name = f"Organized_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = organize_pdf_pages(str(p), page_specs, str(out_path))
    return result

@app.post("/api/pdf/compress")
async def api_compress_pdf(file: UploadFile = File(...), level: str = Form("recommended")):
    pid = f"comp_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Compressed_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = compress_pdf(str(p), str(out_path), level=level)
    return result

@app.post("/api/pdf/protect")
async def api_protect_pdf(file: UploadFile = File(...), password: str = Form(...)):
    pid = f"prot_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Protected_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = protect_pdf(str(p), password, str(out_path))
    return result

@app.post("/api/pdf/unlock")
async def api_unlock_pdf(file: UploadFile = File(...), password: str = Form(...)):
    pid = f"unl_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Unlocked_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    try:
        result = unlock_pdf(str(p), password, str(out_path))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/pdf/watermark")
async def api_watermark_pdf(
    file: UploadFile = File(...),
    text: str = Form("CONFIDENTIAL"),
    opacity: float = Form(0.25),
    angle: int = Form(45),
    color: str = Form("#94a3b8")
):
    pid = f"wm_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Watermarked_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = add_watermark(str(p), str(out_path), text=text, opacity=opacity, angle=angle, color_hex=color)
    return result

@app.post("/api/pdf/page-numbers")
async def api_page_numbers_pdf(
    file: UploadFile = File(...),
    position: str = Form("bottom-center"),
    format_pattern: str = Form("Page {n} of {total}")
):
    pid = f"pgn_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Numbered_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = add_page_numbers(str(p), str(out_path), position=position, format_pattern=format_pattern)
    return result

@app.post("/api/pdf/edit-save")
async def api_edit_save_pdf(file: UploadFile = File(...), annotations: str = Form(...)):
    pid = f"annot_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    annot_list = json.loads(annotations)
    out_name = f"Edited_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = apply_pdf_editor_annotations(str(p), str(out_path), annot_list)
    return result

@app.get("/api/pdf/download/{filename}")
async def api_download_edited_pdf(filename: str):
    safe_filename = Path(filename).name
    if (
        safe_filename != filename
        or "/" in filename
        or "\\" in filename
        or not safe_filename.lower().endswith(".pdf")
    ):
        raise HTTPException(status_code=400, detail="Invalid PDF filename")

    pdf_path = EXPORTS_DIR / safe_filename
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="Edited PDF not found. It may have expired; apply the changes again.")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=safe_filename,
        content_disposition_type="attachment"
    )

@app.post("/api/pdf/clear-template")
async def api_clear_pdf_template(file: UploadFile = File(...)):
    pid = f"clrtpl_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"Blank_Template_{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = clear_pdf_template(str(p), str(out_path))
    return result

@app.post("/api/pdf/images-to-pdf")
async def api_images_to_pdf(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="At least 1 image file is required")

    saved_images = []
    for f in files:
        pid = f"img_{uuid.uuid4().hex[:8]}"
        ext = Path(f.filename).suffix.lower()
        p = UPLOADS_DIR / f"{pid}{ext}"
        with open(p, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
        saved_images.append(str(p))

    out_name = f"Converted_{uuid.uuid4().hex[:6]}.pdf"
    out_path = EXPORTS_DIR / out_name
    result = convert_images_to_pdf(saved_images, str(out_path))
    return result

@app.post("/api/pdf/to-docx")
async def api_pdf_to_docx(file: UploadFile = File(...)):
    pid = f"conv_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.docx"
    out_path = EXPORTS_DIR / out_name
    result = convert_pdf_to_docx(str(p), str(out_path))
    return result

@app.post("/api/pdf/to-xlsx")
async def api_pdf_to_xlsx(file: UploadFile = File(...)):
    pid = f"conv_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"{Path(file.filename).stem}_Tables_{uuid.uuid4().hex[:6]}.xlsx"
    out_path = EXPORTS_DIR / out_name
    result = convert_pdf_to_xlsx(str(p), str(out_path))
    return result

@app.post("/api/pdf/to-txt")
async def api_pdf_to_txt(file: UploadFile = File(...)):
    pid = f"conv_{uuid.uuid4().hex[:8]}"
    p = UPLOADS_DIR / f"{pid}.pdf"
    with open(p, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    out_name = f"{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}.txt"
    out_path = EXPORTS_DIR / out_name
    result = convert_pdf_to_txt(str(p), str(out_path))
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
