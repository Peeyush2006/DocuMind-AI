import io
from pathlib import Path
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.config import EXPORTS_DIR

def clean_html_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text("\n")

def export_to_txt(html_content: str, title: str, doc_id: str) -> str:
    raw_text = clean_html_text(html_content)
    filename = f"{title.replace(' ', '_')}_{doc_id[:6]}.txt"
    filepath = EXPORTS_DIR / filename
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"=== {title} ===\n\n")
        f.write(raw_text)
        
    return str(filepath)

def export_to_docx(html_content: str, title: str, doc_id: str) -> str:
    doc = DocxDocument()
    
    # Title
    title_p = doc.add_paragraph()
    title_run = title_p.add_run(title)
    title_run.font.size = Pt(20)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    doc.add_paragraph()

    soup = BeautifulSoup(html_content, "html.parser")
    
    for element in soup.find_all(['h1', 'h2', 'h3', 'p', 'table', 'ul', 'ol']):
        if element.name in ['h1', 'h2', 'h3']:
            p = doc.add_paragraph()
            run = p.add_run(element.get_text().strip())
            run.font.bold = True
            run.font.size = Pt(15 if element.name == 'h1' else 13)
            run.font.color.rgb = RGBColor(15, 23, 42)
            
        elif element.name == 'p':
            text = element.get_text().strip()
            if text:
                p = doc.add_paragraph()
                p.add_run(text)
                
        elif element.name == 'table':
            rows = element.find_all('tr')
            if rows:
                col_count = max(len(r.find_all(['td', 'th'])) for r in rows)
                tbl = doc.add_table(rows=len(rows), cols=col_count)
                tbl.style = 'Light Grid Accent 1'
                
                for r_idx, row in enumerate(rows):
                    cells = row.find_all(['td', 'th'])
                    for c_idx, cell in enumerate(cells):
                        cell_p = tbl.cell(r_idx, c_idx).paragraphs[0]
                        cell_run = cell_p.add_run(cell.get_text().strip())
                        if row.find('th') or r_idx == 0:
                            cell_run.font.bold = True
                doc.add_paragraph()

    filename = f"{title.replace(' ', '_')}_{doc_id[:6]}.docx"
    filepath = EXPORTS_DIR / filename
    doc.save(str(filepath))
    return str(filepath)

def export_to_pdf(html_content: str, title: str, doc_id: str) -> str:
    filename = f"{title.replace(' ', '_')}_{doc_id[:6]}.pdf"
    filepath = EXPORTS_DIR / filename
    
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    story = []
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 10))

    soup = BeautifulSoup(html_content, "html.parser")
    
    for element in soup.find_all(['h1', 'h2', 'h3', 'p', 'table']):
        if element.name in ['h1', 'h2', 'h3']:
            story.append(Paragraph(element.get_text().strip(), h2_style))
        elif element.name == 'p':
            t = element.get_text().strip()
            if t:
                # Replace xml-sensitive chars
                t_clean = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(t_clean, body_style))
        elif element.name == 'table':
            table_data = []
            for row in element.find_all('tr'):
                r_cells = [c.get_text().strip() for c in row.find_all(['td', 'th'])]
                if r_cells:
                    table_data.append(r_cells)
            if table_data:
                # Wrap each cell in a paragraph for auto-wrapping
                flowable_table_data = [
                    [Paragraph(cell, body_style) for cell in row]
                    for row in table_data
                ]
                t_platypus = Table(flowable_table_data)
                t_platypus.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ]))
                story.append(t_platypus)
                story.append(Spacer(1, 10))

    doc.build(story)
    return str(filepath)

def export_to_xlsx(html_content: str, title: str, doc_id: str, table_data=None) -> str:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Extracted Data"
    
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    regular_font = Font(name="Calibri", size=10)
    border_side = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)
    
    # Title row
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = f"DocuMind AI — {title}"
    title_cell.font = Font(name="Calibri", size=14, bold=True, color="1E293B")
    
    current_row = 3

    # Extract tables from HTML or use passed table_data
    tables_found = []
    if table_data:
        tables_found.append(table_data)
    else:
        soup = BeautifulSoup(html_content, "html.parser")
        for tbl in soup.find_all('table'):
            t_rows = []
            for r in tbl.find_all('tr'):
                t_rows.append([c.get_text().strip() for c in r.find_all(['td', 'th'])])
            if t_rows:
                tables_found.append(t_rows)

    if not tables_found:
        # If no explicit HTML table found, format paragraphs as key-value rows
        soup = BeautifulSoup(html_content, "html.parser")
        ws.cell(row=current_row, column=1, value="Line #").font = header_font
        ws.cell(row=current_row, column=1).fill = header_fill
        ws.cell(row=current_row, column=2, value="Extracted Content").font = header_font
        ws.cell(row=current_row, column=2).fill = header_fill
        current_row += 1
        
        for idx, p in enumerate(soup.find_all(['p', 'h1', 'h2', 'h3'])):
            text = p.get_text().strip()
            if text:
                ws.cell(row=current_row, column=1, value=idx + 1).font = regular_font
                ws.cell(row=current_row, column=2, value=text).font = regular_font
                current_row += 1
    else:
        for t_idx, tbl in enumerate(tables_found):
            if t_idx > 0:
                current_row += 2
                
            for r_idx, row in enumerate(tbl):
                for c_idx, val in enumerate(row):
                    cell = ws.cell(row=current_row, column=c_idx + 1, value=val)
                    cell.border = cell_border
                    if r_idx == 0:
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    else:
                        cell.font = regular_font
                        cell.alignment = Alignment(vertical="center")
                current_row += 1

    # Auto-adjust column widths
    from openpyxl.utils import get_column_letter
    for col_idx, col in enumerate(ws.columns, 1):
        max_len = 0
        col_letter = get_column_letter(col_idx)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len and len(val_str) < 60:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    filename = f"{title.replace(' ', '_')}_{doc_id[:6]}.xlsx"
    filepath = EXPORTS_DIR / filename
    wb.save(str(filepath))
    return str(filepath)
