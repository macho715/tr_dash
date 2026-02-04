# Vercel 배포 설정

**최종 검토/업데이트**: 2026-02-04

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

**최신 반영**: SyncInitialDate(P1-1), GanttLegendDrawer(P1-4), MapLegend — 배포 영향 없음 (클라이언트 컴포넌트)

**프로덕션 URL**: https://trdash.vercel.app

**GitHub 저장소**: https://github.com/macho715/tr_dash.git

Next.js 앱이 **루트**에 있습니다. Root Directory를 **반드시 비워야** 합니다.

## ✅ 추천 워크플로우: GitHub 자동 배포 (간편)

**Vercel이 이미 GitHub와 연결되어 있습니다.** 앞으로는 이렇게만 하면 됩니다:

```bash
# 1. 로컬에서 변경사항 확인
pnpm dev  # localhost:3000에서 테스트 (다른 포트: pnpm dev -- -p 3001 또는 PORT=3001 pnpm dev)

# 2. 빌드·테스트 (권장)
pnpm test:run
pnpm build

# 3. Git commit & push
git add .
git commit -m "feat: your changes"
git push origin main

# 끝! Vercel이 자동으로 배포합니다 (약 30초~1분 소요)
```

**배포 확인:**
- Vercel 대시보드: https://vercel.com/chas-projects-08028e73/tr_dash
- 또는 `vercel ls` 명령어로 최근 배포 목록 확인

**단일 규칙:** main 브랜치 = production 배포. 다른 브랜치 push는 Preview 배포로만 사용.

**장점:**
- ✅ 간단: push만 하면 자동 배포
- ✅ 이력 관리: Git에 모든 변경사항 기록
- ✅ 일관성: GitHub main = Vercel production

## 대안: CLI 직접 배포 (긴급 상황용)

**긴급하게 즉시 배포가 필요한 경우:**

```bash
# Git push 없이 로컬 버전을 직접 배포
vercel --prod --force --yes
```

**주의:** 이 방법은 Git history와 어긋날 수 있으므로, 평소에는 **Git push 워크플로우**를 사용하세요.

## 로컬 개발 vs 프로덕션 차이 이해

**중요:** `pnpm dev`와 프로덕션 빌드는 다릅니다!

| 구분 | `pnpm dev` (개발 모드) | Vercel (프로덕션 빌드) |
|------|----------------------|---------------------|
| 최적화 | ❌ 없음 (빠른 개발) | ✅ 완전 최적화 |
| HTML 크기 | 작음 (기본) | 큼 (pre-render) |
| 스크립트 | 최소 | 최적화된 chunks |
| 캐싱 | 없음 | CDN 캐싱 |

**로컬과 동일한 프로덕션 빌드를 보려면:**
```bash
pnpm build
pnpm start  # localhost:3000에서 프로덕션 빌드 확인
```

**참고:** 프로덕션 빌드에는 Gantt(vis-timeline, `VisTimelineGantt`) 및 전체 대시보드 UI가 포함됩니다.

### Gantt 엔진 (vis-timeline)

vis-timeline Gantt(VisTimelineGantt)를 사용하려면 `NEXT_PUBLIC_GANTT_ENGINE=vis` 환경 변수가 **필수**입니다.

| 설정 위치 | 내용 |
|-----------|------|
| **로컬** | `.env.local`에 `NEXT_PUBLIC_GANTT_ENGINE=vis` 추가 |
| **Vercel** | Settings → Environment Variables에서 `NEXT_PUBLIC_GANTT_ENGINE` = `vis` 추가 |

