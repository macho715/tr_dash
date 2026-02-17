#!/usr/bin/env python3
import argparse
import re

def parse_metar_lines(text: str):
    # 매우 단순 파서(필요 최소): 풍속/가스트/시정 키워드만 추출
    # 예: 29017G27KT, 2500m BR, FG
    wind = re.search(r"\b(\d{3})(\d{2})(G(\d{2}))?KT\b", text)
    vis_m = re.search(r"\b(\d{4})\b", text)  # 4자리 시정(m) 단순 추정
    wx = []
    for code in ["FG", "BR", "HZ", "DU", "TS", "RA"]:
        if re.search(rf"\b{code}\b", text):
            wx.append(code)
    out = {
        "wind_kt": int(wind.group(2)) if wind else None,
        "gust_kt": int(wind.group(4)) if wind and wind.group(4) else None,
        "vis_m": int(vis_m.group(1)) if vis_m else None,
        "wx": ",".join(wx) if wx else None
    }
    return out

def gate_eval(metar, wind_thr, gust_thr, vis_thr):
    fail = []
    if metar["wind_kt"] is not None and metar["wind_kt"] > wind_thr:
        fail.append("WIND")
    if metar["gust_kt"] is not None and metar["gust_kt"] > gust_thr:
        fail.append("GUST")
    if metar["vis_m"] is not None and metar["vis_m"] < vis_thr:
        fail.append("VIS")
    return ("FAIL" if fail else "PASS", ",".join(fail) if fail else "")

def main():
    ap = argparse.ArgumentParser(description="Weather Gate evaluation from METAR text (minimal parser).")
    ap.add_argument("--metar", required=True, help="Path to METAR text file.")
    ap.add_argument("--wind_thr", type=int, default=20, help="Wind threshold (kt).")
    ap.add_argument("--gust_thr", type=int, default=25, help="Gust threshold (kt).")
    ap.add_argument("--vis_thr", type=int, default=3000, help="Visibility threshold (m).")
    args = ap.parse_args()

    text = open(args.metar, "r", encoding="utf-8").read()
    metar = parse_metar_lines(text)
    verdict, reasons = gate_eval(metar, args.wind_thr, args.gust_thr, args.vis_thr)

    print("| Item | Value |")
    print("|:--|:--|")
    print(f"| wind_kt | {metar['wind_kt']} |")
    print(f"| gust_kt | {metar['gust_kt']} |")
    print(f"| vis_m | {metar['vis_m']} |")
    print(f"| wx | {metar['wx']} |")
    print("")
    print("| Gate | Verdict | Reasons |")
    print("|:--|:--:|:--|")
    print(f"| WeatherGate | {verdict} | {reasons} |")

if __name__ == "__main__":
    main()
