# Release Split — 실행 기록 (2026-02-11)

## 1) 문서 메타

- 문서명: `docs/ops/release-history-20260211.md`
- 작성일: `2026-02-11` (절대 날짜 고정)
- 작성 주체: Codex 작업 기록 정리
- 작성 기준 브랜치: `fix/general-reflow-weather-compat-20260211`
- 작성 기준 HEAD SHA: `69bca1b54f55b668622dd6b4c8bb7861af76ea0f`
- 일반 레포: `https://github.com/macho715/tr_dash.git`
- 모바일 레포: `https://github.com/macho715/tr_dash_mobile.git`
- 일반 배포: `https://trdash.vercel.app`
- 모바일 배포: `https://trdash-mobile.vercel.app`

## 2) 배경 및 목표

### 배경

기존 운영에서는 한 저장소에서 일반/모바일 변경이 혼재될 수 있어, 다음과 같은 배포 사고 리스크가 존재했다.

1. `develop -> main` 직push로 검증되지 않은 변경 배포
2. `release/general` 내용을 모바일 레포에 push(교차 오염)
3. `release/mobile` 내용을 일반 레포에 push(교차 오염)
4. env/secret 파일이 실수로 git 추적되는 보안 사고

### 목표

단일 개발 저장소 유지 조건에서, 일반/모바일 배포 경로를 분리하고 강제 가드레일을 추가해 재현 가능한 운영 체계를 만든다.

## 3) 사전 상태 스냅샷

아래 명령으로 작업 시작 시점을 고정 기록했다.

```powershell
git status --short --branch
git remote -v
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git rev-parse feature/mobile-only-phase1-20260211
git rev-parse mobile-origin/main
```

핵심 결과:

1. 현재 브랜치: `fix/general-reflow-weather-compat-20260211`
2. 현재 HEAD: `69bca1b54f55b668622dd6b4c8bb7861af76ea0f`
3. 원격:
   - `origin https://github.com/macho715/tr_dash.git`
   - `mobile-origin https://github.com/macho715/tr_dash_mobile.git`
4. 모바일 기준 커밋:
   - `feature/mobile-only-phase1-20260211 = fc8c25ba6f5722e23be8febbb8dc715a1ab935e4`
   - `mobile-origin/main = fc8c25ba6f5722e23be8febbb8dc715a1ab935e4`
5. untracked: `backups/` (정책상 커밋 제외)

## 4) 수행 작업 타임라인

### T1. GitHub 모바일 레포 연결 및 푸시

실행:

```powershell
git remote add mobile-origin https://github.com/macho715/tr_dash_mobile.git
git switch feature/mobile-only-phase1-20260211
git push -u mobile-origin feature/mobile-only-phase1-20260211:main
git ls-remote --heads mobile-origin
```

결과:

1. `mobile-origin/main` 생성 완료
2. `refs/heads/main -> fc8c25ba...` 확인

### T2. Vercel 모바일 프로젝트 생성 및 Git 연결

실행:

```powershell
vercel project add trdash-mobile
vercel link --project trdash-mobile --yes
vercel git connect https://github.com/macho715/tr_dash_mobile.git
```

결과:

1. 프로젝트 생성: `trdash-mobile`
2. 프로젝트 ID: `prj_wMQC2UvvgZfwOeoODcdXo7cX586i`
3. Git 연결 상태: `macho715/tr_dash_mobile is already connected`

### T3. 모바일 필수 환경변수 반영

실행:

```powershell
vercel env add NEXT_PUBLIC_GANTT_ENGINE production --force
vercel env add NEXT_PUBLIC_GANTT_ENGINE preview --force
vercel env add NEXT_PUBLIC_GANTT_ENGINE development --force
vercel env ls
```

결과:

1. `NEXT_PUBLIC_GANTT_ENGINE=vis` 3환경 반영 완료
2. 토큰/실값은 문서에 기록하지 않음

### T4. 모바일 production 배포

실행:

```powershell
vercel deploy --prod -y
vercel ls trdash-mobile
vercel inspect trdash-mobile-mvqg22dkc-chas-projects-08028e73.vercel.app
curl -I https://trdash-mobile.vercel.app
```

결과:

1. 배포 URL: `https://trdash-mobile-mvqg22dkc-chas-projects-08028e73.vercel.app`
2. Alias:
   - `https://trdash-mobile.vercel.app`
   - `https://trdash-mobile-chas-projects-08028e73.vercel.app`
3. 상태: `Ready`, `Production`
4. 도메인 응답: `HTTP/1.1 200 OK`

## 5) 코드 변경 요약 (가드레일 커밋)

기준 커밋:

- 커밋 SHA: `69bca1b54f55b668622dd6b4c8bb7861af76ea0f`
- 메시지: `chore(release): add split deployment guardrails for general/mobile`

실행:

```powershell
git show --name-status --oneline 69bca1b5
```

포함 파일(요청 고정 목록):

1. `.husky/pre-push`
2. `scripts/release/common.ps1`
3. `scripts/release/release-general.ps1`
4. `scripts/release/release-mobile.ps1`
5. `scripts/release/pre-push-guard.ps1`
6. `docs/ops/release-split.md`
7. `package.json` (script 3개 추가)

파일별 역할 요약:

1. `scripts/release/common.ps1`
   - 공통 가드 함수 제공
   - `AssertCleanTree`, `AssertNoTrackedSecrets`, `AssertBranchExists`, `AssertRemoteExists`, `AssertCurrentBranch`, `RunQualityGate`, `SyncReleaseBranch`
