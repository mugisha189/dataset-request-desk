"""CSV/XLSX/PDF export, shared by every listing's "Export" menu.

Rows are prepared by the caller (already formatted strings), so this module has no domain
knowledge at all.
"""

import csv
import io
from typing import Literal

from fastapi import HTTPException, Response
from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

ExportFormat = Literal["csv", "xlsx", "pdf"]

MEDIA_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def _to_csv(headers: list[str], rows: list[list[str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8-sig")  # BOM so Excel opens it as UTF-8, not Latin-1


def _to_xlsx(headers: list[str], rows: list[list[str]], sheet_title: str) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title[:31] or "Export"  # Excel's sheet-name length limit

    sheet.append(headers)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    for row in rows:
        sheet.append(row)

    for index, header in enumerate(headers, start=1):
        column = sheet.column_dimensions[sheet.cell(row=1, column=index).column_letter]
        widest = max([len(header)] + [len(str(row[index - 1])) for row in rows], default=len(header))
        column.width = min(max(widest + 2, 10), 40)

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _to_pdf(headers: list[str], rows: list[list[str]], title: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        title=title,
    )

    from reportlab.lib.styles import getSampleStyleSheet

    styles = getSampleStyleSheet()
    table_data = [headers] + rows
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E0E10")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0DCCF")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F0E8")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    doc.build([Table([[title]], style=TableStyle([("FONTSIZE", (0, 0), (-1, -1), 14)])), table])
    return buffer.getvalue()


def export_response(
    *,
    fmt: str,
    headers: list[str],
    rows: list[list[str]],
    filename_base: str,
    title: str | None = None,
) -> Response:
    if fmt not in MEDIA_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported export format '{fmt}'")

    if fmt == "csv":
        content = _to_csv(headers, rows)
    elif fmt == "xlsx":
        content = _to_xlsx(headers, rows, title or filename_base)
    else:
        content = _to_pdf(headers, rows, title or filename_base)

    return Response(
        content=content,
        media_type=MEDIA_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.{fmt}"'},
    )
