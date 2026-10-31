import os
import io
import fitz # PyMuPDF
from pypdf import PdfReader, PdfWriter
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image
import base64
from functools import lru_cache
from app.config import PROCESSED_DIR, EXPORTS_DIR

WINDOWS_FONTS_DIR = Path("C:/Windows/Fonts")

@lru_cache(maxsize=64)
def get_system_font_path(font_name: str, is_bold: bool = False, is_italic: bool = False) -> Optional[str]:
    """Resolve a local TrueType font on Windows or Linux for PDF text insertion."""
    fn = (font_name or "").lower()
    bold = is_bold or ("bold" in fn) or ("black" in fn) or ("heavy" in fn)
    italic = is_italic or ("italic" in fn) or ("oblique" in fn)

    if "calibri" in fn:
        f = "calibriz.ttf" if (bold and italic) else ("calibrib.ttf" if bold else ("calibrii.ttf" if italic else "calibri.ttf"))
    elif any(k in fn for k in ["times", "serif", "roman"]):
        f = "timesbi.ttf" if (bold and italic) else ("timesbd.ttf" if bold else ("timesi.ttf" if italic else "times.ttf"))
    elif any(k in fn for k in ["courier", "mono", "consolas"]):
        f = "courbi.ttf" if (bold and italic) else ("courbd.ttf" if bold else ("couri.ttf" if italic else "cour.ttf"))
    elif "segoe" in fn:
        f = "segoeuiz.ttf" if (bold and italic) else ("segoeuib.ttf" if bold else ("segoeuii.ttf" if italic else "segoeui.ttf"))
    elif "verdana" in fn:
        f = "verdanaz.ttf" if (bold and italic) else ("verdanab.ttf" if bold else ("verdanai.ttf" if italic else "verdana.ttf"))
    elif "tahoma" in fn:
        f = "tahomabd.ttf" if bold else "tahoma.ttf"
    else: # Default: Arial / Helvetica / Sans-serif
        f = "arialbi.ttf" if (bold and italic) else ("arialbd.ttf" if bold else ("ariali.ttf" if italic else "arial.ttf"))

    p = WINDOWS_FONTS_DIR / f
    if p.exists():
        return str(p)

    # Render and other Linux hosts do not have Windows fonts. Prefer metrically
    # compatible Liberation fonts, then DejaVu as a widely installed fallback.
    linux_names = []
    if any(k in fn for k in ["times", "serif", "roman"]):
        linux_names = [
            "LiberationSerif-BoldItalic.ttf" if bold and italic else
            "LiberationSerif-Bold.ttf" if bold else
            "LiberationSerif-Italic.ttf" if italic else "LiberationSerif-Regular.ttf",
            "DejaVuSerif-Bold.ttf" if bold else "DejaVuSerif.ttf",
        ]
    elif any(k in fn for k in ["courier", "mono", "consolas"]):
        linux_names = [
            "LiberationMono-BoldItalic.ttf" if bold and italic else
            "LiberationMono-Bold.ttf" if bold else
            "LiberationMono-Italic.ttf" if italic else "LiberationMono-Regular.ttf",
            "DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf",
        ]
    else:
        linux_names = [
            "LiberationSans-BoldItalic.ttf" if bold and italic else
            "LiberationSans-Bold.ttf" if bold else
            "LiberationSans-Italic.ttf" if italic else "LiberationSans-Regular.ttf",
            "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        ]

    font_roots = (Path("/usr/share/fonts"), Path("/usr/local/share/fonts"))
    for root in font_roots:
        for name in linux_names:
            matches = list(root.rglob(name)) if root.exists() else []
            if matches:
                return str(matches[0])
    return None

def map_font_name_to_fitz(font_name: str, is_bold: bool = False, is_italic: bool = False) -> str:
    """Maps arbitrary font name and style flags to PyMuPDF's built-in standard Type-1 font codes"""
    fname_lower = (font_name or "").lower()
    bold = is_bold or ("bold" in fname_lower) or ("black" in fname_lower) or ("heavy" in fname_lower)
    italic = is_italic or ("italic" in fname_lower) or ("oblique" in fname_lower) or ("slanted" in fname_lower)

    if any(k in fname_lower for k in ["times", "serif", "roman", "georgia", "garamond"]):
        if bold and italic:
            return "tibi"
        elif bold:
            return "tibo"
        elif italic:
            return "tiit"
        else:
            return "times"
    elif any(k in fname_lower for k in ["courier", "mono", "consolas", "typewriter", "code"]):
        if bold and italic:
            return "cobi"
        elif bold:
            return "cobo"
        elif italic:
            return "coit"
        else:
            return "cour"
    else: # Default: Helvetica / Arial / Sans-Serif
        if bold and italic:
            return "hebi"
        elif bold:
            return "hebo"
        elif italic:
            return "heit"
        else:
            return "helv"


def find_page_font_reference(page_fonts, font_name: str) -> Optional[str]:
    """Return the PDF font resource matching an extracted span's font name."""
    def normalize(name: str) -> str:
        name = (name or "").split("+")[-1].lower()
        return "".join(char for char in name if char.isalnum())

    target = normalize(font_name)
    if not target:
        return None

    partial_matches = []
    for font in page_fonts:
        if len(font) < 5:
            continue
        resource_name = font[4]
        base_name = normalize(font[3])
        if not resource_name or not base_name:
            continue
        if target == base_name:
            return f"/{resource_name}"
        if min(len(target), len(base_name)) >= 6 and (target in base_name or base_name in target):
            partial_matches.append(f"/{resource_name}")

    return partial_matches[0] if len(partial_matches) == 1 else None

def sample_span_bg(pix, bbox, pw: float, ph: float) -> str:
    """Samples the background color immediately surrounding the text bbox to detect colored banners/headers"""
    if not pix:
        return "#ffffff"
    try:
        scale_x = pix.width / pw
        scale_y = pix.height / ph
        x0, y0, x1, y1 = bbox
        pts = [
            (int((x0 - 2) * scale_x), int((y0 + y1) / 2 * scale_y)),
            (int((x1 + 2) * scale_x), int((y0 + y1) / 2 * scale_y)),
            (int((x0 + x1) / 2 * scale_x), int((y0 - 2) * scale_y)),
            (int((x0 + x1) / 2 * scale_x), int((y1 + 2) * scale_y)),
            (int((x0 - 2) * scale_x), int((y0 - 2) * scale_y)),
            (int((x1 + 2) * scale_x), int((y0 - 2) * scale_y)),
        ]
        samples = []
        for px, py in pts:
            px = max(0, min(pix.width - 1, px))
            py = max(0, min(pix.height - 1, py))
            samples.append(pix.pixel(px, py)[:3])
        from collections import Counter
        c = Counter(samples)
        most_common = c.most_common(1)[0][0]
        return '#{:02x}{:02x}{:02x}'.format(*most_common)
    except Exception:
        return "#ffffff"

def extract_page_spans(page, pw: float, ph: float, page_idx: int, pix=None) -> List[Dict[str, Any]]:
    """Extracts all consolidated, non-overlapping text spans from a PDF page with exact font, size, style, color, background color, and coordinates"""
    spans_out = []
    blocks = page.get_text("dict").get("blocks", [])
    span_counter = 0

    for b in blocks:
        if "lines" in b:
            for line in b["lines"]:
                line_spans = line.get("spans", [])
                if not line_spans:
                    continue

                # Consolidate adjacent fragments on the same line to avoid overlapping boxes
                merged_runs = []
                curr_run = None

                for s in line_spans:
                    raw_text = s.get("text", "")
                    if not raw_text:
                        continue

                    bbox = list(s.get("bbox", [0, 0, 0, 0]))
                    font_name = s.get("font", "Helvetica")
                    font_size = round(s.get("size", 12.0), 1)
                    flags = s.get("flags", 0)
                    is_bold = bool(flags & 16) or ("bold" in font_name.lower())
                    is_italic = bool(flags & 2) or ("italic" in font_name.lower()) or ("oblique" in font_name.lower())

                    c = s.get("color", 0)
                    r = (c >> 16) & 255
                    g = (c >> 8) & 255
                    b_col = c & 255
                    color_hex = f"#{r:02x}{g:02x}{b_col:02x}"
                    orig = list(s.get("origin", (bbox[0], bbox[3])))

                    if curr_run is None:
                        curr_run = {
                            "text": raw_text,
                            "bbox": bbox,
                            "origin": orig,
                            "font_name": font_name,
                            "font_size": font_size,
                            "is_bold": is_bold,
                            "is_italic": is_italic,
                            "color": color_hex
                        }
                    else:
                        same_font = (curr_run["font_name"] == font_name)
                        same_size = abs(curr_run["font_size"] - font_size) < 0.5
                        same_color = (curr_run["color"] == color_hex)
                        same_style = (curr_run["is_bold"] == is_bold and curr_run["is_italic"] == is_italic)
                        gap = bbox[0] - curr_run["bbox"][2]

                        # Merge if adjacent on same horizontal line with same style
                        if same_font and same_size and same_color and same_style and -2 <= gap <= 25:
                            if gap > 1.5 and not curr_run["text"].endswith(" ") and not raw_text.startswith(" "):
                                curr_run["text"] += " " + raw_text
                            else:
                                curr_run["text"] += raw_text
                            curr_run["bbox"][2] = max(curr_run["bbox"][2], bbox[2])
                            curr_run["bbox"][3] = max(curr_run["bbox"][3], bbox[3])
                            curr_run["bbox"][1] = min(curr_run["bbox"][1], bbox[1])
                        else:
                            if curr_run["text"].strip():
                                merged_runs.append(curr_run)
                            curr_run = {
                                "text": raw_text,
                                "bbox": bbox,
                                "origin": orig,
                                "font_name": font_name,
                                "font_size": font_size,
                                "is_bold": is_bold,
                                "is_italic": is_italic,
                                "color": color_hex
                            }

                if curr_run and curr_run["text"].strip():
                    merged_runs.append(curr_run)

                for run in merged_runs:
                    txt = run["text"].strip()
                    if not txt:
                        continue
                    bb = run["bbox"]
                    orig = run["origin"]
                    fname = run["font_name"]
                    fsize = run["font_size"]
                    f_bold = run["is_bold"]
                    f_italic = run["is_italic"]
                    col_hex = run["color"]

                    bg_hex = sample_span_bg(pix, bb, pw, ph)

                    spans_out.append({
                        "id": f"span_p{page_idx}_{span_counter}",
                        "page_index": page_idx,
                        "text": txt,
                        "original_text": txt,
                        "font_name": fname,
                        "font_family": "'Times New Roman', Times, serif" if any(k in fname.lower() for k in ["times", "serif"]) else ("'Courier New', Courier, monospace" if any(k in fname.lower() for k in ["courier", "mono"]) else "Arial, Helvetica, sans-serif"),
                        "font_size": fsize,
                        "is_bold": f_bold,
                        "is_italic": f_italic,
                        "color": col_hex,
                        "bg_color": bg_hex,
                        "x": round(bb[0] / pw, 4),
                        "y": round(bb[1] / ph, 4),
                        "width": round((bb[2] - bb[0]) / pw, 4),
                        "height": round((bb[3] - bb[1]) / ph, 4),
                        "origin_x": round(orig[0] / pw, 4),
                        "origin_y": round(orig[1] / ph, 4),
                        "pt_bbox": [round(v, 2) for v in bb],
                        "pt_origin": [round(v, 2) for v in orig]
                    })
                    span_counter += 1

    return spans_out

def render_pdf_thumbnails(pdf_path: str, dpi: int = 130) -> List[Dict[str, Any]]:
    """Renders each page of a PDF as a high-resolution PNG image and extracts all editable font text spans"""
    doc = fitz.open(pdf_path)
    base_name = Path(pdf_path).stem
    results = []

    for idx, page in enumerate(doc):
        pw, ph = page.rect.width, page.rect.height
        pix = page.get_pixmap(dpi=dpi)
        img_filename = f"{base_name}_p{idx}.png"
        img_path = PROCESSED_DIR / img_filename
        pix.save(str(img_path))

        # Extract editable text spans with exact font, background color, and coordinates
        spans = extract_page_spans(page, pw, ph, idx, pix=pix)

        results.append({
            "page_number": idx + 1,
            "page_index": idx,
            "width": pw,
            "height": ph,
            "image_url": f"/storage/processed/{img_filename}",
            "rotation": page.rotation,
            "spans": spans
        })
    doc.close()
    return results

def merge_pdfs(file_paths: List[str], output_path: str) -> Dict[str, Any]:
    """Merges multiple PDF files in given sequence into a single master PDF"""
    merged = fitz.open()
    total_pages = 0

    for path in file_paths:
        doc = fitz.open(path)
        total_pages += len(doc)
        merged.insert_pdf(doc)
        doc.close()

    merged.save(output_path, garbage=4, deflate=True)
    merged.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "total_pages": total_pages,
        "size_bytes": out_file.stat().st_size
    }

