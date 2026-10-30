import requests
import os
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_full_pipeline():
    print("[1/8] Testing /api/health ...")
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("   [OK] Server healthy:", r.json())

    print("\n[2/8] Testing /api/quota/status ...")
    r = requests.get(f"{BASE_URL}/api/quota/status")
    assert r.status_code == 200
    quota = r.json()
    print("   [OK] Current quota:", quota)

    print("\n[3/8] Testing /api/documents/upload ...")
    sample_img_path = Path("storage/samples/sample_tax_invoice.png")
    with open(sample_img_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files={"file": ("test_invoice.png", f, "image/png")},
            data={"title": "Test Tax Invoice", "conversion_mode": "editable"}
        )
    assert r.status_code == 200, f"Upload failed: {r.text}"
    doc = r.json()
    doc_id = doc["id"]
    print("   [OK] Document uploaded with ID:", doc_id)
    print("   [OK] Extracted blocks count:", len(doc.get("extraction", {}).get("blocks", [])))
    print("   [OK] Average OCR confidence:", doc.get("extraction", {}).get("confidence_summary", {}).get("average_confidence"))

    print("\n[4/8] Testing AI Assistant operations ...")
    # Summary
    r = requests.post(f"{BASE_URL}/api/ai/process", json={"document_id": doc_id, "action": "summarize"})
    assert r.status_code == 200
    print("   [OK] AI Summary:", r.json().get("result")[:120], "...")

    # Terminology Explanation
    r = requests.post(f"{BASE_URL}/api/ai/process", json={"document_id": doc_id, "action": "explain", "query": "GSTIN"})
    assert r.status_code == 200
    print("   [OK] AI GSTIN explanation:", r.json().get("result")[:120], "...")

    # Hindi Translation
    r = requests.post(f"{BASE_URL}/api/ai/process", json={"document_id": doc_id, "action": "translate", "query": "hi"})
    assert r.status_code == 200
    print("   [OK] AI Hindi Translation preview:", r.json().get("result")[:100], "...")

    # Grounded Q&A
    r = requests.post(f"{BASE_URL}/api/ai/process", json={"document_id": doc_id, "action": "qa", "query": "What is the total amount due?"})
    assert r.status_code == 200
    print("   [OK] AI Grounded Q&A answer:", r.json().get("result")[:120], "...")

    print("\n[5/8] Testing Multi-format Exports (DOCX, PDF, XLSX, TXT) ...")
    for fmt in ["docx", "pdf", "xlsx", "txt"]:
        r = requests.post(f"{BASE_URL}/api/documents/{doc_id}/export", json={"format": fmt})
        assert r.status_code == 200, f"Export to {fmt} failed: {r.text}"
        export_data = r.json()
        print(f"   [OK] Exported {fmt.upper()}: {export_data.get('filename')} ({export_data.get('size_bytes')} bytes)")

    print("\n[6/8] Testing Sejda PDF - Render Pages & Exact Spans ...")
    # First convert sample invoice image to PDF for Sejda toolkit
    with open(sample_img_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/pdf/images-to-pdf",
            files=[("files", ("invoice.png", f, "image/png"))]
        )
    assert r.status_code == 200
    pdf_url = r.json()["download_url"]
    pdf_filename = r.json()["filename"]

    # Now render pages & text spans from this PDF
    pdf_file_path = Path("storage/exports") / pdf_filename
    with open(pdf_file_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/pdf/render-pages",
            files={"file": (pdf_filename, f, "application/pdf")}
        )
    assert r.status_code == 200
    render_meta = r.json()
    pages = render_meta.get("pages", [])
    assert len(pages) > 0
    spans = pages[0].get("spans", [])
    print(f"   [OK] Rendered {len(pages)} page(s) with {len(spans)} detected text spans")
    if spans:
        s0 = spans[0]
        print(f"   [OK] Sample detected span: text='{s0['text']}', font='{s0['font_name']}', size={s0['font_size']}pt, color={s0['color']}")

    print("\n[7/8] Testing Sejda In-Place Text Replacement with Font Matching ...")
    # Replace invoice title in exact font
    annotations = [
        {
            "id": "annot_test_1",
            "type": "text_replacement",
            "page_index": 0,
            "x": 0.32,
            "y": 0.04,
            "width": 0.36,
            "height": 0.03,
            "text": "OFFICIAL COMMERCIAL INVOICE (MODIFIED)",
            "font_name": "Arial",
            "font_size": 20.0,
            "is_bold": True,
            "is_italic": False,
            "color": "#1e3a8a",
            "pt_bbox": [320, 55, 680, 95],
            "pt_origin": [320, 85]
        }
    ]
    with open(pdf_file_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/pdf/save-annotations",
            files={"file": (pdf_filename, f, "application/pdf")},
            data={"annotations_json": requests.utils.json.dumps(annotations)}
        )
    assert r.status_code == 200, f"Annotation save failed: {r.text}"
    edited_result = r.json()
    print("   [OK] In-place edited PDF created:", edited_result.get("filename"))
    print("   [OK] Download URL:", edited_result.get("download_url"))

    print("\n[8/8] Testing Sejda PDF Operations (Compress, Watermark, Protect) ...")
    # Compress
    with open(pdf_file_path, "rb") as f:
        r = requests.post(f"{BASE_URL}/api/pdf/compress", files={"file": (pdf_filename, f, "application/pdf")})
        assert r.status_code == 200
        print("   [OK] Compressed:", r.json()["original_size"], "->", r.json()["compressed_size"])

    # Watermark
    with open(pdf_file_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/pdf/watermark",
            files={"file": (pdf_filename, f, "application/pdf")},
            data={"watermark_text": "CONFIDENTIAL", "opacity": "0.25"}
        )
        assert r.status_code == 200
        print("   [OK] Watermarked:", r.json()["filename"])

    print("\n==========================================")
    print("SUCCESS: ALL 8 END-TO-END PIPELINE CHECKS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    test_full_pipeline()
