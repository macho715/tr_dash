---
name: agi-report-autopilot
description: AGI_TR_일정_최종보고서.MD를 입력받아 웹근거 수집(선택)→A~F 생성→삽입 위치에 자동 반영→FINAL.MD를 생성하는 완전 자동 파이프라인. (autopilot, end-to-end, final report, evidence bundle)
---

# agi-report-autopilot

## When to Use
- "보고서 완전 자동", "최종본 자동 생성", "파이프라인으로 한번에" 요청 시
- `/report-pipeline` 또는 `/agi-report-autopilot` 호출 시

## Inputs
- report_path (default): `docs/reports/AGI_TR_일정_최종보고서.MD` (또는 `docs/일정/AGI_TR_일정_최종보고서.MD`)
- events_csv (optional): Segment 계산용 이벤트 로그
- metar_text / ncm_text (optional): 사용자가 이미 가진 원문(있으면 web수집 생략)
- windows:
  - TR2: 2026-02-11~2026-02-12
  - TR3: 2026-02-15~2026-02-17
- output_path (default): `docs/reports/AGI_TR_일정_최종보고서_FINAL.MD`

## Steps (자동 실행 순서 고정, report-pipeline 0~10과 동일)

0) **Preflight**
   - 입력 파일 존재·경로 확인 (report_path)
   - 앵커 스캔(Exact→Normalized→Regex→Fallback, `assets/anchor_resolver.md` 참조)
   - 발견된 앵커와 사용된 매칭 단계(L1~L4)를 changelog에 기록

1) **(선택) Evidence Bundle**
   - metar/ncm/방법론 링크가 입력에 없으면 `/agi-evidence-web-collector` 실행

2) **A~F 모듈 실행**
   - /agi-report-ssot-float
   - /agi-delay-decomp
   - /agi-rca-pack
   - /agi-forensic-schedule
   - /agi-weather-evidence (필요 시 1) 결과 연동)
   - /agi-montecarlo-buffer

3) **Merge**: report-weaver로 "삽입 위치 고정 + append-only" 반영

4) **QA Gate**: evidence-judge + schedule-forensics로 VERIFY/충돌/가정 표기 강제

5) **Output**: *_FINAL.MD 생성 + ChangeLog + verify_requests(≤3)

## 실패/중단 규칙 (Locked)

`assets/pipeline_contract.md`의 실패 규칙을 따른다. 핵심:
- 핵심 이벤트(berthing/load-in/cast off) 누락 → 숫자 단정 금지, 표는 공란 + VERIFY 유지
- 외부 근거(METAR/NCM) 미확보 → Weather 섹션은 VERIFY 상태로만 산출
- 기존 섹션 삭제/덮어쓰기 금지(append-only)
- 앵커 전부 미검출 → FALLBACK: 문서 끝 append + VERIFY 배너 + verify_requests(≤3)

## Outputs
- FINAL 보고서 MD
- evidence_bundle/ + evidence_scorecard.md (가능 시)
- changelog.md
- verify_requests.md (≤3)

## Assets (참조)
- `assets/pipeline_contract.md` — 삽입 규칙, VERIFY 규칙, 실패/중단 규칙
- `assets/insertion_map.md` — 앵커(ANCHOR_A~F)
- `assets/anchor_resolver.md` — Preflight 앵커 탐색 규칙

## Safety
- 숫자/결론은 Evidence Scorecard 기반. 부족하면 VERIFY로 남김.
- 웹 검색은 "공식/원문 우선", 내부단가/PII는 검색·기록 금지.
