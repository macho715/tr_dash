#!/usr/bin/env python3
import argparse
import pandas as pd

SEGMENTS = [
    ("S1", "MZP_ETA", "MZP_ALL_FAST"),
    ("S2", "MZP_ALL_FAST", "MZP_ETD"),
    ("S3", "MZP_ETD", "AGI_ALL_FAST"),
    ("S4", "AGI_ALL_FAST", "LOADIN_DONE"),
    ("S5", "AGI_CAST_OFF", "NEXT_MZP_ALL_FAST"),
]

def main():
    ap = argparse.ArgumentParser(description="Compute segment delta hours per TR from event timestamps.")
    ap.add_argument("--in", dest="inp", required=True, help="Input CSV with columns: tr,event,ts_lt (ISO-like).")
    ap.add_argument("--out", dest="out", default="-", help="Output markdown to file, or '-' for stdout.")
    args = ap.parse_args()

    df = pd.read_csv(args.inp)
    for c in ["tr", "event", "ts_lt"]:
        if c not in df.columns:
            raise SystemExit(f"Missing column: {c}")

    df["ts_lt"] = pd.to_datetime(df["ts_lt"], errors="coerce")
    if df["ts_lt"].isna().any():
        bad = df[df["ts_lt"].isna()]
        raise SystemExit(f"Unparseable ts_lt rows: {len(bad)}")

    pivot = df.pivot_table(index="tr", columns="event", values="ts_lt", aggfunc="max")

    rows = []
    verify = []
    for tr in pivot.index:
        for seg, a, b in SEGMENTS:
            ta = pivot.loc[tr].get(a)
            tb = pivot.loc[tr].get(b)
            if pd.isna(ta) or pd.isna(tb):
                verify.append((tr, seg, a if pd.isna(ta) else "", b if pd.isna(tb) else ""))
                continue
            dh = (tb - ta).total_seconds() / 3600.0
            rows.append((tr, seg, a, b, dh))

    md = []
    md.append("| TR | Segment | From | To | Δh |")
    md.append("|---:|:--|:--|:--|---:|")
    for tr, seg, a, b, dh in rows:
        md.append(f"| {tr} | {seg} | {a} | {b} | {dh:.2f} |")

    if verify:
        md.append("\n**VERIFY(누락 이벤트)**")
        md.append("| TR | Segment | Missing |")
        md.append("|---:|:--|:--|")
        for tr, seg, ma, mb in verify:
            miss = ",".join([x for x in [ma, mb] if x])
            md.append(f"| {tr} | {seg} | {miss} |")

    out_text = "\n".join(md) + "\n"
    if args.out == "-":
        print(out_text)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out_text)

if __name__ == "__main__":
    main()
