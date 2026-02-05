# Subagent & Skill Consolidation - Phase 3 Implementation Plan

**생성일**: 2026-02-04  
**상태**: Ready for Execution  
**예상 시간**: 15-20분  
**위험도**: Low (역호환성 보장됨)

---

## 📋 Executive Summary

**목표**: `tr_dash-main/.cursor/` 중복 디렉토리 제거 + 문서 갱신

**범위**:
- 삭제: `tr_dash-main/.cursor/agents/` (13개 파일)
- 삭제: `tr_dash-main/.cursor/skills/` (11개 디렉토리)
- 갱신: `.cursor/agents/INDEX.md` (신규 에이전트 3개 추가)
- 보존: `archive/` (절대 삭제 금지)
- 보존: `.cursor/` (Master 위치)

**역호환성**: ✅ 모든 호출은 이름 기반이므로 경로 변경 영향 없음

---

## Phase 3.1: Pre-Implementation Checks (5분)

### Step 1: 하드코딩된 경로 참조 검색

```bash
# tr_dash-main/.cursor 경로 참조 검색
rg "tr_dash-main/\.cursor" --type md --type ts --type tsx --type json

# 결과 예상: 0개 (모든 참조는 상대 경로 또는 이름 기반)
```

**예상 결과**: 0개 매치  
**실패 시**: 매치된 파일 확인 후 경로 수정

### Step 2: 현재 디렉토리 구조 확인

```powershell
# 삭제 대상 확인
Get-ChildItem -Path "tr_dash-main\.cursor" -Recurse -File | Measure-Object

# 보존 대상 확인 (신규 에이전트)
Get-ChildItem -Path ".cursor\agents" -Filter "verifier.md","ux-auditor.md","security-auditor.md"

# 보존 대상 확인 (신규 스킬)
Get-ChildItem -Path ".cursor\skills" -Directory | Where-Object {$_.Name -like "trdash-*"}

# archive 보존 확인
Test-Path "archive\tr_dashboard-main_20260203\.cursor"
```

**예상 결과**:
- 삭제 대상: ~24개 파일
- 신규 에이전트: 3개 파일 존재
- 신규 스킬: 3개 디렉토리 존재
- archive: True (존재)

### Step 3: Git 상태 확인

```bash
git status --short

# 작업 디렉토리 클린 확인
# 예상: 변경 없음 또는 최근 작업 커밋됨
```

---

## Phase 3.2: Implementation - File Deletion (5분)

### Step 1: 백업 생성 (선택 사항, 안전장치)

```powershell
# tr_dash-main/.cursor 백업 (롤백용)
Copy-Item -Path "tr_dash-main\.cursor" -Destination "tr_dash-main\.cursor.backup" -Recurse
Write-Host "Backup created: tr_dash-main\.cursor.backup"
```

### Step 2: 중복 디렉토리 삭제

```powershell
# 경고: 이 명령은 되돌릴 수 없습니다 (git 커밋 전에는 복구 가능)

# 삭제 전 확인
Get-ChildItem -Path "tr_dash-main\.cursor" -Recurse | Select-Object FullName | Format-Table

# 실제 삭제
Remove-Item -Path "tr_dash-main\.cursor" -Recurse -Force

# 삭제 확인
Test-Path "tr_dash-main\.cursor"  # False 반환되어야 함
```

**안전장치**:
- Git으로 추적 중이므로 `git checkout` 또는 `git restore`로 복구 가능
- 백업 생성 시 `.cursor.backup` 디렉토리에서 복구 가능

### Step 3: 삭제 검증

```powershell
# archive는 보존되었는지 확인
Test-Path "archive\tr_dashboard-main_20260203\.cursor"  # True 반환되어야 함

# Master 위치 확인
Test-Path ".cursor\agents"  # True
Test-Path ".cursor\skills"  # True

# 신규 에이전트 확인
Test-Path ".cursor\agents\verifier.md"  # True
Test-Path ".cursor\agents\ux-auditor.md"  # True
Test-Path ".cursor\agents\security-auditor.md"  # True
```

---

## Phase 3.3: Documentation Updates (5분)

### Step 1: INDEX.md에 신규 에이전트 추가

**파일**: `.cursor/agents/INDEX.md`

**변경 내용**:
```markdown
# 기존 내용 유지...

## 🔍 범용 검증 에이전트

- **verifier**: 간단한 범용 검증자. 완료된 작업을 검증하고 구현 누락/테스트 실패/수용기준 미충족을 확인할 때 사용.

## 🎨 UX/보안 감사 에이전트

- **ux-auditor**: Deep Insight 기준으로 운영 UX를 감사한다. Decision Card/2-click/Apply 승인/DECIDE→EXECUTE→AUDIT 구조 점검 시 사용.

- **security-auditor**: env/secret/배포 위생을 감사한다. .env 추적, 하드코딩 키, 배포 설정 실수 위험 점검 시 사용.
```

**정확한 위치**: 문서 마지막 섹션에 추가 (다른 에이전트 설명과 동일한 포맷 사용)

### Step 2: INSTALL_COMPLETE.md 확인

**파일**: `.cursor/skills/INSTALL_COMPLETE.md`

**확인 사항**:
- [x] 이미 `.cursor/skills/` 참조 중 (변경 불필요)
- [x] 신규 스킬 3개 이미 반영됨

**Action**: 확인만, 변경 불필요

### Step 3: AGENTS.md 확인

**파일**: `AGENTS.md`

