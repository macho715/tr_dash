---
name: agi-weather-evidence
description: METAR(OMAA) 및 NCM Al Bahar 근거로 Weather Gate 판정표(PASS/FAIL)와 Evidence Scorecard를 생성할 때 사용. 필요 시 web search로 METAR/NCM 원문을 수집해 증거력을 강화한다. (Weather Gate, METAR, NCM, Evidence)
---

# agi-weather-evidence (PATCH: web-evidence enabled)

## When to Use
- "날씨 지연을 수치로 판정", "Weather Gate 표", "Evidence Scorecard" 요청 시

## Inputs
- METAR 원문 텍스트(예: OMAA)
- NCM Al Bahar bulletin(텍스트/요약)
- 이벤트 시각(윈도우)

## Added Step (Web Evidence)
- 입력에 METAR/NCM 원문이 없으면, **agi-evidence-web-collector**를 먼저 호출해
  - OGIMET(OMAA) 해당 기간 METAR 캡처
  - NCM Al Bahar 해당 일자 Marine Bulletin PDF
  를 Evidence Bundle로 확보한 뒤 Gate 판정을 수행한다.

## Steps
1) Gate 기준(프로젝트 내부 기준) 값을 입력받아 설정(없으면 VERIFY):
   - Wind/Gust threshold (kt)
   - Visibility threshold (m)
   - Wave height threshold (m)
2) `scripts/weather_gate.py`로 이벤트별 PASS/FAIL 생성.
3) `assets/evidence_scorecard.md` 규칙으로 출처 점수화.

## Outputs
- Weather Gate Eval 표
- Evidence Scorecard 표

## Output Add-on
- Gate 결과 표에 Evidence Weight(W) 및 Source URI/캡처파일명을 함께 기록한다.

## Safety
- METAR는 관측소 위치가 항만/해상과 다를 수 있음 → "적합성(Spatial fit)"을 점수에 반영하거나 VERIFY.