def split_pdf(file_path: str, page_ranges: List[int], output_path: str) -> Dict[str, Any]:
    """Extracts specified 1-based page numbers from a PDF into a new PDF"""
    reader = PdfReader(file_path)
    writer = PdfWriter()

    total_doc_pages = len(reader.pages)
    valid_pages = [p for p in page_ranges if 1 <= p <= total_doc_pages]

    for p_num in valid_pages:
        writer.add_page(reader.pages[p_num - 1])

    with open(output_path, "wb") as f:
        writer.write(f)

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "extracted_pages_count": len(valid_pages),
        "size_bytes": out_file.stat().st_size
    }

def organize_pdf_pages(
    file_path: str,
    page_specs: List[Dict[str, Any]],
    output_path: str
) -> Dict[str, Any]:
    doc = fitz.open(file_path)
    new_doc = fitz.open()

    for spec in page_specs:
        if spec.get("deleted", False):
            continue
        p_idx = spec["page_index"]
        if 0 <= p_idx < len(doc):
            new_doc.insert_pdf(doc, from_page=p_idx, to_page=p_idx)
            rot = spec.get("rotation", 0)
            if rot:
                last_page = new_doc[-1]
                last_page.set_rotation((last_page.rotation + rot) % 360)

    new_doc.save(output_path, garbage=4, deflate=True)
    new_doc.close()
    doc.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "final_page_count": len(new_doc) if not new_doc.is_closed else len(page_specs),
        "size_bytes": out_file.stat().st_size
    }

