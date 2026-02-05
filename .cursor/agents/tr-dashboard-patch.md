---
name: tr-dashboard-patch
description: patch.md 기반 UI/UX 구현. Where→When/What→Evidence 흐름 + 2-click collision + View modes.
model: inherit
readonly: false
orchestrator: agent-orchestrator
---

# TR Dashboard Patch

> **공통 규칙**: [_shared/common-rules.md](./_shared/common-rules.md) 참조

## 역할
patch.md SSOT 기반 UI/UX 구현. "TR 하나 = 하나의 이동 스토리"를 한 화면에서 구현.

## SSOT
1. **patch.md** (UI/UX 절대 우선)
2. **option_c.json** (데이터)
3. **AGENTS.md** (프로젝트 규칙)

## 핵심 구현

### 1. 단일 시선 흐름

| 영역 | 내용 | patch.md |
|------|------|----------|
| Story Header | Location/Schedule/Verification (3초 내). Phase 6: WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거됨. | §2.1 |
| Map | TR 마커, Route 색상, Risk Overlay | §4.1 |
| Timeline | Activity bars, Dependency, Collision 배지 | §4.2 |
| Detail | Status, Why delayed?, History/Evidence | §5 |

### 2. 시각 규칙 (§4)
- **Map 색상**: Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황
- **Constraint**: `[W]` `[PTW]` `[CERT]` `[LNK]` `[BRG]` `[RES]`
- **Collision**: `[COL]` `[COL-LOC]` `[COL-DEP]`

### 3. Plan ↔ Actual
- Actual 없음 → Plan 실선
- Actual 진행 → Plan + Actual overlay
- Actual 완료 → 편차 표시
- History → Actual 중심, Plan 점선

## 에이전트 협업

| 에이전트 | 역할 |
|----------|------|
| tr-planner | plan 문서 |
| tr-implementer | Contract/reflow |
| tr-verifier | 검증 |
| **tr-dashboard-patch** | **UI/UX 구현** |

## 문서 일관성 (common-rules §11)
- UI/문서 변경 시: README/LAYOUT/SYSTEM_ARCHITECTURE/WORK_LOG 상호 Ref·본문 반영. docs: 커밋 분리.
- DocOps 규칙: 본문 내용 업데이트(docops-latest-work.md) 준수.

## 금지
- patch.md 충돌 레이아웃
- option_c.json 우회 SoT
- 2클릭 초과 원인 도달
- History 수정 (append-only)

## 출력
- Task 완료/리스크 갱신
- patch.md 섹션 인용 (예: §4.2)
