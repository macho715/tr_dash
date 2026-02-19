# Changelog — agi-report-autopilot

**실행일**: 2026-02-18  
**입력**: docs/일정/AGI_TR_일정_최종보고서.MD  
**출력**: 동일 파일에 append-only 삽입 반영 + docs/일정/AGI_TR_일정_최종보고서_FINAL.MD (사본)

## Preflight (앵커 스캔)

| 앵커 | 검출 헤딩 | 매칭 단계 |
|------|------------|-----------|
| ANCHOR_A | ## 1. SSOT 및 계산 규칙 | L1 exact |
| ANCHOR_B | ## 2. 1·2·3호기 실적 (Plan vs Actual) | L3 regex |
| ANCHOR_C | ## 3. 지연 원인 분석 | L1 exact |
| ANCHOR_D | ## 5. Original vs Re-baseline (TR4~7 상세) | L3 regex |
| ANCHOR_E | ## 6. Evidence·참고 | L1 exact |
| ANCHOR_F | #### 2. 계획에 기상 리스크 반영 (Contingency 산정) | L3 regex |

Fallback 미사용.

## 추가된 섹션/표

| 위치 | 추가 내용 | 스킬/모듈 |
|------|------------|-----------|
| 1. SSOT 끝 | Critical Path / Float 고정 선언, SV_days 정의, 용어 주의 | agi-report-ssot-float |
| 2. 1·2·3호기 실적 하단 | Segment Δh (Delay Decomposition) 표 + VERIFY 문구 | agi-delay-decomp |
| 3. 지연 원인 분석 하단 | 5-Why / Fishbone(6M) 요약 | agi-rca-pack |
| 5. Original vs Re-baseline 하단 | Windows Analysis 표, But-For 2건 | agi-forensic-schedule |
| 6. Evidence·참고 하단 | Weather Gate / Evidence Scorecard 표 | agi-weather-evidence |
| 6. Contingency 산정 하위 | P50/P80/P90 및 Buffer 표 + VERIFY 문구 | agi-montecarlo-buffer |

## 근거/가정

- A: SSOT v1.1, Cycle 7.00d, Float=0 가정 명시.
- B: events_csv 미제공 → 공란 + VERIFY.
- C: Excel v2·WhatsApp·METAR 기반, 증거점수는 evidence-judge 참조.
- D: TR2/TR3 윈도우 및 But-For 가정·불확실성 표기.
- E: METAR(OMAA)·NCM·tutiempo 반영, 공간적 적합성 VERIFY.
- F: segment_stats 미제공 → 가정 산출 보류, 숫자 단정 금지.
