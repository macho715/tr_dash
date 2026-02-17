# Agent Index

> 이 프로젝트의 모든 서브에이전트 목록 및 사용 가이드

---

## 메타 에이전트

| 에이전트 | 설명 | 모드 |
|----------|------|------|
| **[agent-orchestrator](./agent-orchestrator.md)** | 모든 에이전트를 조율하는 메타 에이전트 | readonly |

---

## TR Core (Plan→Implement→Verify)

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [tr-planner](./tr-planner.md) | Contract 기반 실행 계획 수립 | readonly | "계획", "plan" |
| [tr-implementer](./tr-implementer.md) | 코드/데이터 구현 | write | "구현", "implement" |
| [tr-verifier](./tr-verifier.md) | Contract 준수 + E2E 검증 | readonly | "검증", "verify" |
| [verifier](./verifier.md) | 범용 간단 검증자 | readonly | "검증", "체크" |

---

## TR Dashboard UI/UX

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [tr-dashboard-patch](./tr-dashboard-patch.md) | patch.md 기반 UI/UX 구현 | write | "UI", "UX" |
| [tr-dashboard-layout-autopilot](./tr-dashboard-layout-autopilot.md) | 레이아웃 E2E | write | "레이아웃", "모바일" |
| [tr-dashboard-layout-verifier](./tr-dashboard-layout-verifier.md) | 레이아웃 회귀 검증 | readonly | "레이아웃 검증" |

---

## DocOps (문서 관리)

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [docops-autopilot](./docops-autopilot.md) | 문서정리 E2E | write | "문서정리" |
| [docops-scout](./docops-scout.md) | 문서 스캔 | readonly | "문서 스캔" |
| [docops-verifier](./docops-verifier.md) | 문서 검증 | readonly | "문서 검증" |

---

## Pipeline/Schedule

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [agi-schedule-updater](./agi-schedule-updater.md) | AGI Schedule 갱신 | write | "스케줄 업데이트" |

---

## AGI TR Report (일정 최종보고서)

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [report-pipeline](./report-pipeline.md) | 보고서 E2E 오케스트레이션(웹근거→A~F→삽입→VERIFY→FINAL) | write | "보고서 완전 자동", "/report-pipeline" |
| [excel-report-builder](./excel-report-builder.md) | 엑셀 v3.0 템플릿(8~18 시트)·웹근거·리프레시 E2E | write | "엑셀 보고서 자동 생성", "/excel-report-builder", "/agi-excel-report-v3" |
| [report-weaver](./report-weaver.md) | 보고서에 스킬 산출물을 삽입 위치에 합성/반영 | write | "보고서에 삽입", "최종본 반영" |
| [evidence-judge](./evidence-judge.md) | Evidence Scorecard·근거 충돌·VERIFY 회의적 검증 | readonly | "근거 점수", "VERIFY", "충돌" |
| [schedule-forensics](./schedule-forensics.md) | Windows/But-For 계산 검토 + 가정/한계 강제 표기 | readonly | "Windows Analysis", "But-For" |

연결 스킬: `agi-report-autopilot` (MD E2E 한 번 실행), `agi-excel-report-v3` (엑셀 템플릿), `agi-excel-evidence-websync`, `agi-excel-refresh-derived`, `agi-report-ssot-float`, `agi-delay-decomp`, `agi-rca-pack`, `agi-forensic-schedule`, `agi-weather-evidence`, `agi-montecarlo-buffer`, `agi-evidence-web-collector` (`.cursor/skills/`)

---

## Research & Innovation

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [innovation-scout](./innovation-scout.md) | 프로젝트 현황 분석 + 외부 리서치 + 아이디어 검증 | readonly | "아이디어", "트렌드" |

---

## Quality & Security Auditors

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [ux-auditor](./ux-auditor.md) | Deep Insight 기준 UX 감사 | readonly | "UX 감사", "사용성" |
| [security-auditor](./security-auditor.md) | env/secret/배포 설정 보안 감사 | readonly | "보안 감사", "env 체크" |

---

## 공통 참조

- **[_shared/common-rules.md](./_shared/common-rules.md)** - 모든 에이전트의 공통 규칙
- **문서 일관성 (common-rules §11)**: 문서 변경 시 README/LAYOUT/SYSTEM_ARCHITECTURE/WORK_LOG 상호 Ref·**본문 내용** 반영. DocOps 시 최신 작업 반영·본문 업데이트·docs: 커밋 분리.

---

## 사용법

### 1. 오케스트레이터 사용 (권장)
```
/agent-orchestrator "작업 설명"
```
→ 자동으로 적합한 에이전트 선택 및 실행

### 2. 직접 호출
```
/tr-planner "Trip-1 일정 계획"
/tr-implementer "Timeline 컴포넌트 구현"
/docops-autopilot
/report-pipeline   # 또는 /agi-report-autopilot — MD 보고서 E2E 자동 생성
/excel-report-builder   # 또는 /agi-excel-report-v3 — 엑셀 v3.0 템플릿 자동 생성
```

---

## 파이프라인 예시

### Feature 개발
```
tr-planner → tr-implementer → tr-verifier
```

### UI/UX 변경
```
tr-dashboard-patch → tr-dashboard-layout-verifier
```

### 문서 정리
```
docops-scout → docops-autopilot → docops-verifier
```

### 혁신/개선 사이클
```
innovation-scout → (APPLICABLE 시) tr-planner → tr-implementer → tr-verifier
```

### AGI TR 보고서 완전 자동 (MD)
```
/report-pipeline 또는 /agi-report-autopilot
→ Evidence(선택) → A~F 생성 → report-weaver 삽입 → QA(evidence-judge, schedule-forensics) → FINAL.MD + ChangeLog + VERIFY 카드
```

### AGI 엑셀 보고서 (v3.0)
```
/excel-report-builder 또는 /agi-excel-report-v3
→ Preflight → Template Build → (선택) Web Evidence Sync → Derived Refresh → xlsx + build_report + VERIFY
```

---

## Refs

- [AGENTS.md](../../AGENTS.md)
- [patch.md](../../patch.md)
- [option_c.json](../../option_c.json)
