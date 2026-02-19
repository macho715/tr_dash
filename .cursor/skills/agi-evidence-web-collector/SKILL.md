---
name: agi-evidence-web-collector
description: AGI TR 일정/지연 보고서의 근거(Forensic/RCA/Weather/Protocol)를 인터넷에서 수집·고정(링크+PDF+캡처)하고 Evidence Bundle과 Scorecard를 생성할 때 사용. (web search, METAR, NCM Al Bahar, AACE 29R-03, SCL Protocol, PMI SV)
---

# agi-evidence-web-collector

## When to Use
- "인터넷 검색해서 필요한 자료 수집", "근거 링크/PDF 부록 고정", "Evidence Scorecard 자동 생성" 요청 시

## Inputs
- 대상 보고서: `docs/reports/AGI_TR_일정_최종보고서*.MD`
- 조회 기간(예: TR2 2026-02-11, TR3 2026-02-15~2026-02-17)
- 스테이션/해역: METAR=OMAA(Abu Dhabi Intl), Marine=NCM Al Bahar(Arabian Gulf)

## Steps (Agent 실행 규칙)
1) Web Search(공식/원문 우선)로 아래 "필수 근거"를 확보한다.
2) 각 근거를 Evidence Bundle로 저장(가능하면 PDF/스크린샷)하고, 파일명 규칙을 고정한다.
3) Claim 단위로 Evidence Scorecard를 생성한다(W=3/2/1).
4) 근거 부족/충돌은 VERIFY로 남기고 "요청데이터 ≤3개"로만 반환한다.

## Must-Collect (Preferred Order)
A) Forensic / Delay Method
- AACE RP 29R-03 (Forensic Schedule Analysis) PDF (원문)
- SCL Delay and Disruption Protocol 2nd Edition PDF (원문)

B) RCA Method Caution
- AHRQ PSNet "The Evolution of Root Cause Analysis" (원문/또는 PDF)

C) SV 용어 혼동 방지
- PMI "Practical calculation of schedule variance" (SV=EV-PV) 원문

D) Weather Evidence
- OGIMET OMAA METAR query 결과(해당 날짜/시간 구간 캡처)
- NCM Al Bahar Marine Bulletin PDF(해당 날짜 포함)

## Outputs
- `evidence_bundle/` (링크+PDF/캡처+메타)
  - 00_index.md
  - 10_method_aace29r03.pdf
  - 11_protocol_scl_2017.pdf
  - 20_rca_ahrq_psnet.pdf (또는 html 캡처)
  - 30_pmi_sv.html (또는 캡처)
  - 40_weather_ogimet_OMAA_<YYYYMMDD_range>.html (캡처)
  - 41_marine_ncm_albahar_<YYYYMMDD>.pdf
- `evidence_scorecard.md` (Claim/Source/Weight/Date/Pass-Fail-Verify)
- `verify_requests.md` (부족 데이터 ≤3)

## Safety
- 내부 계약단가/PII는 웹검색 금지(마스킹).
- 웹 소스는 "공식/원문" 우선, 비공식은 Weight 낮게 처리.
- 링크는 변동 가능 → 가능하면 PDF/캡처로 고정 보관.