def compress_pdf(file_path: str, output_path: str, level: str = "recommended") -> Dict[str, Any]:
    orig_size = Path(file_path).stat().st_size
    doc = fitz.open(file_path)

    for page in doc:
        image_list = page.get_images(full=True)
        for img_info in image_list:
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                pil_img = Image.open(io.BytesIO(image_bytes))

                quality = 70 if level == "maximum" else 82
                if level == "maximum" and (pil_img.width > 1200 or pil_img.height > 1200):
                    pil_img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                elif level == "recommended" and (pil_img.width > 1600 or pil_img.height > 1600):
                    pil_img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

                out_io = io.BytesIO()
                if pil_img.mode in ("RGBA", "P"):
                    pil_img = pil_img.convert("RGB")
                pil_img.save(out_io, format="JPEG", quality=quality, optimize=True)
                doc.update_stream(xref, out_io.getvalue())
            except Exception:
                pass

    doc.save(
        output_path,
        garbage=4,
        clean=True,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True
    )
    doc.close()

    new_size = Path(output_path).stat().st_size
    saved_bytes = max(0, orig_size - new_size)
    savings_percent = round((saved_bytes / orig_size) * 100, 1) if orig_size > 0 else 0

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "original_size_bytes": orig_size,
        "compressed_size_bytes": new_size,
        "saved_bytes": saved_bytes,
        "savings_percent": savings_percent
    }

