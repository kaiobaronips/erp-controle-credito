import sqlite3
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo


ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "local.db"
OUTPUT_PATH = Path(__file__).resolve().parent / "diagnostico_valores_em_aberto.xlsx"
TODAY = date(2026, 6, 23)


def brl(value):
    return float(value or 0)


def fetch_rows():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        select
          cr.id as credor_id,
          trim(cr.nome) as credor,
          co.id as cobranca_id,
          e.id as emprestimo_id,
          co.competencia,
          co.vencimento,
          co.valor,
          co.status
        from cobrancas co
        join emprestimos e on e.id = co.emprestimo_id
        join credores cr on cr.id = e.credor_id
        where co.status <> 'pago'
        order by cr.nome, co.vencimento, co.id
        """
    ).fetchall()
    conn.close()

    data = []
    for row in rows:
        vencimento = datetime.strptime(row["vencimento"], "%Y-%m-%d").date()
        dias_atraso = max((TODAY - vencimento).days, 0)
        data.append(
            {
                "credor_id": row["credor_id"],
                "credor": row["credor"],
                "cobranca_id": row["cobranca_id"],
                "emprestimo_id": row["emprestimo_id"],
                "competencia": row["competencia"],
                "vencimento": vencimento,
                "valor": brl(row["valor"]),
                "status": row["status"],
                "dias_atraso": dias_atraso,
            }
        )
    return data


def summarize(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[row["credor"]].append(row)

    summary = []
    total = sum(r["valor"] for r in rows)
    for credor, items in sorted(groups.items(), key=lambda kv: sum(i["valor"] for i in kv[1]), reverse=True):
        total_credor = sum(i["valor"] for i in items)
        vencido = sum(i["valor"] for i in items if i["status"] == "atrasado")
        pendente = sum(i["valor"] for i in items if i["status"] != "atrasado")
        datas = [i["vencimento"] for i in items]
        summary.append(
            {
                "credor": credor,
                "qtd": len(items),
                "total": total_credor,
                "vencido": vencido,
                "pendente": pendente,
                "primeiro_vencimento": min(datas),
                "ultimo_vencimento": max(datas),
                "maior_atraso": max(i["dias_atraso"] for i in items),
                "participacao": total_credor / total if total else 0,
            }
        )
    return summary


def set_dimensions(ws, widths):
    for col, width in widths.items():
        ws.column_dimensions[col].width = width


def style_title(ws, title, subtitle):
    ws.merge_cells("A1:J1")
    ws["A1"] = title
    ws["A1"].font = Font(size=18, bold=True, color="FFFFFF")
    ws["A1"].fill = PatternFill("solid", fgColor="111827")
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:J2")
    ws["A2"] = subtitle
    ws["A2"].font = Font(size=10, color="4B5563")
    ws["A2"].alignment = Alignment(horizontal="left", vertical="center")


def add_kpi_card(ws, cell, title, value, fill):
    row = ws[cell].row
    col = ws[cell].column
    ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
    ws.merge_cells(start_row=row + 1, start_column=col, end_row=row + 2, end_column=col + 1)
    title_cell = ws.cell(row, col)
    value_cell = ws.cell(row + 1, col)
    title_cell.value = title
    value_cell.value = value
    for r in range(row, row + 3):
        for c in range(col, col + 2):
            ws.cell(r, c).fill = PatternFill("solid", fgColor=fill)
            ws.cell(r, c).border = Border(
                left=Side(style="thin", color="D1D5DB"),
                right=Side(style="thin", color="D1D5DB"),
                top=Side(style="thin", color="D1D5DB"),
                bottom=Side(style="thin", color="D1D5DB"),
            )
    title_cell.font = Font(size=9, bold=True, color="FFFFFF")
    value_cell.font = Font(size=15, bold=True, color="FFFFFF")
    value_cell.alignment = Alignment(vertical="center")


def style_table_header(ws, row, start_col, end_col):
    for col in range(start_col, end_col + 1):
        cell = ws.cell(row, col)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1F2937")
        cell.alignment = Alignment(horizontal="center")
        cell.border = Border(bottom=Side(style="thin", color="111827"))


def apply_money_format(ws, columns, min_row, max_row):
    for col in columns:
        for row in range(min_row, max_row + 1):
            ws[f"{col}{row}"].number_format = 'R$ #,##0.00'


def build_workbook(rows, summary):
    wb = Workbook()
    ws = wb.active
    ws.title = "Dashboard"
    detail = wb.create_sheet("Detalhe por Credor")
    base = wb.create_sheet("Base")

    total_aberto = sum(r["valor"] for r in rows)
    total_vencido = sum(r["valor"] for r in rows if r["status"] == "atrasado")
    total_pendente = sum(r["valor"] for r in rows if r["status"] != "atrasado")
    qtd_credores = len(summary)
    qtd_cobrancas = len(rows)
    maior_exposicao = max(summary, key=lambda r: r["total"]) if summary else None

    # Dashboard
    set_dimensions(
        ws,
        {
            "A": 22,
            "B": 14,
            "C": 14,
            "D": 15,
            "E": 15,
            "F": 15,
            "G": 16,
            "H": 16,
            "I": 15,
            "J": 12,
        },
    )
    style_title(
        ws,
        "Diagnóstico de valores a cobrar (em aberto)",
        f"Base local ERP Controle de Crédito · Gerado em {TODAY.strftime('%d/%m/%Y')} · Somente cobranças não pagas",
    )
    add_kpi_card(ws, "A4", "Total a cobrar", total_aberto, "111827")
    add_kpi_card(ws, "C4", "Total vencido", total_vencido, "991B1B")
    add_kpi_card(ws, "E4", "Pendente / a vencer", total_pendente, "92400E")
    add_kpi_card(ws, "G4", "Credores em aberto", qtd_credores, "1F2937")
    add_kpi_card(ws, "I4", "Cobranças abertas", qtd_cobrancas, "1F2937")
    ws["A8"] = "Maior exposição"
    ws["A8"].font = Font(bold=True, color="374151")
    ws["B8"] = maior_exposicao["credor"] if maior_exposicao else "-"
    ws["C8"] = maior_exposicao["total"] if maior_exposicao else 0
    ws["C8"].number_format = 'R$ #,##0.00'
    ws["E8"] = "Diagnóstico"
    ws["E8"].font = Font(bold=True, color="374151")
    ws["F8"] = (
        f"{qtd_credores} credores com valores em aberto; "
        f"{total_vencido / total_aberto:.1%} do saldo está vencido."
        if total_aberto
        else "Sem valores em aberto."
    )

    headers = [
        "Credor",
        "Qtd.",
        "Total em aberto",
        "Vencido",
        "Pendente",
        "Primeiro vencimento",
        "Último vencimento",
        "Maior atraso",
        "% do total",
    ]
    start_row = 11
    for idx, header in enumerate(headers, 1):
        ws.cell(start_row, idx).value = header
    style_table_header(ws, start_row, 1, len(headers))
    for ridx, item in enumerate(summary, start_row + 1):
        values = [
            item["credor"],
            item["qtd"],
            item["total"],
            item["vencido"],
            item["pendente"],
            item["primeiro_vencimento"],
            item["ultimo_vencimento"],
            item["maior_atraso"],
            item["participacao"],
        ]
        for cidx, value in enumerate(values, 1):
            ws.cell(ridx, cidx).value = value
    last_summary_row = start_row + len(summary)
    apply_money_format(ws, ["C", "D", "E"], start_row + 1, last_summary_row)
    for row in range(start_row + 1, last_summary_row + 1):
        ws[f"F{row}"].number_format = "dd/mm/yyyy"
        ws[f"G{row}"].number_format = "dd/mm/yyyy"
        ws[f"I{row}"].number_format = "0.0%"
    table = Table(displayName="ResumoCredores", ref=f"A{start_row}:I{last_summary_row}")
    table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True, showColumnStripes=False)
    ws.add_table(table)
    ws.freeze_panes = "A11"

    chart = BarChart()
    chart.title = "Total em aberto por credor"
    chart.y_axis.title = "Valor em aberto"
    chart.x_axis.title = "Credor"
    data_ref = Reference(ws, min_col=3, min_row=start_row, max_row=last_summary_row)
    cats_ref = Reference(ws, min_col=1, min_row=start_row + 1, max_row=last_summary_row)
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats_ref)
    chart.height = 8.5
    chart.width = 18
    ws.add_chart(chart, "K11")

    # Detail by creditor
    set_dimensions(detail, {"A": 24, "B": 14, "C": 15, "D": 16, "E": 16, "F": 13, "G": 13})
    style_title(
        detail,
        "Detalhe separado por credor",
        "Cada bloco mostra somente as cobranças em aberto do respectivo credor.",
    )
    row = 4
    grouped = defaultdict(list)
    for item in rows:
        grouped[item["credor"]].append(item)
    for item in summary:
        credor = item["credor"]
        items = grouped[credor]
        detail.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
        detail.cell(row, 1).value = f"{credor} · Total em aberto: R$ {item['total']:,.2f} · {item['qtd']} cobrança(s)"
        detail.cell(row, 1).font = Font(bold=True, color="FFFFFF")
        detail.cell(row, 1).fill = PatternFill("solid", fgColor="111827")
        row += 1
        detail_headers = ["Credor", "Valor em aberto", "Vencimento", "Competência", "Status", "Dias atraso", "Empréstimo"]
        for cidx, header in enumerate(detail_headers, 1):
            detail.cell(row, cidx).value = header
        style_table_header(detail, row, 1, len(detail_headers))
        row += 1
        for charge in items:
            values = [
                charge["credor"],
                charge["valor"],
                charge["vencimento"],
                charge["competencia"],
                charge["status"],
                charge["dias_atraso"],
                charge["emprestimo_id"],
            ]
            for cidx, value in enumerate(values, 1):
                detail.cell(row, cidx).value = value
            detail[f"B{row}"].number_format = 'R$ #,##0.00'
            detail[f"C{row}"].number_format = "dd/mm/yyyy"
            if charge["status"] == "atrasado":
                detail[f"E{row}"].fill = PatternFill("solid", fgColor="FEE2E2")
                detail[f"E{row}"].font = Font(color="991B1B", bold=True)
            else:
                detail[f"E{row}"].fill = PatternFill("solid", fgColor="FEF3C7")
                detail[f"E{row}"].font = Font(color="92400E", bold=True)
            row += 1
        row += 1
    detail.freeze_panes = "A4"

    # Base
    base_headers = [
        "Credor ID",
        "Credor",
        "Cobrança ID",
        "Empréstimo ID",
        "Competência",
        "Vencimento",
        "Valor",
        "Status",
        "Dias atraso",
    ]
    for cidx, header in enumerate(base_headers, 1):
        base.cell(1, cidx).value = header
    style_table_header(base, 1, 1, len(base_headers))
    for ridx, item in enumerate(rows, 2):
        values = [
            item["credor_id"],
            item["credor"],
            item["cobranca_id"],
            item["emprestimo_id"],
            item["competencia"],
            item["vencimento"],
            item["valor"],
            item["status"],
            item["dias_atraso"],
        ]
        for cidx, value in enumerate(values, 1):
            base.cell(ridx, cidx).value = value
    base_last = len(rows) + 1
    base.add_table(
        Table(
            displayName="BaseCobrancasEmAberto",
            ref=f"A1:I{base_last}",
            tableStyleInfo=TableStyleInfo(name="TableStyleMedium2", showRowStripes=True),
        )
    )
    set_dimensions(base, {"A": 10, "B": 24, "C": 12, "D": 12, "E": 13, "F": 14, "G": 14, "H": 12, "I": 12})
    apply_money_format(base, ["G"], 2, base_last)
    for ridx in range(2, base_last + 1):
        base[f"F{ridx}"].number_format = "dd/mm/yyyy"
    base.freeze_panes = "A2"

    for sheet in wb.worksheets:
        for row_cells in sheet.iter_rows():
            for cell in row_cells:
                cell.alignment = Alignment(vertical="center", wrap_text=False)
        sheet.sheet_view.showGridLines = False

    return wb


def main():
    rows = fetch_rows()
    summary = summarize(rows)
    wb = build_workbook(rows, summary)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUTPUT_PATH)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
