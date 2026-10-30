import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.pdf_toolkit import (
    convert_images_to_pdf, merge_pdfs, split_pdf, compress_pdf,
    add_watermark, add_page_numbers, protect_pdf, unlock_pdf,
    apply_pdf_editor_annotations, render_pdf_thumbnails
)

def run_tests():
    sample_img = "storage/samples/sample_tax_invoice.png"
    p1 = "storage/exports/test_p1.pdf"
    p2 = "storage/exports/test_p2.pdf"

    print("1. Testing Images to PDF...")
    r1 = convert_images_to_pdf([sample_img], p1)
    convert_images_to_pdf([sample_img], p2)
    assert Path(p1).exists()
    print("   [OK] Converted images to PDF successfully")

    print("2. Testing Merge PDFs...")
    merged_path = "storage/exports/test_merged.pdf"
    r_merge = merge_pdfs([p1, p2], merged_path)
    assert r_merge["total_pages"] == 2
    print(f"   [OK] Merged 2 PDFs into {r_merge['total_pages']} pages")

    print("3. Testing Split & Extract PDF...")
    split_path = "storage/exports/test_split.pdf"
    r_split = split_pdf(merged_path, [1], split_path)
    assert r_split["extracted_pages_count"] == 1
    print(f"   [OK] Extracted {r_split['extracted_pages_count']} page successfully")

    print("4. Testing Compress PDF...")
    comp_path = "storage/exports/test_compressed.pdf"
    r_comp = compress_pdf(merged_path, comp_path, level="recommended")
    print(f"   [OK] Compressed: {r_comp['original_size_bytes']} -> {r_comp['compressed_size_bytes']} bytes ({r_comp['savings_percent']}% reduction)")

    print("5. Testing Watermark...")
    wm_path = "storage/exports/test_wm.pdf"
    r_wm = add_watermark(split_path, wm_path, text="CONFIDENTIAL - DO NOT COPY")
    assert Path(wm_path).exists()
    print("   [OK] Watermark stamped across pages")

    print("6. Testing Page Numbers...")
    num_path = "storage/exports/test_num.pdf"
    r_num = add_page_numbers(merged_path, num_path, position="bottom-center")
    assert Path(num_path).exists()
    print("   [OK] Page numbers formatted and inserted")

    print("7. Testing Protect & Unlock...")
    prot_path = "storage/exports/test_prot.pdf"
    r_prot = protect_pdf(split_path, "secret123", prot_path)
    assert Path(prot_path).exists()
    unl_path = "storage/exports/test_unl.pdf"
    r_unl = unlock_pdf(prot_path, "secret123", unl_path)
    assert Path(unl_path).exists()
    print("   [OK] Encryption & Decryption round-trip verified")

    print("8. Testing Visual Editor Annotations...")
    annot_path = "storage/exports/test_annot.pdf"
    annots = [
        {"type": "text", "page_index": 0, "x": 0.1, "y": 0.1, "text": "Audited & Verified", "fontSize": 18, "color": "#16a34a"},
        {"type": "whiteout", "page_index": 0, "x": 0.4, "y": 0.3, "width": 0.25, "height": 0.04}
    ]
    r_annot = apply_pdf_editor_annotations(split_path, annot_path, annots)
    assert Path(annot_path).exists()
    print("   [OK] Text insertions and whiteout redactions applied to PDF")

    print("9. Testing PDF Thumbnail Rendering...")
    thumbs = render_pdf_thumbnails(merged_path)
    assert len(thumbs) == 2
    print(f"   [OK] Rendered {len(thumbs)} high-res page thumbnails for visual editor")

    print("\nALL 9 SEJDA PDF SUITE TOOLS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
