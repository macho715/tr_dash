아래는 `tr_dash`를 “대시보드 관점(운영자 UX + 배포 신뢰성 + 성능)”에서 바로 체감되게 개선하는 **우선순위 기반 개선안(P0→P2)** 입니다. (현재 프로덕션 URL 기준 관찰 + 레포 구조/문서 기준)

---

## 현재 상태 진단

1. **프로덕션 UI가 설계/문서와 불일치**

   * 프로덕션(`trdash.vercel.app`)에는 아직 `WHERE / WHEN/WHAT / EVIDENCE` 가이드 문구가 노출되어 있습니다. ([TR Dashboard][1])
   * 반면 README의 Bugfix #4에는 “WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거(Phase 6)”가 명시되어 있어, **배포 버전 mismatch 또는 배포가 최신 커밋을 반영하지 못한 상태**로 보입니다. ([GitHub][2])
   * 또한 기본 선택일이 `Jan 26, 2026`인데, 일정 창이 `Jan 27`부터 시작해서 “Selected date is outside all voyage windows”가 기본 상태로 뜹니다. 이건 첫 화면 인상/가독성에 손해입니다. ([TR Dashboard][1])

2. **레포에 `.env.vercel.production`이 추적됨(보안/운영 리스크)**

   * 공개 레포 파일 목록에 `.env.vercel.production`이 존재합니다. ([GitHub][2])
   * Vercel 문서상 `VERCEL_OIDC_TOKEN` 같은 시스템 환경변수는 **빌드 타임에 주입**되며 로컬에서 `vercel env pull`로 내려받을 수 있습니다. 이런 값이 `.env.*`에 들어가 커밋되면 “노출로 간주”하고 회수/재발급이 필요합니다. ([Vercel][3])

3. **테스트 1개 실패가 문서에 남아 있음**

   * README에 테스트가 167개인데 1개가 import path 문제로 실패한다고 적혀 있습니다. “대시보드 개선” 관점에서 **신뢰성(Regression 방지)**을 위해 먼저 정리하는 게 좋습니다. ([GitHub][2])

---

## P0. 즉시 조치(배포 신뢰성 + 보안)

### 1) `.env.vercel.production` 제거 + 토큰/시크릿 “노출로 간주” 대응

**목표:** 레포에서 민감 파일 제거, 향후 재발 방지

* 레포에서 파일 제거(추적 해제)

  * `git rm --cached .env.vercel.production`
  * `.gitignore`에 `.env.vercel.production` 또는 `.env.*` 정책 정리
* Vercel 측 시크릿(토큰/OIDC 등) **회수/재발급(rotate)** 권장

  * `VERCEL_OIDC_TOKEN`은 문서상 빌드 타임 토큰이며 로컬에 내려받을 수 있어, 커밋 시 매우 위험합니다. ([Vercel][3])
* 재발 방지

  * GitHub Secret Scanning / gitleaks(trufflehog) 같은 스캔을 CI에 추가(최소한 PR 단계에서 차단)

> 이 항목은 “대시보드 기능”이 아니라도, 지금 상태에서 가장 큰 리스크입니다. (공개 레포라면 특히)

---

### 2) 프로덕션이 “최신 main”과 동일하게 배포되도록 고정

문서상 배포 mismatch 이슈가 있었고, 해결은 “최신 커밋을 Vercel에 재배포”로 되어 있습니다. ([GitHub][4])
또한 `docs/VERCEL.md`는 **Git push → Vercel 자동 배포**를 권장합니다. ([GitHub][5])

**권장 운영 규칙**

* “main 브랜치 = production” 단일 규칙으로 고정
* 프로덕션 배포 후, 대시보드 화면에서 **버전(커밋 SHA) 확인 가능**해야 함(아래 3번)

최근 커밋 흐름이 빠르게 반영되고 있는 상태(2026-02-03~04에 배포 관련 커밋 다수)라서, 자동 배포 파이프라인을 확실히 잠그는 게 중요합니다. ([GitHub][6])

