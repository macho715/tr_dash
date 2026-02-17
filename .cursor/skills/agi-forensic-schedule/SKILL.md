---
name: agi-forensic-schedule
description: 보고서에 Forensic Schedule(As-Planned vs As-Built) 표기 + Windows Analysis + Collapsed As-Built(But-For) 2개를 삽입할 때 사용. (Windows, But-For, Forensic)
---

# agi-forensic-schedule

## When to Use
- "귀속(Attribution) 강화", "Windows Analysis 넣어", "But-For 시나리오" 요청 시

## Inputs
- TR2 윈도우: 2026-02-11~2026-02-12 (LT)
- TR3 윈도우: 2026-02-15~2026-02-17 (LT)
- 각 윈도우 이벤트 로그/증거

## Steps
1) 방법론 1줄: As-Planned vs As-Built 기반(Forensic) 문구 삽입.
2) `assets/windows_table.md`를 채움(Δh + Top2 원인 + 근거 W).
3) `assets/butfor_table.md`에 "But-For" 2개 작성(가정: 명시).

## Outputs
- Windows Analysis 표
- Collapsed As-Built(But-For) 표

## Safety
- But-For는 반사실 시나리오이므로 "가정:" 및 "불확실성"을 반드시 표기.
