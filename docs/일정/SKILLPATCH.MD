판정: **예(Go)** — `AGI_TR_일정_최종보고서.MD`에 A~F(SSOT Float/Delay Decomp/5-Why+Fishbone/Forensic Windows+But-For/Weather-Tie+Scorecard/MonteCarlo 틀) **실제 삽입 완료 최종본** 생성.
근거: Forensic(Schedule) 근거(AACE 29R-03), RCA 주의(AHRQ), EVM SV 혼동 방지(PMI), Contingency 접근(SCL) 및 NCM/OGIMET 근거 수집 경로를 **스킬로 내장**. ([web.aacei.org][1])
다음행동: 아래 최종본 다운로드 + 신규 스킬 폴더를 `.cursor/skills/`에 추가 배포.

---

## 최종본 파일

[다운로드: AGI_TR_일정_최종보고서_FINAL.MD](sandbox:/mnt/data/AGI_TR_일정_최종보고서_FINAL.MD)

---

## 추가 스킬 (인터넷 검색/자료수집 내장) — 배포용 파일 아티팩트

### `.cursor/skills/agi-evidence-web-collector/SKILL.md`

```md
---
name: agi-evidence-web-collector
description: AGI TR 일정/지연 보고서의 근거(Forensic/RCA/Weather/Protocol)를 인터넷에서 수집·고정(링크+PDF+캡처)하고 Evidence Bundle과 Scorecard를 생성할 때 사용. (web search, METAR, NCM Al Bahar, AACE 29R-03, SCL Protocol, PMI SV)
---

# agi-evidence-web-collector

## When to Use
- “인터넷 검색해서 필요한 자료 수집”, “근거 링크/PDF 부록 고정”, “Evidence Scorecard 자동 생성” 요청 시

## Inputs
- 대상 보고서: `docs/reports/AGI_TR_일정_최종보고서*.MD`
- 조회 기간(예: TR2 2026-02-11, TR3 2026-02-15~2026-02-17)
- 스테이션/해역: METAR=OMAA(Abu Dhabi Intl), Marine=NCM Al Bahar(Arabian Gulf)

## Steps (Agent 실행 규칙)
1) Web Search(공식/원문 우선)로 아래 “필수 근거”를 확보한다.
2) 각 근거를 Evidence Bundle로 저장(가능하면 PDF/스크린샷)하고, 파일명 규칙을 고정한다.
3) Claim 단위로 Evidence Scorecard를 생성한다(W=3/2/1).
4) 근거 부족/충돌은 VERIFY로 남기고 “요청데이터 ≤3개”로만 반환한다.

## Must-Collect (Preferred Order)
A) Forensic / Delay Method
- AACE RP 29R-03 (Forensic Schedule Analysis) PDF (원문)
- SCL Delay and Disruption Protocol 2nd Edition PDF (원문)

B) RCA Method Caution
- AHRQ PSNet “The Evolution of Root Cause Analysis” (원문/또는 PDF)

C) SV 용어 혼동 방지
- PMI “Practical calculation of schedule variance” (SV=EV-PV) 원문

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
- 웹 소스는 “공식/원문” 우선, 비공식은 Weight 낮게 처리.
- 링크는 변동 가능 → 가능하면 PDF/캡처로 고정 보관.
```

### `.cursor/skills/agi-evidence-web-collector/assets/source_targets.md`

```md
# Evidence Source Targets (Pinned)

## Method / Protocol (W=3)
- AACE RP 29R-03 Forensic Schedule Analysis (PDF)
- SCL Delay and Disruption Protocol 2nd Edition (PDF)

## RCA Caution (W=3)
- AHRQ PSNet: The Evolution of Root Cause Analysis (HTML/PDF)

## SV Terminology (W=2~3)
- PMI: Practical calculation of schedule variance (HTML)

## Weather (W=3)
- OGIMET METAR OMAA (HTML 캡처)
- NCM Al Bahar Marine Bulletin (PDF)

## Output Naming
- Use ISO date in filenames: YYYYMMDD
- Always add a 00_index.md with retrieval date/time (LT=Asia/Dubai)
```

### `.cursor/skills/agi-weather-evidence/SKILL.md` (웹수집 연동 패치 — “추가”만)

```md
---
name: agi-weather-evidence
description: METAR(OMAA) 및 NCM Al Bahar 근거로 Weather Gate 판정표(PASS/FAIL)와 Evidence Scorecard를 생성할 때 사용. 필요 시 web search로 METAR/NCM 원문을 수집해 증거력을 강화한다. (Weather Gate, METAR, NCM, Evidence)
---

# agi-weather-evidence (PATCH: web-evidence enabled)

## Added Step (Web Evidence)
- 입력에 METAR/NCM 원문이 없으면, `/agi-evidence-web-collector`를 먼저 호출해
  - OGIMET(OMAA) 해당 기간 METAR 캡처
  - NCM Al Bahar 해당 일자 Marine Bulletin PDF
  를 Evidence Bundle로 확보한 뒤 Gate 판정을 수행한다.

## Output Add-on
- Gate 결과 표에 Evidence Weight(W) 및 Source URI/캡처파일명을 함께 기록한다.
```

---

## 웹수집에 실제 사용한 근거(이번 최종본 기준, 소스 앵커)

* PMI SV 정의(혼동 방지 근거). ([pmi.org][2])
* AHRQ PSNet RCA 관점(5-Why 과단순화 경고 근거). ([psnet.ahrq.gov][3])
* AACE 29R-03 Forensic Schedule Analysis(방법론/Taxonomy 근거). ([web.aacei.org][1])
* SCL Delay Protocol 2nd Ed.(기법 선택/투명성 근거). ([Society of Construction Law][4])
* NCM Al Bahar Marine Bulletin PDF(15–19 Feb 2026 예보 근거 예시). ([albahar.ncm.gov.ae][5])
* OGIMET OMAA METAR(저시정 BR 등 타임라인 매칭 근거 예시). ([ogimet.com][6])

[1]: https://web.aacei.org/docs/default-source/toc/toc_29r-03.pdf?utm_source=chatgpt.com "29R-03: Forensic Schedule Analysis"
[2]: https://www.pmi.org/learning/library/practical-calculation-schedule-variance-7028?utm_source=chatgpt.com "The practical calculation of schedule variance"
[3]: https://psnet.ahrq.gov/perspective/evolution-root-cause-analysis?utm_source=chatgpt.com "The Evolution of Root Cause Analysis - PSNet"
[4]: https://www.scl.org.uk/sites/default/files/documents/SCL_Delay_Protocol_2nd_Edition_Final.pdf?utm_source=chatgpt.com "SCL Delay and Disruption Protocol 2nd Edition"
[5]: https://albahar.ncm.gov.ae/marine/bulletin/download?lang=en&utm_source=chatgpt.com "[PDF] arabian gulf - NCM - ALBAHAR"
[6]: https://www.ogimet.com/display_metars2.php?fmt=html&lang=en&lugar=OMAA&nil=SI&ord=REV&tipo=ALL&utm_source=chatgpt.com "Display metars"