2. `scripts/release/release-general.ps1`
   - `develop -> release/general -> origin/main` 업로드 자동화
   - `--dry-run`, `--skip-quality-gate` 지원
3. `scripts/release/release-mobile.ps1`
   - `develop -> release/mobile -> mobile-origin/main` 업로드 자동화
   - `--dry-run`, `--skip-quality-gate` 지원
4. `scripts/release/pre-push-guard.ps1`
   - main push 정책 위반 차단
5. `.husky/pre-push`
   - git push 직전 guard 실행 연결
6. `package.json`
   - `release:verify`, `release:general`, `release:mobile` 명령 추가
7. `docs/ops/release-split.md`
   - 운영 절차/롤백 문서화

## 6) 정책/가드레일 명세

### 허용 경로

1. `release/general -> origin/main`
2. `release/mobile -> mobile-origin/main`

### 차단 규칙

1. `develop -> */main` 직접 push 차단
2. `release/general -> mobile-origin/main` 차단
3. `release/mobile -> origin/main` 차단
4. 정의되지 않은 remote의 `*/main` push 차단

### secret-tracking 차단

`AssertNoTrackedSecrets`가 아래 패턴의 git 추적 파일을 차단한다.

1. `.env*`
2. `.env.vercel.*`
3. `env.vercel.*`

예외:

1. `.example`
2. `.sample`
3. `.template`

## 7) 검증 결과

### A. 계획 시점 기준(초기)

원 계획 문맥에서는 `release:verify`에서 아래 2개 실패가 보고되었다.

1. `lib/utils/__tests__/schedule-reflow.test.ts`
2. `lib/weather/__tests__/weather-reflow-chain.test.ts`

### B. 최신 재검증(동일 날짜 재실행)

실행:

```powershell
pnpm release:general -- --dry-run
pnpm release:mobile -- --dry-run
pnpm release:verify
```

결과:

1. `release:general -- --dry-run` 통과
2. `release:mobile -- --dry-run` 통과
3. `release:verify` 통과
4. 테스트 합계: `69 files / 373 tests passed`

보충:

1. `weather-local-parser`는 의도된 stderr 로그가 출력되지만 테스트 실패는 아님

## 8) 운영 절차 (재사용)

### 일상 개발

```powershell
git switch develop
```

### 일반 배포

```powershell
pnpm release:general
```

효과:

1. `release/general` 동기화
2. `origin/main` 업데이트
3. Vercel `trdash` 자동 배포 트리거

### 모바일 배포

```powershell
pnpm release:mobile
```

효과:

1. `release/mobile` 동기화
2. `mobile-origin/main` 업데이트
3. Vercel `trdash-mobile` 자동 배포 트리거

### 비상 롤백

1. 임시 우회: `.husky/pre-push` 비활성 (긴급시에만)
2. 잘못 배포된 레포 `main`을 이전 SHA로 복귀 push
3. Vercel에서 이전 배포 rollback/promote

## 9) 수동 설정 TODO

1. GitHub branch protection (두 레포의 `main`)
   - PR/required checks 강제
   - force push 금지
   - branch deletion 금지
2. Vercel env 동기화 점검
   - `trdash`와 `trdash-mobile` 간 필요한 env 셋 비교
3. 운영 공지
   - 직접 `git push ... main` 금지
   - 릴리즈 명령 2개만 사용

## 10) 부록

### A. 실행 명령 모음

```powershell
# 상태 확인
git status --short --branch
git remote -v
git branch --all --verbose --no-abbrev

# 배포 가드 검증
pnpm release:general -- --dry-run
pnpm release:mobile -- --dry-run
pnpm release:verify

# Vercel 확인
vercel project inspect trdash-mobile
vercel ls trdash-mobile
vercel inspect trdash-mobile-mvqg22dkc-chas-projects-08028e73.vercel.app
```

### B. 관련 파일 참조

1. `docs/ops/release-split.md`
2. `.husky/pre-push`
3. `scripts/release/common.ps1`
4. `scripts/release/release-general.ps1`
5. `scripts/release/release-mobile.ps1`
6. `scripts/release/pre-push-guard.ps1`
7. `package.json`

### C. 관련 커밋 목록

1. `69bca1b54f55b668622dd6b4c8bb7861af76ea0f`
   - split deployment guardrails 추가
2. `1438497fdea5cc77020856f61483e48868070e41`
   - reflow/weather compatibility fix
3. `fc8c25ba6f5722e23be8febbb8dc715a1ab935e4`
   - mobile-only phase1 snapshot
4. `ce5d1c8fb4ba14799e2e6ced2401b60aaa152903`
   - origin/main 기준선

## 11) 핵심 사실값 고정 레코드

1. 모바일 원격: `mobile-origin https://github.com/macho715/tr_dash_mobile.git`
2. 모바일 레포 main head: `fc8c25ba6f5722e23be8febbb8dc715a1ab935e4`
3. 가드레일 커밋: `69bca1b54f55b668622dd6b4c8bb7861af76ea0f`
4. 모바일 Vercel 프로젝트: `trdash-mobile` (`prj_wMQC2UvvgZfwOeoODcdXo7cX586i`)
5. 모바일 production URL: `https://trdash-mobile.vercel.app`
6. 배포 인스펙트 URL: `https://trdash-mobile-mvqg22dkc-chas-projects-08028e73.vercel.app`