**Vercel 설정 절차:**
1. [vercel.com/dashboard](https://vercel.com/dashboard) → **tr_dash** 프로젝트 선택
2. **Settings** → **Environment Variables**
3. **Name**: `NEXT_PUBLIC_GANTT_ENGINE`, **Value**: `vis`
4. **환경**: Production, Preview, Development 모두 체크
5. **Save** → 기존 배포가 있으면 **Redeploy** 실행

미설정 시 프로덕션은 커스텀 CSS/SVG Gantt를 사용합니다.

**다른 PC/클론에서 배포할 때:** `.vercel`은 저장소에 없으므로, 새 환경에서는 `npx vercel link` 실행 후 **tr_dash** 프로젝트를 선택해야 같은 프로덕션(trdash.vercel.app)에 배포됩니다.

## 브라우저 캐시 클리어 방법

**배포 후 변경사항이 안 보이는 경우:**

```bash
# 1. 강력한 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 2. 시크릿 모드로 확인
Ctrl + Shift + N (Chrome)

# 3. 개발자 도구에서 완전 클리어
F12 → Application → Clear storage → Clear site data
```

## 문제 해결 (Troubleshooting)

### "다른 버전이 올라간다"는 경우

**원인 1: 브라우저 캐시**
- 해결: 위의 "브라우저 캐시 클리어" 방법 사용
- 또는 시크릿 모드로 확인

**원인 2: CDN 캐싱**
- Vercel CDN이 이전 버전을 캐시 중
- 해결: 배포 후 1~2분 대기 후 다시 확인

**원인 3: 개발 모드 vs 프로덕션 빌드**
- `pnpm dev`는 최적화 없는 개발 빌드
- Vercel은 `pnpm build`로 최적화된 프로덕션 빌드
- 해결: 로컬에서도 `pnpm build && pnpm start`로 프로덕션 빌드 확인

### "vis Gantt가 Vercel에서 표시되지 않는 경우" (Gantt: custom으로 나옴)

**원인**: `NEXT_PUBLIC_GANTT_ENGINE`이 빌드 시점에 적용되지 않거나, 값에 공백·대소문자 차이가 있는 경우

**해결 (2026-02-04 적용)**:
- `gantt-chart.tsx`에서 `trim().toLowerCase()` 유연 비교 적용 — `vis`, `VIS`, ` vis ` 등 모두 인식
- **추가 조치**:
  1. Vercel Environment Variables에서 `NEXT_PUBLIC_GANTT_ENGINE` 삭제 후 재추가 (Value: `vis` 직접 입력)
  2. Redeploy 시 **"Use existing Build Cache"** 체크 해제
  3. Redeploy 실행

### 진단 체크리스트

```bash
# 1. Git 상태 확인
git status
git log origin/main..HEAD --oneline

# 2. 최근 배포 확인
vercel ls | Select-Object -First 5

# 3. 테스트 실행 후 로컬 프로덕션 빌드 테스트
pnpm test:run
pnpm build
pnpm start  # localhost:3000에서 확인

# 4. GitHub과 Vercel 동기화 확인
git fetch origin
git log --oneline -3
vercel ls | Select-Object -First 1
```

## 이 버전을 Vercel에 올리는 방법

### 방법 1: 스크립트로 배포 (토큰 한 번 설정)

1. [Vercel 토큰 발급](https://vercel.com/account/tokens) → **Create** → 토큰 복사
2. 프로젝트 루트에 `.env.vercel` 파일 생성, 한 줄만 넣기:
   ```bash
   VERCEL_TOKEN=여기에_토큰_붙여넣기
   ```
3. 배포 실행:
   ```powershell
   .\scripts\deploy-vercel.ps1
   ```
   스크립트는 로컬에 uncommitted 변경이 있거나 origin/main보다 앞선 커밋이 있으면 기본적으로 중단합니다. main과 맞춘 뒤 배포하려는 것이 원칙입니다. 긴급 시에만 `.\scripts\deploy-vercel.ps1 -Force`로 검사 없이 배포할 수 있습니다.
   또는 (검사 없이 직접):
   ```bash
   npx vercel login   # 브라우저에서 로그인 (한 번만)
   npx vercel --prod --yes
   ```

### 방법 2: GitHub 연동 (대시보드)

1. [vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → `macho715/tr_dash` 선택
3. **Root Directory** 비움, **Production Branch** `main` 확인
4. **Deploy** 클릭 → 이후 `main`에 push할 때마다 자동 배포됩니다.
(flatten 이후 `tr_dash` 등 이전 루트 경로가 남아 있으면 삭제하고, Root Directory를 비우면 빌드 성공합니다.)

## 필수 설정

1. [vercel.com/dashboard](https://vercel.com/dashboard) → 프로젝트 선택
2. **Settings** → **Build and Deployment**
3. **Root Directory** → **비움** (빈 값 또는 `.` — 앱이 루트에 있음)
4. **Save** 클릭
5. **Settings** → **Repository** (또는 Build and Deployment)에서 **Production Branch**가 `main`인지 확인
6. **Deployments** 탭 → 최신 배포 후 **Redeploy** 실행

| 항목 | 설정 |
|------|------|
| Settings → Repository | (새 저장소 연결 후 설정) |
| Production Branch | `main` |
| Settings → Build and Deployment → Root Directory | **비움** (앱이 루트에 있음) |
| Settings → Environment Variables | `NEXT_PUBLIC_GANTT_ENGINE=vis` (vis Gantt 사용 시) |
| Deployments | 최신 배포 후 **Redeploy** 실행 |

## Phase 5 (patchm1~m5) 호환

- **localStorage**: History/Evidence는 클라이언트 저장 — 서버 파일 쓰기 불필요
- **option_c.json**: `/api/ssot` route로 읽기 전용 제공
- **빌드**: `pnpm build` 통과 필수
- **patchmain #14**: CI에서 `pnpm lint && pnpm test:run && pnpm build` 권장 (Vitest 파이프라인 반영). 로컬 개발 시 포트 변경은 `pnpm dev -- -p 3001` 또는 `PORT=3001 pnpm dev` 참고.
