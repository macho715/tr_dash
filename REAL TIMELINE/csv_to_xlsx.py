"""Create adnoc.xlsx from adnoc.csv (same directory)."""
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
csv_path = os.path.join(base, "adnoc.csv")
xlsx_path = os.path.join(base, "adnoc.xlsx")

wb = Workbook()
ws = wb.active
ws.title = "adnoc"
with open(csv_path, "r", encoding="utf-8") as f:
    for i, row in enumerate(csv.reader(f, delimiter="\t")):
        for j, cell in enumerate(row, 1):
            val = cell.strip() if isinstance(cell, str) else cell
            ws.cell(row=i + 1, column=j, value=val)
wb.save(xlsx_path)
print("Created", xlsx_path)
