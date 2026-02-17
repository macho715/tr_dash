---
name: agi-excel-refresh-derived
description: 8_EVENT_MAP 기반으로 9_SEGMENT_DELTA/13_WINDOWS/12_GATE_EVAL을 재계산/검증. (recalc, refresh, derived)
---

# agi-excel-refresh-derived

## When to Use
- "recalc", "refresh", "derived" — 이벤트 맵 기반 파생 시트 구조 검증·재계산할 때

## Inputs
- xlsx: 대상 엑셀 파일

## Steps
1) 필수 시트 존재 여부 검증: 8_EVENT_MAP, 9_SEGMENT_DELTA_TR1-TR3, 10_EVIDENCE_LOG, 12_GATE_EVAL, 13_WINDOWS_ANALYSIS.
2) 헤더 무결성 확인.
3) 실제 수식 계산은 Excel 열릴 때 수행(스크립트는 구조 검증만).

## Execution
```bash
python .cursor/skills/agi-excel-report-v3/scripts/refresh.py --xlsx <path>
```

## Outputs
- 구조 검증 결과 (OK / Missing sheets)
