"""Create wa_group_events.xlsx from wa_group_events.csv (same directory, comma-delimited)."""
import csv
import os

try:
    from openpyxl import Workbook
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "-q"])
    from openpyxl import Workbook

base = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base, "wa_group_events.csv")
xlsx_path = os.path.join(base, "wa_group_events.xlsx")

wb = Workbook()
ws = wb.active
ws.title = "wa_group_events"
with open(csv_path, "r", encoding="utf-8") as f:
    for i, row in enumerate(csv.reader(f)):
        for j, cell in enumerate(row, 1):
            val = cell.strip() if isinstance(cell, str) else cell
            ws.cell(row=i + 1, column=j, value=val)
wb.save(xlsx_path)
print("Created", xlsx_path)
