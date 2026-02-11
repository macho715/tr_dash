---
doc_id: document-integration-plan
refs: [../AGENTS.md, ../INDEX.md, tr-dashboard-plan.md, ../TYPECHECK_AND_LINT_FAILURES.md, ../CHANGELOG.md]
updated: 2026-02-11
---

# 문서 통합 계획 (Document Integration Plan)

tr-planner 및 DocOps가 참조하는 문서 통합·Ref 일관성 계획. Phase A 우선 적용, Phase B/C는 선택.

## 목표

- **단일 진입점**: `docs/INDEX.md` + `AGENTS.md` "최신 작업 반영"만 갱신하면 나머지는 Ref로 참조.
- **Ref 일관성**: plan/ 갱신 시 WORK_LOG·LAYOUT·SYSTEM_ARCHITECTURE·README·AGENTS와 상호 Ref 유지 (common-rules §11).
- **역할 분리**: CHANGELOG = 릴리즈 요약, WORK_LOG_* = 일별/Phase 상세.

## Phase A: Ref·진입점 일원화 (필수)

- [x] **A1** AGENTS.md "최신 작업 반영"에 TYPECHECK_AND_LINT_FAILURES, CHANGELOG 링크 포함
- [x] **A2** docs/INDEX.md 섹션 5에 CHANGELOG.md 행 추가
- [x] **A3** INDEX 상단에 "요약=CHANGELOG, 상세=WORK_LOG_*" 안내 문장 추가
- [x] **A4** docs/plan/tr-dashboard-plan.md에 "문서 일관성" 절 추가, 본 계획서 참조
- [x] **A5** 본 문서(document-integration-plan.md) 생성 및 INDEX/plan 목록에 링크

## Phase B: WORK_LOG 통합 (중기, 선택)

- 마스터 WORK_LOG(docs/WORK_LOG.md) 도입: Phase/날짜별 요약 + 기존 WORK_LOG_YYYYMMDD 링크.
- CHANGELOG와 역할 명시: INDEX에 "요약은 CHANGELOG, 일별 상세는 WORK_LOG" 유지.

## Phase C: DocOps·인벤토리 (선택)

- docs/_meta/inventory/docs.inventory.json 스캔 시 INDEX 수록 문서와 refs 일치 여부 점검.
- tr-planner 실행 후 plan ↔ WORK_LOG·LAYOUT·SYSTEM_ARCHITECTURE·README·AGENTS Ref 점검.

## Ref 규칙 (plan/ 문서)

- plan 문서 frontmatter `refs:` 최소 포함: LAYOUT.md, SYSTEM_ARCHITECTURE.md, 해당 WORK_LOG 1개, 필요 시 AGENTS.md, README.md.
- tr-dashboard-plan.md 갱신 시 위 목록 갱신.

## Refs

- [AGENTS.md](../AGENTS.md), [docs/INDEX.md](../INDEX.md), [tr-dashboard-plan.md](tr-dashboard-plan.md), [TYPECHECK_AND_LINT_FAILURES.md](../TYPECHECK_AND_LINT_FAILURES.md), [CHANGELOG.md](../CHANGELOG.md)
