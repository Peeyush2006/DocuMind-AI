import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
from app.config import SAMPLES_DIR

def get_font(size=16, bold=False):
    try:
        # Standard Windows fonts
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        font_path = Path("C:/Windows/Fonts") / font_name
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size)
    except Exception:
        pass
    return ImageFont.load_default()

def create_sample_invoice(out_path: str):
    w, h = 1000, 1400
    im = Image.new("RGB", (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(im)

    font_title = get_font(28, bold=True)
    font_h2 = get_font(20, bold=True)
    font_body = get_font(16)
    font_bold = get_font(16, bold=True)
    font_small = get_font(13)

    # Decorative header banner
    draw.rectangle([0, 0, w, 18], fill=(30, 41, 59))
    draw.text((320, 60), "TAX INVOICE / BILL OF SUPPLY", fill=(15, 23, 42), font=font_title)
    draw.line([(60, 110), (940, 110)], fill=(203, 213, 225), width=2)

    # Vendor & Customer details
    draw.text((60, 130), "Apex Logistics & Supplies Private Limited", fill=(15, 23, 42), font=font_bold)
    draw.text((60, 155), "GSTIN: 27AABCA1234F1Z5 • State: Maharashtra", fill=(71, 85, 105), font=font_body)
    draw.text((60, 180), "Address: Plot 42, Andheri East, Mumbai, MH 400069", fill=(71, 85, 105), font=font_body)

    draw.text((640, 130), "Invoice No: INV-2026-8842", fill=(15, 23, 42), font=font_bold)
    draw.text((640, 155), "Date: 28-Oct-2026", fill=(71, 85, 105), font=font_body)
    draw.text((640, 180), "Due Date: 12-Nov-2026", fill=(71, 85, 105), font=font_body)

    # Bill To Box
    draw.rectangle([60, 220, 940, 310], outline=(203, 213, 225), width=1)
    draw.rectangle([60, 220, 940, 250], fill=(241, 245, 249))
    draw.text((75, 226), "Billed To / Consignee", fill=(15, 23, 42), font=font_bold)
    draw.text((75, 258), "Horizon Digital Enterprises (Attn: Peeyush Tiwari)", fill=(15, 23, 42), font=font_body)
    draw.text((75, 282), "Sector 62, Noida, Uttar Pradesh 201309 • GSTIN: 09AABCH5678J1Z9", fill=(71, 85, 105), font=font_small)

    # Items Table
    tbl_top = 340
    draw.rectangle([60, tbl_top, 940, tbl_top + 40], fill=(30, 41, 59))
    draw.text((75, tbl_top + 10), "#", fill=(255, 255, 255), font=font_bold)
    draw.text((120, tbl_top + 10), "Item Description", fill=(255, 255, 255), font=font_bold)
    draw.text((540, tbl_top + 10), "HSN", fill=(255, 255, 255), font=font_bold)
    draw.text((610, tbl_top + 10), "Qty", fill=(255, 255, 255), font=font_bold)
    draw.text((680, tbl_top + 10), "Rate (₹)", fill=(255, 255, 255), font=font_bold)
    draw.text((800, tbl_top + 10), "Amount (₹)", fill=(255, 255, 255), font=font_bold)

    items = [
        ("1", "AI Document Scanner Hardware Module", "8471", "2", "18,500.00", "37,000.00"),
        ("2", "Cloud OCR & Bedrock API License (1 Year)", "9983", "1", "45,000.00", "45,000.00"),
        ("3", "On-site Calibration & Training", "9987", "1", "12,000.00", "12,000.00"),
        ("4", "Extended Maintenance & Support", "9987", "1", "6,500.00", "6,500.00")
    ]

    row_y = tbl_top + 40
    for idx, (num, desc, hsn, qty, rate, amt) in enumerate(items):
        bg_col = (255, 255, 255) if idx % 2 == 0 else (248, 250, 252)
        draw.rectangle([60, row_y, 940, row_y + 40], fill=bg_col, outline=(226, 232, 240))
        draw.text((75, row_y + 10), num, fill=(51, 65, 85), font=font_body)
        draw.text((120, row_y + 10), desc, fill=(15, 23, 42), font=font_body)
        draw.text((540, row_y + 10), hsn, fill=(71, 85, 105), font=font_body)
        draw.text((610, row_y + 10), qty, fill=(51, 65, 85), font=font_body)
        draw.text((680, row_y + 10), rate, fill=(51, 65, 85), font=font_body)
        draw.text((800, row_y + 10), amt, fill=(15, 23, 42), font=font_bold)
        row_y += 40

    # Totals block
    draw.rectangle([540, row_y + 20, 940, row_y + 170], outline=(203, 213, 225), width=1)
    draw.text((560, row_y + 35), "Subtotal:", fill=(71, 85, 105), font=font_body)
    draw.text((820, row_y + 35), "₹1,00,500.00", fill=(15, 23, 42), font=font_bold)

    draw.text((560, row_y + 65), "CGST (9%):", fill=(71, 85, 105), font=font_body)
    draw.text((820, row_y + 65), "₹9,045.00", fill=(15, 23, 42), font=font_body)

    draw.text((560, row_y + 95), "SGST (9%):", fill=(71, 85, 105), font=font_body)
    draw.text((820, row_y + 95), "₹9,045.00", fill=(15, 23, 42), font=font_body)

    draw.line([(540, row_y + 125), (940, row_y + 125)], fill=(203, 213, 225), width=1)
    draw.text((560, row_y + 135), "Grand Total:", fill=(15, 23, 42), font=font_h2)
    draw.text((790, row_y + 135), "₹1,18,590.00", fill=(2, 132, 199), font=font_h2)

    draw.text((60, row_y + 190), "Amount in Words: One Lakh Eighteen Thousand Five Hundred Ninety Rupees Only.", fill=(51, 65, 85), font=font_bold)
    draw.text((60, row_y + 230), "Terms & Conditions:", fill=(15, 23, 42), font=font_bold)
    draw.text((60, row_y + 255), "1. Goods once sold will only be replaced in accordance with manufacturer warranty.", fill=(100, 116, 139), font=font_small)
    draw.text((60, row_y + 275), "2. Payment is due strictly within 15 calendar days from invoice presentation.", fill=(100, 116, 139), font=font_small)

    # Stamp / Signatory
    draw.ellipse([700, row_y + 310, 880, row_y + 390], outline=(37, 99, 235), width=2)
    draw.text((720, row_y + 335), "APEX LOGISTICS", fill=(37, 99, 235), font=font_small)
    draw.text((735, row_y + 355), "★ VERIFIED ★", fill=(37, 99, 235), font=font_bold)

    # Add realistic scanner noise & gentle perspective warp
    im_cv = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    cv2.imwrite(out_path, im_cv)

def create_sample_nda(out_path: str):
    w, h = 1000, 1400
    im = Image.new("RGB", (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(im)

    font_title = get_font(24, bold=True)
    font_h2 = get_font(18, bold=True)
    font_body = get_font(15)
    font_bold = get_font(15, bold=True)

    draw.text((150, 60), "MUTUAL NON-DISCLOSURE AGREEMENT", fill=(15, 23, 42), font=font_title)
    draw.line([(80, 105), (920, 105)], fill=(148, 163, 184), width=2)

    p1 = "THIS AGREEMENT is entered into on this 25th day of October, 2026, by and between DocuMind AI Technologies Inc. ('Disclosing Party') and the undersigned Recipient Partner ('Receiving Party')."
    draw.text((80, 130), p1, fill=(51, 65, 85), font=font_body)

    draw.text((80, 200), "1. Definition of Confidential Information", fill=(15, 23, 42), font=font_h2)
    p2 = "'Confidential Information' refers to any proprietary technical data, algorithms, trade secrets, optical character recognition schemas, or commercial strategies disclosed either orally or in documentary form."
    draw.text((80, 235), p2, fill=(51, 65, 85), font=font_body)

    draw.text((80, 310), "2. Obligations of Non-Disclosure", fill=(15, 23, 42), font=font_h2)
    p3 = "The Receiving Party agrees to hold and maintain Confidential Information in strictest confidence. The Receiving Party shall not disclose, duplicate, reverse engineer, or distribute any part without prior written authorization."
    draw.text((80, 345), p3, fill=(51, 65, 85), font=font_body)

    draw.text((80, 420), "3. Term and Termination", fill=(15, 23, 42), font=font_h2)
    p4 = "This Agreement shall remain in full force and effect for a period of three (3) years from the effective date or until such time as the Disclosing Party releases Recipient in writing."
    draw.text((80, 455), p4, fill=(51, 65, 85), font=font_body)

    draw.text((80, 530), "4. Governing Law and Jurisdiction", fill=(15, 23, 42), font=font_h2)
    p5 = "This Agreement shall be construed and governed in accordance with the laws of India, and any disputes arising hereunder shall be subject to the exclusive jurisdiction of the Courts at New Delhi."
    draw.text((80, 565), p5, fill=(51, 65, 85), font=font_body)

    draw.line([(80, 680), (920, 680)], fill=(226, 232, 240), width=1)
    draw.text((80, 710), "DocuMind AI Technologies Inc.", fill=(15, 23, 42), font=font_bold)
    draw.text((80, 740), "By: Authorized Officer", fill=(71, 85, 105), font=font_body)

    draw.text((550, 710), "Receiving Party Partner", fill=(15, 23, 42), font=font_bold)
    draw.text((550, 740), "By: Authorized Executive Signature", fill=(71, 85, 105), font=font_body)

    im_cv = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    cv2.imwrite(out_path, im_cv)

def create_vector_invoice_pdf(out_path: str):
    import fitz
    doc = fitz.open()
    pw, ph = 792, 1120
    page = doc.new_page(width=pw, height=ph)
    
    # Header banner
    page.draw_rect(fitz.Rect(0, 0, pw, 22), fill=(0.117, 0.160, 0.231), color=None)
    
    # Title
    page.insert_text(fitz.Point(230, 65), 'TAX INVOICE / BILL OF SUPPLY', fontname='helv', fontsize=22, color=(0.06, 0.09, 0.16))
    page.draw_line(fitz.Point(45, 80), fitz.Point(pw-45, 80), color=(0.80, 0.83, 0.88), width=1.5)
    
    # Vendor & Invoice Meta
    page.insert_text(fitz.Point(45, 110), 'Apex Logistics & Supplies Private Limited', fontname='helv', fontsize=13, color=(0.06, 0.09, 0.16))
    page.insert_text(fitz.Point(45, 128), 'GSTIN: 27AABCA1234F1Z5 • State: Maharashtra', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    page.insert_text(fitz.Point(45, 144), 'Address: Plot 42, Andheri East, Mumbai, MH 400069', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    
    page.insert_text(fitz.Point(520, 110), 'Invoice No: INV-2026-8842', fontname='helv', fontsize=12, color=(0.06, 0.09, 0.16))
    page.insert_text(fitz.Point(520, 128), 'Date: 28-Oct-2026', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    page.insert_text(fitz.Point(520, 144), 'Due Date: 12-Nov-2026', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    
    # Bill To Box
    page.draw_rect(fitz.Rect(45, 170, pw-45, 235), color=(0.80, 0.83, 0.88), width=1)
    page.draw_rect(fitz.Rect(45, 170, pw-45, 192), fill=(0.95, 0.96, 0.98), color=None)
    page.insert_text(fitz.Point(55, 185), 'Billed To / Consignee', fontname='helv', fontsize=10.5, color=(0.06, 0.09, 0.16))
    page.insert_text(fitz.Point(55, 208), 'Horizon Digital Enterprises (Attn: Peeyush Tiwari)', fontname='helv', fontsize=11, color=(0.06, 0.09, 0.16))
    page.insert_text(fitz.Point(55, 224), 'Sector 62, Noida, Uttar Pradesh 201309 • GSTIN: 09AABCH5678J1Z9', fontname='helv', fontsize=9.5, color=(0.28, 0.33, 0.41))
    
    # Table Header
    tbl_top = 260
    page.draw_rect(fitz.Rect(45, tbl_top, pw-45, tbl_top + 26), fill=(0.117, 0.160, 0.231), color=None)
    page.insert_text(fitz.Point(55, tbl_top + 17), '#', fontname='helv', fontsize=10, color=(1, 1, 1))
    page.insert_text(fitz.Point(90, tbl_top + 17), 'Item Description', fontname='helv', fontsize=10, color=(1, 1, 1))
    page.insert_text(fitz.Point(420, tbl_top + 17), 'HSN', fontname='helv', fontsize=10, color=(1, 1, 1))
    page.insert_text(fitz.Point(480, tbl_top + 17), 'Qty', fontname='helv', fontsize=10, color=(1, 1, 1))
    page.insert_text(fitz.Point(540, tbl_top + 17), 'Rate (₹)', fontname='helv', fontsize=10, color=(1, 1, 1))
    page.insert_text(fitz.Point(645, tbl_top + 17), 'Amount (₹)', fontname='helv', fontsize=10, color=(1, 1, 1))
    
    items = [
        ('1', 'AI Document Scanner Hardware Module', '8471', '2', '18,500.00', '37,000.00'),
        ('2', 'Cloud OCR & Intelligence API License (1 Year)', '9983', '1', '45,000.00', '45,000.00'),
        ('3', 'On-site Calibration & Workflow Setup', '9987', '1', '12,000.00', '12,000.00'),
        ('4', 'Enterprise Support & SLA Maintenance', '9987', '1', '6,500.00', '6,500.00')
    ]
    
    row_y = tbl_top + 26
    for idx, (num, desc, hsn, qty, rate, amt) in enumerate(items):
        bg = (1, 1, 1) if idx % 2 == 0 else (0.97, 0.98, 0.99)
        page.draw_rect(fitz.Rect(45, row_y, pw-45, row_y + 26), fill=bg, color=(0.88, 0.91, 0.94), width=0.8)
        page.insert_text(fitz.Point(55, row_y + 17), num, fontname='helv', fontsize=10, color=(0.2, 0.25, 0.33))
        page.insert_text(fitz.Point(90, row_y + 17), desc, fontname='helv', fontsize=10, color=(0.06, 0.09, 0.16))
        page.insert_text(fitz.Point(420, row_y + 17), hsn, fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
        page.insert_text(fitz.Point(480, row_y + 17), qty, fontname='helv', fontsize=10, color=(0.2, 0.25, 0.33))
        page.insert_text(fitz.Point(540, row_y + 17), rate, fontname='helv', fontsize=10, color=(0.2, 0.25, 0.33))
        page.insert_text(fitz.Point(645, row_y + 17), amt, fontname='helv', fontsize=10, color=(0.06, 0.09, 0.16))
        row_y += 26
        
    # Totals Box
    page.draw_rect(fitz.Rect(420, row_y + 15, pw-45, row_y + 120), color=(0.80, 0.83, 0.88), width=1)
    page.insert_text(fitz.Point(435, row_y + 35), 'Subtotal:', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    page.insert_text(fitz.Point(645, row_y + 35), '₹1,00,500.00', fontname='helv', fontsize=10.5, color=(0.06, 0.09, 0.16))
    
    page.insert_text(fitz.Point(435, row_y + 55), 'CGST (9%):', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    page.insert_text(fitz.Point(645, row_y + 55), '₹9,045.00', fontname='helv', fontsize=10, color=(0.06, 0.09, 0.16))
    
    page.insert_text(fitz.Point(435, row_y + 75), 'SGST (9%):', fontname='helv', fontsize=10, color=(0.28, 0.33, 0.41))
    page.insert_text(fitz.Point(645, row_y + 75), '₹9,045.00', fontname='helv', fontsize=10, color=(0.06, 0.09, 0.16))
    
    page.draw_line(fitz.Point(420, row_y + 88), fitz.Point(pw-45, row_y + 88), color=(0.80, 0.83, 0.88), width=1)
    page.insert_text(fitz.Point(435, row_y + 107), 'Grand Total:', fontname='helv', fontsize=12, color=(0.06, 0.09, 0.16))
    page.insert_text(fitz.Point(630, row_y + 107), '₹1,18,590.00', fontname='helv', fontsize=13, color=(0.01, 0.52, 0.78))
    
    doc.save(out_path)
    doc.close()

def seed_sample_documents():
    """Generates sample files in storage/samples"""
    Path(SAMPLES_DIR).mkdir(parents=True, exist_ok=True)
    inv_path = SAMPLES_DIR / "sample_tax_invoice.png"
    nda_path = SAMPLES_DIR / "sample_legal_agreement.png"
    inv_pdf = SAMPLES_DIR / "sample_tax_invoice.pdf"
    
    if not inv_path.exists():
        create_sample_invoice(str(inv_path))
    if not nda_path.exists():
        create_sample_nda(str(nda_path))
    if not inv_pdf.exists():
        create_vector_invoice_pdf(str(inv_pdf))
