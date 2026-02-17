# ChangeLog — /agi-report-autopilot 2026-02-18

## Preflight
- report_path: docs/일정/AGI_TR_일정_최종보고서.MD ✓
- 앵커 검출: ANCHOR_A~F (L1/L2)
- events_csv: docs/일정/events_from_report.csv (보고서 데이터 기반 생성)

## 적용 내역

### B) Segment Δh (agi-delay-decomp)
- events_from_report.csv → segment_delta.py 실행
- TR1: S1=0h, S2=98.97h, S3=91.50h, S4=94.53h, S5=30.67h
- TR2: S1=0h, S2=65.70h, S3~S5 VERIFY (AGI 이벤트 미기록)
- TR3: S1=1.90h (MZP_ETA_PBP 12:30→ALL_FAST 14:24), S2=36.60h, S3~S5 VERIFY
- **정정**: TR3 MZP_ALL_FAST 14:20 → 14:24 (Evidence 기준)

### 산출물
- docs/일정/AGI_TR_일정_최종보고서.MD (갱신)
- docs/일정/AGI_TR_일정_최종보고서_FINAL.MD (갱신)
- docs/일정/events_from_report.csv
- docs/일정/segment_delta_out.md

## VERIFY (≤3)
1. TR2/TR3 S3~S5: AGI_ALL_FAST, LOADIN_DONE, AGI_CAST_OFF 이벤트 제공 시 Δh 산출 가능
2. segment_stats: agi-montecarlo-buffer용 TR1~3 분포 데이터 미제공 → P50/P80/P90 보류
3. (없음)
