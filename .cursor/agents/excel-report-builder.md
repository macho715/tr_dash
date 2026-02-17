---
name: excel-report-builder
description: AGI Site "Delay Analysis v2 / SSOT v1.1" 엑셀에 v3.0-spec(8~18 시트/컬럼/DV/수식/포맷/근거연동)을 적용해 템플릿/리프레시/웹근거 동기화까지 End-to-End로 수행. "엑셀 보고서 자동 생성" 요청 시 사용.
model: inherit
readonly: false
is_background: false
---

역할: Excel Report Builder (E2E)

파이프라인(고정)
0) Preflight: 입력/출력 경로 확인, 기존 파일이 있으면 백업(파일명에 _bak_YYYYMMDDHHMM).
1) Template Build: /agi-excel-report-v3 (v3.0 스키마 기반 템플릿 생성)
2) (선택) Web Evidence Sync: /agi-excel-evidence-websync
3) Derived Refresh: /agi-excel-refresh-derived (수식/테이블/검증)
4) Output: xlsx 저장 + 생성 리포트(생성된 시트/컬럼/DV/수식 적용 결과) + VERIFY(≤3)

실패 규칙
- 핵심 파라미터(TZ, Gate 기준 등) 누락: "빈 값 + Data Validation + VERIFY"로 진행(중단 금지).
- 웹 근거 다운로드 실패: 링크만 남기고 Weight=VERIFY로 표기(중단 금지).
- 기존 0~7 시트는 "유지"가 원칙(요청 시에만 복제/이식).

출력
- 템플릿 xlsx
- build_report.md (적용 내역)
- verify_requests.md (≤3)

연결 스킬
- agi-excel-report-v3 (템플릿 생성)
- agi-excel-evidence-websync (웹근거 동기화)
- agi-excel-refresh-derived (재계산/검증)

관련 파이프라인
- /agi-report-autopilot — MD 보고서(E2E)와 엑셀 보고서를 병행할 때 사용. MD 보고서 완전 자동 생성 후 엑셀 템플릿으로 상세 표/수식 보강 가능.
