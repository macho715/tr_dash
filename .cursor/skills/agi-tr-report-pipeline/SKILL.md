---
name: agi-tr-report-pipeline
description: Orchestrates AGI TR schedule/delay report production using subagents and skills. Use when inserting A~F content into the final report, weaving skill outputs into docs/reports/AGI_TR_일정_최종보고서.MD, or when the user asks for "보고서에 삽입", "최종본 반영", Evidence/VERIFY, or Windows/But-For/Forensic.
---

# AGI TR Report Pipeline

Orchestrates production of `AGI_TR_일정_최종보고서.MD` with fixed insert positions and evidence-backed conclusions. Combines subagents and skills; no fabrication—use VERIFY when data is missing.

## Skill Map (Single-Responsibility)

| Skill | Purpose | Trigger terms |
|-------|---------|---------------|
| agi-report-ssot-float | SSOT + Critical Path/Float/SV_days fixed paragraph | SSOT, Critical Path, Float=0, Cycle 7.00d |
| agi-delay-decomp | TR1~TR3 delay as S1~S5 Segment Δh table | Delay Decomposition, Segment, Δh |
| agi-rca-pack | TR2/TR3: 5-Why (2) + Fishbone 6M (1) | 5-Why, Fishbone, 6M |
| agi-forensic-schedule | Windows Analysis + Collapsed As-Built (But-For) | Windows Analysis, But-For, Forensic |
| agi-weather-evidence | METAR/NCM → Weather Gate + Evidence Scorecard | Weather Gate, METAR, NCM, Evidence |
| agi-montecarlo-buffer | TR4~TR7 P50/P80/P90 + Buffer from segment stats | Monte Carlo, P80, Buffer |
| agi-evidence-web-collector | Collect/pin web evidence (AACE, SCL, AHRQ, PMI, OGIMET, NCM) | 근거 수집, Evidence Bundle, METAR 원문 |

## Subagents (Cursor)

| Subagent | Role | Trigger | Use when |
|----------|------|---------|----------|
| report-weaver | Weave skill outputs into report at fixed insert positions | "보고서에 삽입", "최종본 반영" | Combining A~F into one MD |
| evidence-judge | Verify Evidence Scorecard, conflicts, VERIFY | "근거 점수", "VERIFY", "충돌" | Independent evidence check |
| schedule-forensics | Windows/But-For logic review, assumptions/limits | "Windows Analysis", "But-For" | Method and attribution |

## Pipeline (A~F → Report)

1. **A** agi-report-ssot-float → append to "1. SSOT 및 계산 규칙"
2. **B** agi-delay-decomp → table under "2. 1·2·3호기 실적"
3. **C** agi-rca-pack → "3. 지연 원인 분석"
4. **D** agi-forensic-schedule → Windows + But-For tables
5. **E** agi-weather-evidence (optionally after agi-evidence-web-collector if METAR/NCM missing)
6. **F** agi-montecarlo-buffer → "Contingency" section

## Report-Weaver Rules

- Keep existing headers/section numbers/tables; add only at defined insert positions.
- Never assert without data; use VERIFY and request 1~3 inputs.
- Every insert: (1) title of added block, (2) source/date, (3) assumptions/limits.

## Evidence Rules

- W=3: official (METAR, NCM bulletin)
- W=2: AIS/logs
- W=1: WhatsApp/verbal
- On conflict: higher W + time/place fit; if insufficient → VERIFY.

## Safety

- No EVM/schedule terminology mix (SV_days vs EV−PV).
- But-For = counterfactual → always label "가정:" and uncertainty.
- 5-Why is not a single-cause tool; cite evidence weight and alternatives.

## Full Specs

- Subagent and skill file contents: `docs/일정/SUBAGENTSKILL.MD`
- Web evidence collector and weather patch: `docs/일정/SKILLPATCH.MD`
