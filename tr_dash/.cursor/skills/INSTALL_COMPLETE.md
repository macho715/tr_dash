# TR Dashboard Skills + Subagents Package

**설치 완료:** 2026-02-04  
**위치:** `.cursor/skills/` 및 `.cursor/agents/`

---

## 📦 설치된 컴포넌트

### Skills (3개)

#### 1. `trdash-deep-insight`
**목적:** TR_Dash UX/IA 개선 (DECIDE→EXECUTE→AUDIT 구조)

**사용 시나리오:**
- 운영자 워크플로우 혼란 제거
- UTC/Local 타임존 혼선 해결
- Apply 안전장치 강화
- Empty state 개선

**주요 파일:**
- `.cursor/skills/trdash-deep-insight/SKILL.md`
- `references/ssot-summary.md` - P0/P1 우선순위
- `references/acceptance-criteria.md` - 수용기준 체크리스트

**실행:**
```
/trdash-deep-insight
```

---

#### 2. `trdash-p0-security-env`
**목적:** env/secret 파일 보안 위생 처리 (P0)

**사용 시나리오:**
- .env 파일 git 추적 탐지
- Vercel env 운영 표준화
- 키 로테이션 체크리스트

**주요 파일:**
- `.cursor/skills/trdash-p0-security-env/SKILL.md`
- `scripts/find-tracked-env.sh` - 추적 파일 탐지
- `scripts/untrack-env-dryrun.sh` - 안전 제거 명령 생성
- `references/checklist.md` - 보안 체크리스트

**실행:**
```
/trdash-p0-security-env
```

---

#### 3. `trdash-append-only-audit`
**목적:** History/Evidence를 append-only 서버 로그로 승격

**사용 시나리오:**
- localStorage 한계 극복
- 다인 운영/감사 대응
- 불변 이벤트 로그 구축

**주요 파일:**
- `.cursor/skills/trdash-append-only-audit/SKILL.md`
- `references/schema.md` - audit_event 스키마
- `references/migration.md` - 마이그레이션 플랜

**실행:**
```
/trdash-append-only-audit
```

---

### Subagents (3개)

#### 1. `verifier`
**역할:** 완료된 작업 검증 (구현/테스트/수용기준)

**특징:**
- readonly mode
- fast model
- ✅/❌/⚠️ 체크리스트 보고

**호출:**
```
/verifier
```

---

#### 2. `ux-auditor`
**역할:** Deep Insight 기준 UX 감사

**체크 항목:**
- DECIDE 요소 1st viewport 배치
- Go/No-Go 근거 명확성
- UTC/Local 혼선
- Apply 안전장치
- Empty state 품질

**호출:**
```
/ux-auditor
```

---

#### 3. `security-auditor`
**역할:** env/secret/배포 설정 보안 감사

**체크 항목:**
- git 추적 env 파일
- 하드코딩 키/토큰
- .gitignore 패턴
- 재발 방지 체계

**호출:**
```
/security-auditor
```

---

## 🎯 권장 워크플로우

### Phase 1: 보안 체크 (P0)
1. `/trdash-p0-security-env` 실행
2. `/security-auditor`로 감사
3. 발견된 위험 즉시 수정

### Phase 2: UX 개선 (P0/P1)
1. `/trdash-deep-insight` 실행
2. P0 백로그 생성 (PR 1~3개)
3. 구현 후 `/verifier` 검증
4. `/ux-auditor`로 최종 감사

### Phase 3: 감사 체계 강화 (P1)
1. `/trdash-append-only-audit` 실행
2. append-only 로그 설계
3. localStorage → 서버 마이그레이션
4. `/verifier`로 검증

---

## 📋 체크리스트

### 설치 확인
- [x] 3개 스킬 생성 완료
- [x] 3개 서브에이전트 생성 완료
- [x] 참조 문서 생성 완료
- [x] 유틸리티 스크립트 생성 완료

### 다음 단계
- [ ] Cursor 재시작 (스킬 인식)
- [ ] `/` 입력 후 스킬 목록 확인
- [ ] 첫 실행: `/trdash-p0-security-env`
- [ ] 보안 이슈 해결
- [ ] `/trdash-deep-insight`로 UX 개선 시작

---

## 📚 기술 근거

이 패키지는 다음 리포트를 기반으로 설계됨:

1. **Deep Insight Report (v1)**
   - UTC/Local 혼선 제거 (P0)
   - Decision Card 구조 (P0)
   - Apply 안전장치 (P0)
   - Empty state 개선 (P0)

2. **Exec 백로그 (2026-02-04)**
   - `.env.vercel.production` 추적 제거 (P0)
   - Vercel env 운영 표준화
   - append-only 로그 승격

3. **개선 리포트 (2026-02-04)**
   - DECIDE→EXECUTE→AUDIT 구조
   - ViewMode 재해석 (작업 모드)
   - 감사 체계 강화

---

## 🔗 관련 파일

- `AGENTS.md` - 프로젝트 전체 규칙
- `patch.md` - UI/UX 스펙
- `option_c.json` - SSOT 데이터
- `docs/LAYOUT.md` - 레이아웃 가이드

---

**설치 완료 - 즉시 사용 가능**