**확인 사항**:
```bash
# 하드코딩된 경로 참조 검색
rg "\.cursor/agents" AGENTS.md
rg "\.cursor/skills" AGENTS.md

# 예상: 0개 (상대 경로만 사용)
```

**Action**: 확인만, 변경 불필요

---

## Phase 3.4: Verification Testing (5분)

### Step 1: 에이전트 호출 테스트

**테스트 방법**: Cursor Chat에서 직접 호출

```
/agent-orchestrator
/tr-planner
/tr-implementer
/tr-verifier
/verifier
/docops-autopilot
/innovation-scout
/ux-auditor
/security-auditor
```

**예상 결과**: 모든 에이전트가 정상 로드 (에러 없음)

### Step 2: 스킬 호출 테스트

**테스트 스킬**:
- `tr-dashboard-autopilot`
- `tr-dashboard-patch`
- `docops-doc-manager`
- `trdash-deep-insight`

**테스트 방법**: "@" 멘션으로 스킬 선택 가능 여부 확인

**예상 결과**: 모든 스킬이 autocomplete에 표시됨

### Step 3: 파이프라인 게이트

```bash
# TypeScript 타입 체크
pnpm typecheck

# ESLint
pnpm lint

# 테스트 실행
pnpm test --run

# 빌드 확인 (선택)
pnpm build
```

**예상 결과**: 모든 명령 통과 (에러 없음)

---

## Phase 3.5: Git Commit (2분)

### Step 1: Git 상태 확인

```bash
git status
```

**예상 출력**:
```
deleted:    tr_dash-main/.cursor/agents/*.md (13 files)
deleted:    tr_dash-main/.cursor/skills/*/ (11 directories)
modified:   .cursor/agents/INDEX.md
```

### Step 2: Structural Commit

```bash
# 중복 제거 커밋
git add tr_dash-main/.cursor
git commit -m "structural: Remove duplicate agents/skills from tr_dash-main/.cursor/

- Deleted 13 duplicate agent files
- Deleted 11 duplicate skill directories
- Master location: .cursor/ (project root)
- Preserved: archive/ directory
- Refs: docs/plan/subagent-skill-consolidation-plan.md"

# 문서 갱신 커밋
git add .cursor/agents/INDEX.md
git commit -m "docs: Add new agents to INDEX.md

- Added verifier (범용 검증)
- Added ux-auditor (Deep Insight UX 감사)
- Added security-auditor (env/secret 보안 감사)
- Refs: .cursor/skills/INSTALL_COMPLETE.md"
```

---

## 🔄 Rollback Procedure (실패 시)

### Git 커밋 전 롤백

```powershell
# 삭제 취소 (git이 추적 중인 파일)
git restore tr_dash-main/.cursor

# 또는 백업에서 복구
Remove-Item -Path "tr_dash-main\.cursor" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "tr_dash-main\.cursor.backup" -Destination "tr_dash-main\.cursor" -Recurse
```

### Git 커밋 후 롤백

```bash
# 최근 커밋 되돌리기
git revert HEAD
git revert HEAD~1

# 또는 강제 리셋 (주의: push 전에만)
git reset --hard HEAD~2
```

---

## 📊 Risk Assessment

| 리스크 | 확률 | 영향 | 완화 방안 | 상태 |
|--------|------|------|-----------|------|
| 숨겨진 경로 참조 | Low | Medium | Pre-check Step 1 (rg 검색) | ✅ Mitigated |
| 기존 워크플로우 중단 | Very Low | High | 이름 기반 호출 (경로 무관) | ✅ Not Applicable |
| archive 디렉토리 오삭제 | Very Low | Medium | 명시적 경로 지정 + 검증 | ✅ Mitigated |
| 신규 에이전트 누락 | Low | Low | INDEX.md 갱신 + 검증 체크리스트 | ✅ Mitigated |
| Git 충돌 | Low | Low | 커밋 전 git status 확인 | ✅ Mitigated |

**종합 위험도**: **Low** ✅

---

## ✅ Success Criteria

- [ ] `tr_dash-main/.cursor/` 디렉토리 완전 삭제
- [ ] `archive/` 디렉토리 보존 확인
- [ ] `.cursor/agents/INDEX.md` 신규 에이전트 3개 추가
- [ ] 경로 참조 검색 결과: 0개
- [ ] 에이전트 호출 테스트: 9/9 통과
- [ ] 스킬 호출 테스트: 4/4 표시됨
- [ ] 파이프라인 게이트: `pnpm typecheck && pnpm lint` 통과
- [ ] Git 커밋 2개 생성 (structural + docs)
- [ ] 검증 리포트 생성

---

## 📁 Deliverables

1. **삭제된 파일**: `tr_dash-main/.cursor/` (24개 파일/디렉토리)
2. **갱신된 문서**: `.cursor/agents/INDEX.md`
3. **Git 커밋**: 2개 (structural, docs)
4. **검증 리포트**: `subagent-skill-consolidation-verification-report.md`

---

## 🚀 Next Steps (Phase 4)

**Phase 4: Verification & Report**
- 생성 파일: `docs/plan/subagent-skill-consolidation-verification-report.md`
- 내용: 실행 결과 + 검증 체크리스트 + 성공 메트릭
- 예상 시간: 5분

---

## Refs

- [Phase 1-2 계획](subagent-skill-consolidation-plan.md)
- [AGENTS.md](../../AGENTS.md)
- [.cursor/agents/INDEX.md](../../.cursor/agents/INDEX.md)
- [.cursor/skills/INSTALL_COMPLETE.md](../../.cursor/skills/INSTALL_COMPLETE.md)