def protect_pdf(file_path: str, password: str, output_path: str) -> Dict[str, Any]:
    reader = PdfReader(file_path)
    writer = PdfWriter()

    for p in reader.pages:
        writer.add_page(p)

    writer.encrypt(user_password=password, owner_password=password, use_128bit=True)
    with open(output_path, "wb") as f:
        writer.write(f)

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "status": "encrypted",
        "size_bytes": out_file.stat().st_size
    }

def unlock_pdf(file_path: str, password: str, output_path: str) -> Dict[str, Any]:
    reader = PdfReader(file_path)
    if reader.is_encrypted:
        success = reader.decrypt(password)
        if not success:
            raise ValueError("Incorrect PDF password.")

    writer = PdfWriter()
    for p in reader.pages:
        writer.add_page(p)

    with open(output_path, "wb") as f:
        writer.write(f)

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "status": "unlocked",
        "size_bytes": out_file.stat().st_size
    }

def add_watermark(
    file_path: str,
    output_path: str,
    text: str = "CONFIDENTIAL",
    opacity: float = 0.25,
    angle: int = 0,
    color_hex: str = "#94a3b8"
) -> Dict[str, Any]:
    """Stamps watermark text across all pages of the PDF"""
    doc = fitz.open(file_path)

    color_hex = color_hex.lstrip("#")
    r, g, b = tuple(int(color_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(color_hex) == 6 else (0.5, 0.5, 0.5)

    # Valid angles in PyMuPDF text insertion are 0, 90, 180, 270
    valid_angle = angle if angle in (0, 90, 180, 270) else 0

    for page in doc:
        w, h = page.rect.width, page.rect.height
        font_size = max(32, int(w / 14))
        text_w = fitz.get_text_length(text, fontname="helv", fontsize=font_size)
        pt = fitz.Point(max(20, (w - text_w) / 2), h / 2)

        page.insert_text(
            pt,
            text,
            fontname="helv",
            fontsize=font_size,
            rotate=valid_angle,
            color=(r, g, b),
            fill_opacity=opacity,
            stroke_opacity=opacity
        )

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "watermark_text": text,
        "size_bytes": out_file.stat().st_size
    }

def add_page_numbers(
    file_path: str,
    output_path: str,
    position: str = "bottom-center",
    format_pattern: str = "Page {n} of {total}"
) -> Dict[str, Any]:
    doc = fitz.open(file_path)
    total_pages = len(doc)

    for idx, page in enumerate(doc):
        w, h = page.rect.width, page.rect.height
        text = format_pattern.replace("{n}", str(idx + 1)).replace("{total}", str(total_pages))

        font_size = 10
        text_w = fitz.get_text_length(text, fontname="helv", fontsize=font_size)

        if position == "bottom-right":
            pt = fitz.Point(w - text_w - 36, h - 24)
        elif position == "top-right":
            pt = fitz.Point(w - text_w - 36, 36)
        else: # bottom-center
            pt = fitz.Point((w - text_w) / 2, h - 24)

        page.insert_text(pt, text, fontname="helv", fontsize=font_size, color=(0.3, 0.3, 0.3))

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "total_pages": total_pages,
        "size_bytes": out_file.stat().st_size
    }

