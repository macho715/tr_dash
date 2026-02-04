# Subagent & Skill Consolidation Plan

**생성일**: 2026-02-04  
**목적**: 프로젝트 내 중복된 서브에이전트와 스킬들을 분석하고 통합하여 유지보수성과 명확성 향상

---

## 1. 현황 분석 (Phase 1: Analysis)

### 1.1 중복 에이전트 현황

#### 완전 중복 (100% 동일)

| 에이전트 | 위치 1 | 위치 2 | 상태 |
|----------|--------|--------|------|
| agent-orchestrator.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** (fc 확인) |
| tr-planner.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| tr-implementer.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| tr-verifier.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| tr-dashboard-patch.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| tr-dashboard-layout-autopilot.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| tr-dashboard-layout-verifier.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| docops-autopilot.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| docops-scout.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| docops-verifier.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| innovation-scout.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| agi-schedule-updater.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |
| INDEX.md | `.cursor/agents/` | `tr_dash-main/.cursor/agents/` | **완전 동일** |

#### 신규 에이전트 (단일 위치)

| 에이전트 | 위치 | 용도 |
|----------|------|------|
| verifier.md | `.cursor/agents/` | 간단한 범용 검증자 (INSTALL_COMPLETE.md 참조) |
| ux-auditor.md | `.cursor/agents/` | Deep Insight 기준 UX 감사 |
| security-auditor.md | `.cursor/agents/` | env/secret 보안 감사 |

### 1.2 중복 스킬 현황

#### 완전 중복 (100% 동일)

| 스킬 | 위치 1 | 위치 2 | 위치 3 (archive) |
|------|--------|--------|------------------|
| docops-doc-manager | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| tr-dashboard-autopilot | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| tr-dashboard-layout-autopilot | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | - |
| tr-dashboard-layout-optimizer | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | - |
| tr-dashboard-patch | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| tr-dashboard-pipeline | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| tr-dashboard-ssot-guard | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| agi-schedule-daily-update | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| agi-schedule-pipeline-check | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| agi-schedule-shift | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| weather-go-nogo | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |
| water-tide-voyage | `.cursor/skills/` | `tr_dash-main/.cursor/skills/` | `archive/tr_dashboard-main_20260203/.cursor/skills/` |

#### 신규 스킬 (단일 위치)

| 스킬 | 위치 | 용도 |
|------|------|------|
| trdash-deep-insight | `.cursor/skills/` | UX/IA 개선 (DECIDE→EXECUTE→AUDIT) |
| trdash-p0-security-env | `.cursor/skills/` | env/secret 보안 위생 (P0) |
| trdash-append-only-audit | `.cursor/skills/` | History/Evidence를 append-only 로그로 승격 |

---

## 2. 기능 중복 분석 (보완 vs 진짜 중복)

### 2.1 Autopilot 시리즈 (보완 관계)

| 에이전트/스킬 | 범위 | 특화 | 판정 |
|---------------|------|------|------|
| **tr-dashboard-autopilot** (스킬) | 전체 개발 사이클 | SSOT 기반 Plan→Implement→Verify | **메인 오토파일럿** |
| **tr-dashboard-layout-autopilot** (에이전트+스킬) | 레이아웃 전용 | Audit→Design→Implement→Verify | **레이아웃 전문** (보완) |
| **tr-dashboard-layout-optimizer** (스킬) | 레이아웃 최적화 | Where→When/What→Evidence 구조 | **최적화 전문** (보완) |
| **tr-dashboard-patch** (에이전트+스킬) | UI/UX 구현 | patch.md 기반 UI/UX 구현 | **UI/UX 구현** (보완) |

**결론**: 보완 관계. 각각 다른 전문 영역. **통합 불필요**.

### 2.2 Verifier 시리즈 (보완 관계)

| 에이전트 | 범위 | 특화 | 판정 |
|----------|------|------|------|
| **verifier** | 범용 검증 | 간단한 체크리스트 검증 | **간단 검증** |
| **tr-verifier** | TR 전문 검증 | Contract v0.8.0 + E2E + 파이프라인 | **TR 전문 검증** (보완) |
| **docops-verifier** | 문서 검증 | doc_id/REF/링크/위치 규칙 | **문서 전문 검증** (보완) |
| **tr-dashboard-layout-verifier** | 레이아웃 검증 | 레이아웃/반응형/접근성 회귀 | **레이아웃 전문 검증** (보완) |
| **ux-auditor** | UX 감사 | Deep Insight 기준 UX 감사 | **UX 감사** (보완) |
| **security-auditor** | 보안 감사 | env/secret/배포 설정 보안 | **보안 감사** (보완) |

