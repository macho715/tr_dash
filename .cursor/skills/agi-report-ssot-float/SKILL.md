---
name: agi-report-ssot-float
description: AGI TR 보고서의 '1. SSOT 및 계산 규칙' 끝에 Critical Path/Float=0 및 SV_days 정의를 고정 문단으로 삽입할 때 사용. (SSOT, Critical Path, Float, Cycle 7.00d)
---

# agi-report-ssot-float

## When to Use
- "SSOT 섹션 강화", "Critical Path/Float 선언", "Cycle 7.00d 위험 설명" 요청 시

## Inputs
- 보고서 MD(기본: `docs/reports/AGI_TR_일정_최종보고서.MD`)
- SSOT 문장(이미 존재하면 재사용)

## Steps
1) `1. SSOT 및 계산 규칙` 섹션의 마지막에 아래 템플릿을 삽입.
2) Float 정의와 SV_days 정의를 보고서 표기(Δ(d))와 동일 의미로 통일.
3) EVM SV(=EV−PV)는 본 보고서 범위 밖임을 명시(혼동 방지).

## Output
- `assets/ssot_append.md` 블록을 그대로 삽입한 MD 조각

## Safety
- 일정/비용 EVM 용어 혼용 금지.
- Float=0 근거는 "TR4→TR7 직렬" 가정임을 명시(가정:).