def apply_pdf_editor_annotations(
    file_path: str,
    output_path: str,
    annotations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Applies interactive editor modifications onto PDF:
    - In-place text replacements with matching font family, size, style, color, and origin
    - New text insertions
    - Signatures (base64 image stamp)
    - Whiteouts and redactions
    - Highlights
    """
    doc = fitz.open(file_path)
    # First pass: apply redactions/whiteouts for text replacements
    for item in annotations:
        p_idx = item.get("page_index", 0)
        if p_idx < 0 or p_idx >= len(doc):
            continue
        page = doc[p_idx]
        pw, ph = page.rect.width, page.rect.height
        item_type = item.get("type")

        if item_type in ("text_replacement", "in_place_edit"):
            # Original bounding box to redact / whiteout
            if "pt_bbox" in item:
                bb = item["pt_bbox"]
                # Expand slightly to cleanly conceal old glyph strokes
                rect = fitz.Rect(bb[0] - 0.5, bb[1] - 0.5, bb[2] + 0.5, bb[3] + 0.5)
            else:
                x = item.get("x", 0) * pw
                y = item.get("y", 0) * ph
                w = item.get("width", 0.1) * pw
                h = item.get("height", 0.05) * ph
                rect = fitz.Rect(x - 0.5, y - 0.5, x + w + 0.5, y + h + 0.5)

            # Use detected background color to avoid cutting white holes on colored backgrounds
            bg_hex = item.get("bg_color", "").lstrip("#")
            if len(bg_hex) == 6:
                r, g, b = tuple(int(bg_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4))
                page.add_redact_annot(rect, fill=(r, g, b))
            else:
                page.add_redact_annot(rect, fill=(1, 1, 1))

        elif item_type in ("whiteout", "redact"):
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.1) * pw
            h = item.get("height", 0.05) * ph
            rect = fitz.Rect(x, y, x + w, y + h)

            fill_hex = item.get("color", "#ffffff").lstrip("#")
            r, g, b = tuple(int(fill_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(fill_hex) == 6 else (1, 1, 1)
            page.add_redact_annot(rect, fill=(r, g, b))

    # Apply all redactions cleanly
    for page in doc:
        page.apply_redactions()

    # Second pass: insert replacement text in exact matched font, size, weight, color
    for item in annotations:
        p_idx = item.get("page_index", 0)
        if p_idx < 0 or p_idx >= len(doc):
            continue
        page = doc[p_idx]
        pw, ph = page.rect.width, page.rect.height
        item_type = item.get("type")

        if item_type in ("text_replacement", "in_place_edit"):
            new_text = item.get("text", "")
            if not new_text:
                continue

            font_name = item.get("font_name", "Helvetica")
            font_size = float(item.get("font_size", 12.0))
            is_bold = bool(item.get("is_bold", False))
            is_italic = bool(item.get("is_italic", False))

            fitz_font = map_font_name_to_fitz(font_name, is_bold=is_bold, is_italic=is_italic)

            color_hex = item.get("color", "#000000").lstrip("#")
            r, g, b = tuple(int(color_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(color_hex) == 6 else (0, 0, 0)

            # Insert at origin
            if "pt_origin" in item:
                pt = fitz.Point(item["pt_origin"][0], item["pt_origin"][1])
            elif "origin_x" in item and "origin_y" in item:
                pt = fitz.Point(item["origin_x"] * pw, item["origin_y"] * ph)
            else:
                pt = fitz.Point(item.get("x", 0) * pw, (item.get("y", 0) + item.get("height", 0.03)) * ph - 2)

            # Do not insert through the PDF's original font resource. Subset
            # fonts often have custom encodings, which can turn replacement
            # text into unrelated glyphs. Use a real local font instead and
            # preserve the extracted baseline.
            font_path = get_system_font_path(font_name, is_bold=is_bold, is_italic=is_italic)
            max_width = (
                max(0.0, float(item["pt_bbox"][2]) - float(item["pt_bbox"][0]) - 1.0)
                if isinstance(item.get("pt_bbox"), (list, tuple)) and len(item["pt_bbox"]) >= 4
                else max(0.0, float(item.get("width", 0.1)) * pw - 1.0)
            )
            try:
                measure_font = fitz.Font(fontfile=font_path) if font_path else fitz.Font(fontname=fitz_font)
                requested_width = measure_font.text_length(new_text, fontsize=font_size)
                # Keep the original font size unless the replacement would
                # exceed its source field. Longer text is reduced to fit; it
                # is never enlarged to fill the box.
                if requested_width > max_width > 0:
                    font_size *= max_width / requested_width
            except Exception:
                pass
            if font_path:
                clean_fid = f"F_{Path(font_path).stem}_{abs(hash(font_path)) % 1000}"
                page.insert_text(
                    pt,
                    new_text,
                    fontname=clean_fid,
                    fontfile=font_path,
                    fontsize=font_size,
                    color=(r, g, b)
                )
            else:
                fitz_font = map_font_name_to_fitz(font_name, is_bold=is_bold, is_italic=is_italic)
                page.insert_text(pt, new_text, fontname=fitz_font, fontsize=font_size, color=(r, g, b))

        elif item_type == "text":
            text_str = item.get("text", "")
            if not text_str:
                continue

            fsize = float(item.get("fontSize", item.get("font_size", 14)))
            font_name = item.get("font_name", "Helvetica")
            is_bold = bool(item.get("is_bold", False))
            is_italic = bool(item.get("is_italic", False))
            fitz_font = map_font_name_to_fitz(font_name, is_bold=is_bold, is_italic=is_italic)

            color_hex = item.get("color", "#000000").lstrip("#")
            r, g, b = tuple(int(color_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(color_hex) == 6 else (0, 0, 0)

            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            page.insert_text(fitz.Point(x, y + fsize), text_str, fontname=fitz_font, fontsize=fsize, color=(r, g, b))

        elif item_type == "highlight":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.1) * pw
            h = item.get("height", 0.05) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            annot = page.add_highlight_annot(rect)
            annot.update()

        elif item_type == "underline":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.1) * pw
            h = item.get("height", 0.03) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            annot = page.add_underline_annot(rect)
            annot.update()

        elif item_type == "strikeout":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.1) * pw
            h = item.get("height", 0.03) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            annot = page.add_strikeout_annot(rect)
            annot.update()

        elif item_type == "link":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.15) * pw
            h = item.get("height", 0.035) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            url = item.get("url", "https://")
            page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": url})
            # Draw subtle blue border
            page.draw_rect(rect, color=(0.1, 0.45, 0.9), width=0.8)

        elif item_type == "form_field":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.15) * pw
            h = item.get("height", 0.035) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            field_type = item.get("field_type", "checkbox")
            if field_type == "checkbox":
                side = min(w, h, 16)
                box_rect = fitz.Rect(x, y, x + side, y + side)
                page.draw_rect(box_rect, color=(0.2, 0.2, 0.2), fill=(1, 1, 1), width=1)
                if item.get("checked"):
                    page.insert_text(fitz.Point(x + 2, y + side - 2), "X", fontsize=side * 0.8, color=(0, 0, 0))
            elif field_type == "radio":
                rad = min(w, h, 16) / 2
                page.draw_circle(fitz.Point(x + rad, y + rad), rad - 1, color=(0.2, 0.2, 0.2), fill=(1, 1, 1), width=1)
                if item.get("checked"):
                    page.draw_circle(fitz.Point(x + rad, y + rad), rad / 2, color=(0, 0, 0), fill=(0, 0, 0))
            else:
                page.draw_rect(rect, color=(0.6, 0.6, 0.6), fill=(0.98, 0.98, 0.98), width=1)
                val = item.get("value", "")
                if val:
                    page.insert_text(fitz.Point(x + 4, y + h - 4), val, fontsize=max(8, min(12, h * 0.7)), color=(0, 0, 0))

        elif item_type == "shape":
            x = item.get("x", 0) * pw
            y = item.get("y", 0) * ph
            w = item.get("width", 0.15) * pw
            h = item.get("height", 0.08) * ph
            rect = fitz.Rect(x, y, x + w, y + h)
            shape_type = item.get("shape_type", "rectangle")
            strk_hex = item.get("stroke_color", "#000000").lstrip("#")
            s_r, s_g, s_b = tuple(int(strk_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(strk_hex) == 6 else (0, 0, 0)
            fill_hex = item.get("fill_color", "").lstrip("#")
            f_col = tuple(int(fill_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(fill_hex) == 6 else None
            sw = float(item.get("stroke_width", 1.5))

            if shape_type == "rectangle":
                page.draw_rect(rect, color=(s_r, s_g, s_b), fill=f_col, width=sw)
            elif shape_type == "circle":
                page.draw_oval(rect, color=(s_r, s_g, s_b), fill=f_col, width=sw)
            elif shape_type == "line":
                page.draw_line(fitz.Point(x, y), fitz.Point(x + w, y + h), color=(s_r, s_g, s_b), width=sw)

        elif item_type in ("signature", "image"):
            img_b64 = item.get("image_base64", "")
            if img_b64:
                if "," in img_b64:
                    img_b64 = img_b64.split(",", 1)[1]
                img_data = base64.b64decode(img_b64)
                x = item.get("x", 0) * pw
                y = item.get("y", 0) * ph
                w = item.get("width", 0.1) * pw
                h = item.get("height", 0.05) * ph
                rect = fitz.Rect(x, y, x + w, y + h)
                page.insert_image(rect, stream=img_data)

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "size_bytes": out_file.stat().st_size
    }



def clear_pdf_template(file_path: str, output_path: str) -> Dict[str, Any]:
    """
    Clears all text from the entire document while 100% preserving
    all vector graphics, tables, borders, lines, header bars, colors, and design.
    Samples background color per text span so dark or colored header banners are
    preserved with matching color fills instead of white holes.
    """
    doc = fitz.open(file_path)
    total_spans_cleared = 0
    for page in doc:
        pw, ph = page.rect.width, page.rect.height
        pix = page.get_pixmap(dpi=100)
        blocks = page.get_text("dict").get("blocks", [])
        for b in blocks:
            if "lines" in b:
                for line in b["lines"]:
                    for s in line.get("spans", []):
                        bb = s["bbox"]
                        rect = fitz.Rect(bb[0] - 0.5, bb[1] - 0.5, bb[2] + 0.5, bb[3] + 0.5)
                        bg_hex = sample_span_bg(pix, bb, pw, ph).lstrip("#")
                        if len(bg_hex) == 6:
                            r, g, b_c = tuple(int(bg_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4))
                            page.add_redact_annot(rect, fill=(r, g, b_c))
                        else:
                            page.add_redact_annot(rect, fill=(1, 1, 1))
                        total_spans_cleared += 1
        page.apply_redactions()

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    out_file = Path(output_path)
    thumbnails = render_pdf_thumbnails(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "total_spans_cleared": total_spans_cleared,
        "thumbnails": thumbnails,
        "size_bytes": out_file.stat().st_size
    }

def convert_images_to_pdf(image_paths: List[str], output_path: str) -> Dict[str, Any]:
    doc = fitz.open()

    for img_path in image_paths:
        with Image.open(img_path) as im:
            w, h = im.size
            rect = fitz.Rect(0, 0, w, h)
            page = doc.new_page(width=w, height=h)
            page.insert_image(rect, filename=img_path)

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "pages": len(image_paths),
        "size_bytes": out_file.stat().st_size
    }

# ==========================================
# CONVERTERS FROM PDF (Word, Excel, Images, Text)
# ==========================================

import pdfplumber
from docx import Document as DocxDocument
from docx.shared import Pt, RGBColor
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

def convert_pdf_to_docx(pdf_path: str, output_path: str) -> Dict[str, Any]:
    """Converts PDF document into a formatted Microsoft Word (.docx) file with tables and styles"""
    docx = DocxDocument()
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            if page_idx > 0:
                docx.add_page_break()

            # Check if page has tables
            tables = page.extract_tables()
            table_cells_text = set()
            if tables:
                for tbl in tables:
                    for row in tbl:
                        for c in row:
                            if c:
                                table_cells_text.add(c.strip())

            # Extract regular text excluding table cell duplicates
            text = page.extract_text()
            if text:
                for line in text.splitlines():
                    trimmed = line.strip()
                    if trimmed and trimmed not in table_cells_text:
                        p = docx.add_paragraph()
                        run = p.add_run(trimmed)
                        if len(trimmed) < 60 and (trimmed.isupper() or trimmed.istitle()):
                            run.font.bold = True
                            run.font.size = Pt(13)
                        else:
                            run.font.size = Pt(10.5)

            # Insert extracted tables
            if tables:
                for tbl in tables:
                    if not tbl or not tbl[0]:
                        continue
                    col_count = len(tbl[0])
                    table_elem = docx.add_table(rows=len(tbl), cols=col_count)
                    table_elem.style = 'Light Grid Accent 1'

                    for r_idx, row in enumerate(tbl):
                        for c_idx, cell_val in enumerate(row):
                            if c_idx < col_count:
                                cell_p = table_elem.cell(r_idx, c_idx).paragraphs[0]
                                c_run = cell_p.add_run(cell_val or "")
                                if r_idx == 0:
                                    c_run.font.bold = True
                    docx.add_paragraph()

    docx.save(output_path)
    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "size_bytes": out_file.stat().st_size
    }

def convert_pdf_to_xlsx(pdf_path: str, output_path: str) -> Dict[str, Any]:
    """Extracts all tabular financial and data grids from PDF into formatted Excel spreadsheets"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Page 1 Tables"

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid") # Teal header
    regular_font = Font(name="Calibri", size=10)
    border_side = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

    current_row = 1
    tables_found_count = 0

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            if page_idx > 0:
                ws = wb.create_sheet(title=f"Page {page_idx + 1}")
                current_row = 1

            tables = page.extract_tables()
            if tables:
                for tbl in tables:
                    if not tbl:
                        continue
                    tables_found_count += 1
                    for r_idx, row in enumerate(tbl):
                        for c_idx, val in enumerate(row):
                            cell = ws.cell(row=current_row, column=c_idx + 1, value=val or "")
                            cell.border = cell_border
                            if r_idx == 0:
                                cell.font = header_font
                                cell.fill = header_fill
                                cell.alignment = Alignment(horizontal="center", vertical="center")
                            else:
                                cell.font = regular_font
                                cell.alignment = Alignment(vertical="center")
                        current_row += 1
                    current_row += 2 # gap between tables
            else:
                # If no formal table grid detected, structure line items as table
                text = page.extract_text()
                if text:
                    ws.cell(row=current_row, column=1, value="Line #").font = header_font
                    ws.cell(row=current_row, column=1).fill = header_fill
                    ws.cell(row=current_row, column=2, value="Content").font = header_font
                    ws.cell(row=current_row, column=2).fill = header_fill
                    current_row += 1
                    for l_idx, line in enumerate(text.splitlines()):
                        if line.strip():
                            ws.cell(row=current_row, column=1, value=l_idx + 1).font = regular_font
                            ws.cell(row=current_row, column=2, value=line.strip()).font = regular_font
                            current_row += 1

    wb.save(output_path)
    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "tables_extracted": tables_found_count,
        "size_bytes": out_file.stat().st_size
    }

def convert_pdf_to_txt(pdf_path: str, output_path: str) -> Dict[str, Any]:
    """Extracts clean text stream from all pages of the PDF"""
    doc = fitz.open(pdf_path)
    full_text = []

    for idx, page in enumerate(doc):
        full_text.append(f"--- Page {idx + 1} ---")
        full_text.append(page.get_text())

    doc.close()

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(full_text))

    out_file = Path(output_path)
    return {
        "output_path": output_path,
        "filename": out_file.name,
        "download_url": f"/storage/exports/{out_file.name}",
        "size_bytes": out_file.stat().st_size
    }


