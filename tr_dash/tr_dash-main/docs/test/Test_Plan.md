---
doc_id: test-plan
refs: [../README.md, ../AGENTS.md]
updated: 2026-02-03
---

# 테스트 계획 (Test Plan)

**실행**: `pnpm test -- --run` (또는 `npm test -- --run`).  
**참조**: [README §테스트](../README.md), [AGENTS.md §2 검증](../AGENTS.md).

---

## 1. 테스트 시나리오 (AGENTS §2 검증)

- **Reflow 결정론**: 동일 입력 → 동일 출력.
- **Cycle 탐지**: 발견 시 중단 + collision 생성.
- **Evidence gate**: READY→IN_PROGRESS, COMPLETED→VERIFIED 전이 차단.

---

## 2. 테스트 케이스 위치

- `lib/**/__tests__/*` — baseline, compare, gantt, ssot, utils.
- `src/lib/**/__tests__/*` — reflow(forward-pass, backward-pass, collision-detect, dag-cycle, topo-sort, reflow-manager), state-machine, timeline(gantt-utils), derived-calc, map-status-colors, view-mode-store.
- `components/**/__tests__/*` — detail (DetailPanel), dashboard (why-panel), ops (AgiOpsDock).

---

## 3. 결과 요약

- **Vitest**: 167 tests (state-machine, reflow, collision, baseline, evidence 등).
- **1 suite 실패 시**: `src/lib/__tests__/history-evidence.test.ts` — import 경로 수정 필요 (`@/lib/state-machine/evidence-gate` → `@/src/lib/state-machine/evidence-gate`).
