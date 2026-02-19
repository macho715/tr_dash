---
name: agi-excel-report-v3
description: AGI Site Delay Analysis v2/SSOT v1.1 엑셀을 v3.0-spec(8~18 시트, 컬럼 스키마, Data Validation, 기본 수식/포맷, Evidence Trace)으로 확장한 템플릿(xlsx)을 자동 생성할 때 사용. (0_README~7_FLOAT_SUMMARY 유지 + 8~18 추가)
---

# agi-excel-report-v3

## When to Use
- "엑셀 개편 명세서(v3.0) 적용 템플릿 만들어", "추가 시트 8~18 생성", "컬럼 스키마 고정" 요청 시

## Inputs
- output_xlsx (필수): 생성할 파일 경로
- base_xlsx (선택): 기존 Delay Analysis v2 파일(있으면 0~7을 복사 유지)
- tz (기본): Asia/Dubai
- numeric_precision (기본): 2-dec
- dv_lists: OFFICIAL/AIS/CHAT, HIGH/MED/LOW, OK/LIMIT/FAIL/VERIFY, DistType 등

## Steps
1) (선택) base_xlsx에서 0~7 시트를 복제(값/서식 포함).
2) v3.0 CORE(8~13) + ADV(14~18) 시트를 생성.
3) 각 시트 헤더/컬럼 폭/Freeze pane/필수 서식 적용.
4) Data Validation(DV) 적용: SourceType, Reliability, Verdict, DistType, Category6M 등.
5) 기본 수식 적용:
   - 9_SEGMENT_DELTA: Plan/Actual Duration(h), ΔDur_h
   - 12_GATE_EVAL: OK/LIMIT/FAIL/VERIFY (값 없으면 VERIFY)
6) "schema_v3_spec.md"를 0_README 또는 별도 Notes 영역에 삽입(스키마 고정).

## Outputs
- v3.0 템플릿 xlsx (빈 양식 + DV + 기본 수식 + 포맷)

## Execution
```bash
python .cursor/skills/agi-excel-report-v3/scripts/build_template.py --out <path> [--base <v2.xlsx>] [--tz Asia/Dubai]
```

## Safety
- TZ/DateTime 표준: YYYY-MM-DD HH:MM (LT) 고정
- 누락 데이터는 공란 + VERIFY로 남김(숫자 단정 금지)