---

### 3) “빌드 스탬프(버전 표시)”를 UI에 추가

**목표:** “내가 보고 있는 화면이 어떤 커밋인지”를 운영자가 즉시 확인

Vercel 시스템 환경변수에 `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_DEPLOYMENT_ID` 등이 존재합니다. ([Vercel][3])
이를 이용해 화면 한 켠(예: Footer 또는 Header 오른쪽)에 다음을 표시하세요.

* `ENV: production|preview|development`
* `SHA: abcd123` (짧은 SHA)
* `Deployed: (빌드 시간)` 또는 `Deployment ID`

**효과**

* “문서에는 버그가 고쳐졌는데 프로덕션엔 남아있다” 같은 문제를 즉시 판별 가능(현재 상황). ([GitHub][2])

---

## P1. 대시보드 UX 개선(첫 화면 체감이 큰 것부터)

### 1) 첫 화면의 “의미 없는 상태” 제거: 선택일 기본값 개선

현재 기본 선택일이 `Jan 26, 2026`이고, 곧바로 “voyage window 밖” 메시지가 뜹니다. ([TR Dashboard][1])

**개선안**

* 앱 최초 진입 시 선택일을 아래 우선순위로 자동 설정

  1. “오늘(프로젝트 TZ 기준)”이 어떤 Voyage window에 포함되면 → 오늘
  2. 포함되지 않으면 → 가장 가까운(미래/현재) Voyage 시작일(예: Voyage 1의 `Jan 27`)
* 버튼 제공

  * `Jump to Active Voyage`
  * `Today`

**수용 기준**

* 초기 로딩 후 “Selected date is outside all voyage windows…” 문구가 **기본으로 뜨지 않음**.

---

### 2) Phase 6 UI 정합성: WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 정리

프로덕션은 아직 가이드 문구가 남아있고 ([TR Dashboard][1]), README는 제거 완료로 되어 있습니다. ([GitHub][2])
즉, **배포 정합(P0)**이 먼저고, 그 다음은 UI 표기 규칙을 확정해야 합니다.

**개선안(권장)**

* 상단/패널 제목을 `Location / Schedule / Verification`로 통일
* 가이드 텍스트는 완전 삭제 대신:

  * `? Help` 아이콘으로 접기/펼치기(초기값: 접힘)
  * 또는 첫 방문 1회만 툴팁

---

### 3) 용어/언어 혼용 정리

현재 화면에 한/영이 혼재되어 있습니다(예: “Operation Overview”, “Daily pulse”, 한국어 가이드, “AGI Schedule Updater”). ([TR Dashboard][1])

**개선안**

* 운영자 대상이면 **한글 우선 + 괄호 영문**(또는 그 반대)로 고정
* KPI/Alert 영역은 “운영자 액션 중심” 문장으로 정리(한 문장, 120자 이하)

---

### 4) Gantt 가독성: 범례/태그 설명과 “찾기” 강화

Gantt 영역에는 `[W][PTW][CERT]...` 같은 태그가 보이지만, 의미를 즉시 알기 어렵습니다. ([TR Dashboard][1])

**개선안**

* 범례(legend) 클릭 시 Drawer로:

  * 각 태그의 정의
  * “왜 이 태그가 중요함(의사결정 영향)”
* `Ctrl/⌘+K`가 이미 있으니(명령 힌트 노출) ([TR Dashboard][1]),

  * Activity ID(A1000 등)로 점프
  * Stage 필터(Load-out / Sea / Load-in / Turning / Jack-down)
  * “48h Critical” 빠른 필터

---

### 5) 위험(Risk)·Alert 정보의 “시간 정렬”

날씨 업데이트는 `Last Updated: 01 Feb 2026`인데 선택일은 `Jan 26`이라 시간축이 어긋납니다. ([TR Dashboard][1])

**개선안**