**결론**: 보완 관계. 각각 다른 검증 영역. **통합 불필요**.

### 2.3 DocOps 시리즈 (보완 관계)

| 에이전트/스킬 | 역할 | 판정 |
|---------------|------|------|
| **docops-scout** (에이전트) | 문서 스캔 (readonly) | **스캔 전문** |
| **docops-autopilot** (에이전트) | 문서 정리 E2E | **오케스트레이션** |
| **docops-doc-manager** (스킬) | 문서 정리/만들기 (최신 작업 반영) | **실행 스킬** |
| **docops-verifier** (에이전트) | 문서 검증 | **검증 전문** |

**결론**: 보완 관계. scout(스캔) → autopilot(오케스트레이션) → doc-manager(실행) → verifier(검증). **통합 불필요**.

---

## 3. 통합 계획 (Phase 2: Planning)

### 3.1 Master 위치 결정

**원칙**: 
- `.cursor/` 를 **Master 위치**로 지정 (프로젝트 루트)
- `tr_dash-main/.cursor/` 는 **삭제 대상** (중복)
- `archive/` 는 **보존** (삭제 금지)

**근거**:
1. Cursor 에이전트 시스템은 프로젝트 루트의 `.cursor/` 우선 로드
2. `tr_dash-main/` 는 구조상 중첩 프로젝트로 보이며, 실제 사용되지 않음
3. `INSTALL_COMPLETE.md`는 이미 루트 `.cursor/skills/`를 참조

### 3.2 중복 제거 전략

#### A. 에이전트 (Agents)

```yaml
action: 중복 제거
strategy:
  - master: .cursor/agents/
  - remove: tr_dash-main/.cursor/agents/
  - preserve:
      - verifier.md (신규)
      - ux-auditor.md (신규)
      - security-auditor.md (신규)
  - files_to_remove:
      - tr_dash-main/.cursor/agents/*.md (전체)
```

#### B. 스킬 (Skills)

```yaml
action: 중복 제거
strategy:
  - master: .cursor/skills/
  - remove: tr_dash-main/.cursor/skills/
  - preserve:
      - trdash-deep-insight/ (신규)
      - trdash-p0-security-env/ (신규)
      - trdash-append-only-audit/ (신규)
  - keep_archive: archive/ (보존, 삭제 금지)
  - files_to_remove:
      - tr_dash-main/.cursor/skills/*/ (전체)
```

### 3.3 마이그레이션 전략

**점진적 제거 (Surgical Removal)**:

1. **Step 1**: `tr_dash-main/.cursor/` 전체 디렉토리 삭제
2. **Step 2**: INDEX.md 갱신 (단일 위치 참조로 변경)
3. **Step 3**: INSTALL_COMPLETE.md 확인 (이미 `.cursor/skills/` 참조 중)
4. **Step 4**: AGENTS.md 확인 (경로 참조 없음 확인)

**역호환성**: 
- 모든 에이전트/스킬은 이름 기반 호출이므로 경로 변경 영향 없음
- 기존 워크플로우 중단 없음

---

## 4. 실행 계획 (Phase 3: Implementation)

### 4.1 삭제 대상 목록

```bash
# 중복 에이전트 디렉토리 (13개 파일)
tr_dash-main/.cursor/agents/

# 중복 스킬 디렉토리 (11개 디렉토리)
tr_dash-main/.cursor/skills/
```

**보존 대상**:
```bash
# archive는 보존 (삭제 금지)
archive/tr_dashboard-main_20260203/.cursor/

# 신규 에이전트 (루트에만 존재)
.cursor/agents/verifier.md
.cursor/agents/ux-auditor.md
.cursor/agents/security-auditor.md

# 신규 스킬 (루트에만 존재)
.cursor/skills/trdash-deep-insight/
.cursor/skills/trdash-p0-security-env/
.cursor/skills/trdash-append-only-audit/
```

### 4.2 문서 업데이트

#### A. INDEX.md 업데이트

**변경 사항**: 없음 (이미 단일 위치 참조)

**확인 필요**:
- [x] `.cursor/agents/INDEX.md` - 상대 경로만 사용
- [x] 신규 에이전트 추가 필요: verifier, ux-auditor, security-auditor

#### B. INSTALL_COMPLETE.md 업데이트

**변경 사항**: 없음 (이미 `.cursor/skills/` 참조)

**확인 필요**:
- [x] 경로 확인: `.cursor/skills/` 우선 참조 중
- [x] 신규 스킬 반영 완료 (3개)

---

## 5. 검증 계획 (Phase 4: Verification)

### 5.1 기능 무결성 확인

