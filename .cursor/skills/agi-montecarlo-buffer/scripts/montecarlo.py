#!/usr/bin/env python3
import argparse
import numpy as np
import pandas as pd

def main():
    ap = argparse.ArgumentParser(description="Monte Carlo: compute P50/P80/P90 and buffer days from segment stats.")
    ap.add_argument("--in", dest="inp", required=True, help="CSV: segment,mean_h,std_h")
    ap.add_argument("--n", type=int, default=10000, help="Simulations")
    ap.add_argument("--out", default="-", help="Output markdown file or '-'")
    args = ap.parse_args()

    df = pd.read_csv(args.inp)
    for c in ["segment","mean_h","std_h"]:
        if c not in df.columns:
            raise SystemExit(f"Missing column: {c}")

    means = df["mean_h"].to_numpy(dtype=float)
    stds = df["std_h"].to_numpy(dtype=float)

    # 단순 정규 가정(가정:). 필요 시 로그정규로 교체 가능.
    samples = np.random.normal(loc=means, scale=stds, size=(args.n, len(means)))
    samples = np.clip(samples, 0, None)  # 음수 시간 방지
    total_h = samples.sum(axis=1)

    p50 = np.percentile(total_h, 50)
    p80 = np.percentile(total_h, 80)
    p90 = np.percentile(total_h, 90)

    buffer_h = max(0.0, p80 - p50)
    buffer_d = buffer_h / 24.0

    md = []
    md.append("#### Monte Carlo Result (가정: segment 시간 정규분포)")
    md.append("")
    md.append("| Metric | Hours | Days |")
    md.append("|:--|---:|---:|")
    md.append(f"| P50 | {p50:.2f} | {p50/24.0:.2f} |")
    md.append(f"| P80 | {p80:.2f} | {p80/24.0:.2f} |")
    md.append(f"| P90 | {p90:.2f} | {p90/24.0:.2f} |")
    md.append(f"| Buffer to reach P80 (P80-P50) | {buffer_h:.2f} | {buffer_d:.2f} |")

    out_text = "\n".join(md) + "\n"
    if args.out == "-":
        print(out_text)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out_text)

if __name__ == "__main__":
    main()