* Risk 패널에 “이 업데이트가 적용되는 날짜 범위”를 명시
* 선택일이 범위 밖이면 배지로 경고:

  * `Outdated for selected date`
* 선택일 변경 시 관련 리스크가 자동 하이라이트

---

## P2. 성능/품질 개선(스케일 대비)

### 1) Gantt/Map 성능 최적화(작업량 증가 대비)

현재 일정이 139개 Activity로 보입니다. ([TR Dashboard][1])
지금은 버틸 수 있어도, 기능 추가(Undo/Redo, Compare 고도화)까지 가면 체감이 떨어질 가능성이 큽니다.

**개선안**

* Gantt row virtualization(스크롤 렌더링)
* 무거운 컴포넌트 lazy/dynamic import(맵/간트)
* 리플로우/충돌 계산은 UI thread에서 분리(Web Worker 고려)

---

### 2) “테스트 0 실패”를 게이트로 만들기

README에 1개 실패 테스트가 명시되어 있습니다. ([GitHub][2])
대시보드 개선(특히 일정 엔진/리플로우)은 회귀 위험이 크기 때문에:

* import path 실패부터 0으로 만들고
* PR마다 CI에서 `pnpm test`(또는 vitest) 필수 통과

---

### 3) 설계 원칙 유지(현재 장점은 살려야 함)

README에 이미 “SSOT / compute vs render 분리 / narrow waist / stable artifacts / 추측 금지 / Hard rules(테마 유지)”가 잡혀 있습니다. ([GitHub][2])

**개선 방향**

* UI를 바꾸더라도:

  * 데이터/계산 로직은 `lib/utils`의 순수 함수로 유지
  * 컴포넌트는 렌더링/상태 연결에 집중
* “Deep ocean 테마”와 3-컬럼 레이아웃은 유지(대수술 X) ([GitHub][2])

---

## 추천 PR 묶음(현실적인 순서)

1. **P0-SECURITY: env 파일 정리 + 시크릿 회수**

* `.env.vercel.production` 제거/무시
* 시크릿 rotate
* (선택) gitleaks CI

2. **P0-DEPLOY: 버전 스탬프 추가 + main=prod 고정**

* UI에 `ENV/SHA` 표시(운영자 디버깅)
* Vercel Git 자동배포로 고정(문서 방식대로) ([GitHub][5])

3. **P1-UX: 기본 선택일/가이드 문구/용어 통일**

* 초기 선택일을 voyage window에 맞춤
* WHERE/WHEN/WHAT/EVIDENCE → Location/Schedule/Verification 정리(또는 Help로 축소) ([GitHub][2])

4. **P2: 성능/테스트 게이트**

* virtualization / lazy load
* 실패 테스트 제거 + CI에서 강제 ([GitHub][2])

---

원하면, “프로덕션과 README 불일치(가이드 문구)”를 기준으로 **가장 빨리 체감되는 변경(선택일 기본값 + 빌드 스탬프 + 가이드 문구 숨김)**을 1차 개선 목표로 잡고, 그 다음 Gantt/리플로우 UX(필터/검색/범례)를 확장하는 방식이 가장 효율적입니다.

[1]: https://trdash.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"
[2]: https://github.com/macho715/tr_dash "GitHub - macho715/tr_dash"
[3]: https://vercel.com/docs/environment-variables/system-environment-variables "System environment variables"
[4]: https://github.com/macho715/tr_dash/commit/10d27c6d66033469298e286dbe6716cc4c9c2b40 "fix: sync local production build with Vercel deployment · macho715/tr_dash@10d27c6 · GitHub"
[5]: https://github.com/macho715/tr_dash/commit/52291e5e683352c3fa7dc5d812d77f1effebcad6 "docs: update VERCEL.md with GitHub auto-deploy workflow · macho715/tr_dash@52291e5 · GitHub"
[6]: https://github.com/macho715/tr_dash/commits/main/ "Commits · macho715/tr_dash · GitHub"