```yaml
verification_checklist:
  agents:
    - [ ] agent-orchestrator 호출 정상
    - [ ] tr-planner 호출 정상
    - [ ] tr-implementer 호출 정상
    - [ ] tr-verifier 호출 정상
    - [ ] verifier 호출 정상
    - [ ] docops-autopilot 호출 정상
    - [ ] innovation-scout 호출 정상
  
  skills:
    - [ ] /tr-dashboard-autopilot 호출 정상
    - [ ] /tr-dashboard-patch 호출 정상
    - [ ] /docops-doc-manager 호출 정상
    - [ ] /trdash-deep-insight 호출 정상
  
  documentation:
    - [ ] INDEX.md 링크 확인
    - [ ] INSTALL_COMPLETE.md 경로 확인
    - [ ] AGENTS.md 경로 참조 없음 확인
```

### 5.2 파이프라인 게이트

```bash
# 필수 통과
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 6. 롤백 계획

**실패 시 롤백 절차**:

1. git 커밋 전: `git status` 확인 후 삭제 취소
2. git 커밋 후: `git revert` 사용
3. 백업 보관: `archive/` 디렉토리에 구버전 보존 (이미 완료)

---

## 7. 산출물 체크리스트

### Phase 1: Analysis ✅
- [x] 중복 에이전트 13개 확인
- [x] 중복 스킬 12개 확인
- [x] 기능 중복 분석 (보완 vs 진짜 중복)
- [x] Master 위치 결정

### Phase 2: Planning ✅
- [x] 통합 계획 수립
- [x] 마이그레이션 전략 수립
- [x] 역호환성 보장 방안
- [x] 테스트 계획

### Phase 3: Implementation (다음 단계)
- [ ] `tr_dash-main/.cursor/` 디렉토리 삭제
- [ ] INDEX.md에 신규 에이전트 추가
- [ ] INSTALL_COMPLETE.md 확인
- [ ] 커밋 생성

### Phase 4: Verification (다음 단계)
- [ ] 에이전트 호출 테스트
- [ ] 스킬 호출 테스트
- [ ] 문서 일관성 검증
- [ ] 파이프라인 게이트 통과
- [ ] 검증 리포트 생성

---

## 8. 타임라인

| Phase | 작업 | 상태 |
|-------|------|------|
| 1. Analysis | 중복 분석 + 기능 매핑 | ✅ 완료 |
| 2. Planning | 통합 계획 수립 | ✅ 완료 |
| 3. Implementation | 파일 삭제 + 문서 업데이트 | ⏳ 다음 |
| 4. Verification | 기능 무결성 + 파이프라인 통과 | ⏳ 대기 |

---

## 9. 리스크 및 완화 방안

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|-----------|
| 숨겨진 경로 참조 | Medium | Low | Grep으로 `tr_dash-main/.cursor` 참조 검색 |
| 기존 워크플로우 중단 | High | Low | 이름 기반 호출이므로 경로 변경 영향 없음 |
| archive 디렉토리 오삭제 | Low | Low | 삭제 전 명시적 확인 |
| 신규 에이전트 누락 | Medium | Low | INDEX.md 갱신 + 검증 체크리스트 |

---

## 10. 결론

### 주요 발견 사항

1. **완전 중복**: 13개 에이전트, 12개 스킬이 2개 위치에 100% 동일하게 존재
2. **보완 관계**: autopilot/verifier/docops 시리즈는 중복이 아닌 보완 관계
3. **신규 컴포넌트**: 3개 에이전트, 3개 스킬이 최근 추가됨 (INSTALL_COMPLETE.md 기준)
4. **Master 위치**: `.cursor/`가 프로젝트 표준 위치

### 통합 효과

- **유지보수성 향상**: 단일 위치 관리로 일관성 보장
- **명확성 향상**: 중복 제거로 혼란 감소
- **기존 워크플로우 보존**: 이름 기반 호출로 영향 없음
- **역호환성 보장**: 모든 참조는 상대 경로 사용

### 다음 단계

1. **Implementation**: tr_dash-main/.cursor/ 디렉토리 삭제
2. **Documentation**: INDEX.md 갱신
3. **Verification**: 기능 무결성 확인 + 파이프라인 통과
4. **Report**: 검증 리포트 생성

---

## Refs

- [AGENTS.md](../../AGENTS.md) - 프로젝트 전체 규칙
- [.cursor/agents/INDEX.md](../../.cursor/agents/INDEX.md) - 에이전트 인덱스
- [.cursor/skills/INSTALL_COMPLETE.md](../../.cursor/skills/INSTALL_COMPLETE.md) - 스킬 설치 완료 문서
- [docs/plan/](.) - 기타 계획 문서
