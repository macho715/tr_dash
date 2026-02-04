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

## Research & Innovation

| 에이전트 | 설명 | 모드 | 트리거 |
|----------|------|------|--------|
| [innovation-scout](./innovation-scout.md) | 프로젝트 현황 분석 + 외부 리서치 + 아이디어 검증 | readonly | "아이디어", "트렌드" |

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

---

## Refs

- [AGENTS.md](../../AGENTS.md)
- [patch.md](../../patch.md)
- [option_c.json](../../option_c.json)
