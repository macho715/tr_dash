## tr_dashboard(origin) 대시보드 개선점 제안 (전체 점검 결과)

### 확인 범위

* GitHub `origin` 브랜치의 **레포 구조/README 기준** 기능·아키텍처·운영 규칙을 점검했습니다. ([GitHub][1])
* README에 연결된 Vercel 배포 대시보드(기본 화면)에서 **정보구조/빈 상태/가독성**을 점검했습니다. ([TR Transport Dashboard][2])

> 참고: GitHub 웹 UI에서 일부 파일(예: blob 뷰)이 “로딩 오류” 형태로 뜨는 구간이 있어, 코드 라인 단위 정밀 리뷰는 제한적이었습니다(README·구조·실제 화면 중심).

---

## 강점 (유지 권장)

* **운영형 기능의 폭이 넓음**: KPI/Alerts/Voyages/Schedule/Gantt + 재계산 엔진 + Preview/충돌 검사 + Compare + History/Evidence + MD/JSON Export까지 “실사용” 기능이 많이 들어가 있습니다. ([GitHub][1])
* **SSOT·계산/렌더 분리 원칙이 문서화**되어 있고, 스케줄 데이터 흐름도 명확히 정의되어 있습니다. ([GitHub][1])
* **테스트 기반**: Vitest 160 tests passed로 회귀 방지 기반이 있습니다. ([GitHub][1])

---

# 개선 포인트 (우선순위별)

## P0 — 즉시 수정하면 UX/신뢰도 확 올라가는 부분

### 1) Trip/TR 필터 “초기값” 재설계 (현재 기본 화면이 비어 보임)

* 관찰: 상단에 `Trip Select trip`, `TR Select TR` 상태로 시작하고, **Detailed Voyage Schedule이 “0 of 7 visible”**로 표시됩니다. ([TR Transport Dashboard][2])
* 개선안(둘 중 하나 권장)

  * **A안: 기본값 = All Trips + All TRs** (처음부터 “7 Voyages”가 보이게)
  * **B안: Selected Date 기준 “Active Voyage” 자동 선택** (예: 가장 가까운 Load-out window)
* 추가: “0 of 7”은 디버그성 텍스트로 보일 수 있으니, **의도적 Empty State**(설명 + 버튼)로 교체 권장.

### 2) 날짜/시간/업데이트 표기 일관화 + 타임존 명시 강화

* 관찰: 화면에 `Selected Date:Jan 26, 2026`, `Updated: 2026-02-01`, `Last Updated: 01 Feb 2026`, `18:00 LT` 등 포맷이 섞여 있습니다. ([TR Transport Dashboard][2])
* 개선안

  * 날짜 표기 단일화(예: `2026-01-26 (Day 1)`), **LT/UTC를 항상 함께 표시**
  * “Updated”는 **정확한 timestamp + 데이터 소스(Weather/Manual/Plan)** 분리
  * 데이터별 **갱신주기(weekly 등)**가 있으면 카드 상단에 고정 배치

### 3) WHERE/WHEN/WHAT/EVIDENCE 가이드 노출 정책 통일

* README에는 “가이드 문구 제거”가 Bugfix로 기록되어 있는데, 배포 화면에는 가이드가 노출되어 **문서-화면 불일치**가 생깁니다. ([GitHub][1])
* 개선안

  * “초기 1회 온보딩(토스트/툴팁) → 이후 접기/Help로 이동” 패턴 추천
  * 제거/유지 중 어떤 정책이든 **README/릴리즈 노트와 UI를 일치**시키세요.

### 4) Go/No-Go 카드의 “근거”를 카드 자체에서 완결되게

* 관찰: `Decision: GO` + 코드(WX_WAVE, WX_WIND)는 있으나, 임계치/적용 window/룰셋 버전이 바로 연결되진 않습니다. ([TR Transport Dashboard][2])
* 개선안

  * `GO` 옆에 **Rule set 버전 + threshold(풍속/파고 등) + 적용기간**을 요약 표시
  * “왜 GO?” 클릭 시 관련 데이터/근거(Weather & Marine)로 스크롤 또는 패널 전환

### 5) 보안·공개범위: Public 레포 vs “Private project” 선언은 즉시 정리 필요

* 레포는 Public로 표시되는데, README 라이선스 섹션은 “Private project - Samsung C&T × Mammoet”라고 명시합니다. ([GitHub][1])
* 개선안(우선순위 매우 높음)

  * 실제 비공개 프로젝트면 **레포 Private 전환**이 가장 안전
  * 공개 유지가 목적이면: **민감 데이터/문서/일정/리소스/리스크/스크린샷**을 공개판에서 분리(샘플 데이터로 교체) + 공개 범위 재정의

---

## P1 — 다음 스프린트에서 “사용성” 체감 크게 나는 개선

### 6) Gantt 가독성/탐색성 강화 (139개 활동을 “보는 법” 제공)

* 데이터가 139개 활동이고, Gantt 섹션에 `Schedule 139`가 노출됩니다. ([GitHub][1])
* 개선안

  * Level1/Level2 **접기/펼치기**(기본은 stage 요약)
  * “Next 48h/72h critical” 같은 **프리셋 필터**
  * 활동 ID(A1002 등) **검색/점프**(이미 스크롤 기능 언급이 있어 UX로 끌어올리기 쉬움) ([GitHub][1])
  * 성능 이슈 시 **가상화(virtualization)** 또는 그룹 단위 렌더링

### 7) Alerts → 원인(Why) → 해당 작업바/증빙까지 2-click

* “WhyPanel / Collision UX / suggested_actions / Preview” 구조가 문서에 이미 있습니다. ([GitHub][1])
* 개선안

  * Alert 클릭 → 관련 Activity 하이라이트/스크롤 → DetailPanel에서 blocker/evidence 체크 → “해결 액션 실행”으로 Preview 생성

### 8) Schedule Updater(명령 팔레트) 노출 방식 조정

* 화면 상단에 커맨드 목록이 직접 노출됩니다. ([TR Transport Dashboard][2])
* 개선안

  * 커맨드 목록은 “?” 도움말 또는 Command Palette 내부로 이동
  * **Ops Tools 토글 ON일 때만** 보이게 해서 일반 사용자 부담 감소

### 9) Undo/Redo + Autosave(영속)의 구현 순서 조정

* 로드맵에 Undo/Redo, localStorage 저장이 남아 있습니다. ([GitHub][1])
* 개선안

  * 운영 안정성 관점에서 **Undo/Redo → Autosave → Export/Import(JSON)** 순서 추천
  * localStorage만 쓰면 “PC/브라우저” 단절이 있으니, 최소 Export/Import는 같이 제공(이미 Trip Report Export는 존재). ([GitHub][1])

### 10) History/Evidence의 감사 추적성 강화

* History/Evidence가 append-only + localStorage 중심으로 설명되어 있습니다. ([GitHub][1])
* 개선안

  * 항목마다 `who/when/source` 메타를 강제(사용자·타임스탬프·링크 타입)
  * Evidence 링크 상태(만료/접근불가) 감지 + 아이콘 표기
  * Approval 모드와 연결될 예정이면, 장기적으로는 **서버 저장/권한관리**가 필요

---

## P2 — 품질/운영·개발 생산성 개선

### 11) 브랜치 전략 정리 (`main`/`origin`/`master` 혼재)

* 브랜치 목록에 `main`(default), `origin`, `master`가 동시에 활성 상태입니다. ([GitHub][3])
* 개선안

  * 배포용이면 `release`/`production` 같은 의미 있는 이름으로 정리
  * `master`는 특별한 이유가 없으면 제거/보관 처리(혼선 감소)

### 12) CI를 “품질 게이트”로 강화

* Actions에 CI 워크플로우가 있습니다. ([GitHub][4])
* 개선안

  * PR 필수 체크: `lint + typecheck + unit test + build`
  * (선택) Playwright E2E는 “핵심 여정만”: Trip 선택 → 날짜 변경 → Preview → Apply → Export

### 13) 데이터 계약(Contract) 검증을 CI에 편입

* 데이터 흐름(`option_c.json → mapper → data → rows → gantt`)이 명확합니다. ([GitHub][1])
* 개선안

  * `schemas/`가 있는 만큼, JSON 로드시 **스키마 검증(런타임 + CI)**로 데이터 깨짐 조기 차단 ([GitHub][1])
  * AnchorType→ActivityType 매핑은 회귀 위험이 크므로 SSOT로 승격 + 매핑 테스트 강화 ([GitHub][1])

### 14) “Real-time”의 정의를 UI/문서에 명확히

* README는 “Real-time logistics dashboard”라고 설명하지만, 현재 데이터 로딩 구조상 정적 데이터 기반 단계로 보입니다. ([GitHub][1])
* 개선안

  * 카드마다 **데이터 소스/갱신주기/최종 업데이트**를 표준화해 “실시간”의 의미를 오해 없이 전달

---

# 우선순위 요약 (바로 액션 가능한 것만)

* **P0**: Trip/TR 기본값 + Empty State 개선, 날짜/업데이트 표기 통일, Public/Private 공개범위 정리 ([TR Transport Dashboard][2])
* **P1**: Gantt 접기/검색/프리셋 + Alerts→Activity 드릴다운 + Undo/Redo/Autosave 순서 정리 ([GitHub][1])
* **P2**: 브랜치 정리 + CI 게이트 강화 + 스키마 검증/데이터 계약 강화 ([GitHub][3])


아래는 **repo(`macho715/tr_dashboard`)의 README/배포본/PR #1 변경사항(diff 일부)**를 기준으로 “대시보드 전체” 관점에서 **개선점 + (요청하신) 14개 항목을 ‘수정’ 가능한 형태로 정리**한 것입니다.
확인 근거: README에 정리된 기능/구조(컴포넌트/라이브러리 경로 포함)([GitHub](https://github.com/macho715/tr_dashboard "https://github.com/macho715/tr_dashboard")), 배포 UI에서 노출되는 화면 구성/표시 상태([TR Transport Dashboard](https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site")), PR #1의 동기/변경 파일/일부 diff에서 확인된 결함 패턴([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))

---

## 현재 상태 진단 (요약)

### 강점

* **SSOT 기반 일정/리플로우 엔진 + Preview/Compare/Export**까지 들어간 구조는 좋습니다.([GitHub](https://github.com/macho715/tr_dashboard "https://github.com/macho715/tr_dashboard"))
* UI가 “운영 의사결정” 중심(Go/No-Go, Risk, Evidence/History)으로 설계되어 있어 방향성은 맞습니다.([TR Transport Dashboard](https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"))

### 가장 큰 문제(즉시 수정 필요)

* PR #1 diff 기준으로 **중복 코드/중복 섹션/중복 KPI**가 섞여 들어가면서  **빌드/런타임 오류 가능성이 매우 큼** (특히 `useState` initializer 중복 호출 형태는 그대로면 문법/런타임에 치명적).([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
* “Day Number”가 `toFixed(2)`로 표시되거나(의미 불명), KPI가 중복으로 추가되는 등  **표시/계산 일관성이 깨짐** .([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
* 배포 화면에서도 “Detailed Voyage Schedule(0 of 7 visible)” 같은 **기본 가시성/필터 디폴트 문제**가 보입니다.([TR Transport Dashboard](https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"))

---

## “14개 전체 다 수정” — 수정 항목 14개 (P0~P2 우선순위)

> 아래 14개는 “바로 PR에 반영 가능한 수준”으로 **파일 단위 + 수정 포인트 + 완료 기준(AC)**까지 명시했습니다.
> (특히 #1~#6은 **실제 diff에서 확인된 결함**이라 우선 적용 권장)([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))

---

### 1) `app/page.tsx` — `ops` 초기화 로직 중복 호출 제거 (P0)

 **문제** : `useState(() => createDefaultOpsState(...))` 안에서 **동일 함수가 연속 호출되는 형태**가 diff에 보임. 이는 사실상 문법/동작 모두 위험합니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
 **수정** : initializer는 “단 한 번의 반환값”만 가지도록 정리.

 **패치 예시(의도)** :

```diff
- const [ops, setOps] = useState(() =>
-   createDefaultOpsState({ activities: scheduleActivities, projectEndDate: PROJECT_END_DATE })
-   createDefaultOpsState({
-     activities: scheduleActivities,
-     projectEndDate: PROJECT_END_DATE,
-   })
- )
+ const [ops, setOps] = useState(() =>
+   createDefaultOpsState({
+     activities: scheduleActivities,
+     projectEndDate: PROJECT_END_DATE,
+   })
+ )
```

**AC**

* `pnpm build`가 통과(최소한 TS/JS 파서 에러 없음)
* 초기 로딩에서 Ops 상태가 1회만 생성(불필요 리렌더/중복 초기화 없음)

---

### 2) `app/page.tsx` — 섹션 ID/스크롤스파이/네비 배열 **중복 제거 및 정합성 맞추기** (P0)

 **문제** : 섹션 ID 리스트가 바뀌는 과정에서 기존/신규 섹션이 섞여 **중복/불일치**가 발생한 흔적이 diff에 보입니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* 스크롤스파이용 `ids`와 `sections`(네비 렌더용)이 **완전히 동일한 집합/순서**를 갖게 통일
* `kpi` 같은 중복 엔트리 제거
* `count`는 실제 데이터(예: voyages length, auditEntries length 등)에 연결

**AC**

* 좌측/상단 네비 클릭 시 항상 해당 섹션으로 스크롤
* 스크롤 시 activeSection이 안정적으로 바뀜(깜빡임/튐 없음)

---

### 3) `app/page.tsx` — 레이아웃 트리 정리(중복 컴포넌트 제거, 섹션 배치 일관화) (P0)

 **문제** : diff 스니펫에서 `DashboardHeader`, `OverviewSection` 등이 **중복/비정상 배치**로 섞여 들어간 정황이 있습니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* “Shell → Main Sections” 단일 트리로 정리
* 섹션은 `DashboardShell`의 children으로만 렌더(중복 헤더/중복 섹션 제거)

**AC**

* 화면 상단 헤더가 1회만 렌더
* 섹션 구성(타임라인/보야지/날씨/공지/로그)이 의도대로 1회씩만 노출

---

### 4) `app/page.tsx` — `sections` 카운트/의존성(useMemo deps) 수정 (P0)

 **문제** : `sections`의 `useMemo` deps가 `conflicts.length`만 걸려 있고, `voyages.length`, `auditEntries` 등과 불일치 가능.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* sections에 포함된 카운트가 참조하는 값들을 deps에 반영
* 카운트 의미 재정의(예: logs는 conflictCount가 아니라 auditEntries count)

**AC**

* voyage 수/로그 수가 상태 변경에 맞게 즉시 갱신

---

### 5) `components/dashboard/alerts.tsx` — Day Number 표시 `toFixed(2)` 제거 (P1)

 **문제** : 운영 공지 영역에서 Day Number가 `dayNumber.toFixed(2)`로 출력되도록 바뀐 흔적. “Day”는 정수(day index)가 자연스럽습니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* 표시에서는 정수로(또는 “Day 1”, “Day 2”…)
* 소수점이 필요하다면 “Day Progress” 같이 명시적으로 다른 KPI로 분리

 **패치 예시(의도)** :

```diff
- Selected Date: {formattedDate} (Day {dayNumber.toFixed(2)})
+ Selected Date: {formattedDate} (Day {dayNumber})
```

**AC**

* Day Number가 `1.00`처럼 나오지 않음

---

### 6) `components/dashboard/kpi-cards.tsx` — KPI 배열 중복/Day Number `toFixed(2)` 제거 (P1)

 **문제** : KPI 카드에 Day Number/Selected Date가 **중복으로 추가**되고, Day Number가 소수점으로 출력되는 코드 흔적이 있습니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* `displayKpiData`는 “기본 KPI 4개 + 추가 2개(일자/선택일)”처럼 명확히 구성
* 중복 entry 제거
* Day Number는 정수 표준

 **패치 예시(의도)** :

```diff
- { icon: "calendar", value: dayNumber.toString(), label: "Day Number" },
- { icon: "flag", value: ..., label: "Selected Date" },
- { icon: "calendar", value: dayNumber.toFixed(2), label: "Day Number" },
- { icon: "flag", value: ..., label: "Selected Date" },
+ { icon: "calendar", value: String(dayNumber), label: "Day Number" },
+ { icon: "flag", value: ..., label: "Selected Date" },
```

**AC**

* KPI 카드 총 개수/구성이 고정(중복 없음)
* Day Number 표기 일관

---

### 7) `lib/contexts/date-context` 또는 `lib/ssot/schedule.ts` — Day Number 계산을 “달력 일수 기준”으로 고정 (P1)

 **문제(추정)** : UI에서 `toFixed(2)`를 넣었다는 건, Day Number가 **소수로 떨어지는 계산**이 있었을 가능성이 큽니다(시간 포함 diff로 계산하면 흔함).([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* dayNumber는 `startOfDay` 기준으로 계산(UTC/Local 어느 기준인지 SSOT로 고정)
* 필요하면 `dayProgress`를 별도 KPI로 분리

**AC**

* 동일 날짜 선택 시 Day Number가 항상 동일(시간대/브라우저에 영향 없음)

---

### 8) `components/dashboard/gantt-chart.tsx` — 기간 표시(`toISOString().slice(0,10)`)의 로컬/UTC 혼동 방지 (P1)

 **문제** : `toISOString()`은 UTC 기준이라 사용자가 로컬에서 보면 날짜가 하루 밀리는 케이스가 생길 수 있습니다(표시 목적이면 특히).([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))
**수정**

* 표시 포맷은 “SSOT 날짜 유틸”로 통일(예: `formatDateYYYYMMDD(date, { tz: 'UTC' })` 또는 Local 고정)
* 프로젝트 시작/종료는 동일 timezone 규칙 적용

**AC**

* Gantt range가 환경(브라우저 timezone)에 따라 달라지지 않음

---

### 9) `components/dashboard/schedule-table.tsx` — “0 of 7 visible” 디폴트 상태 개선 (P1)

 **문제** : 배포 화면에서 스케줄 테이블이 “0 of 7 visible”로 보이는 상태가 발생.([TR Transport Dashboard](https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"))
**수정**

* 필터 기본값이 “전체 표시”가 되도록
* 선택된 Trip/TR이 없을 때는 “전체”를 보여주고, 선택이 생기면 좁히는 방식으로 UX 변경
* 비어있는 경우 안내 문구 + Reset 버튼 제공

**AC**

* 최초 진입 시 최소 1행 이상(또는 전체) 표시
* 필터 조작으로 인해 0건이면 명확한 원인/해결 CTA 제공

---

### 10) `components/dashboard/voyage-cards.tsx` — 선택/하이라이트/접힘 상태의 단일 소스화 (P2)

 **문제** : PR 설명에 “expand/collapse, per-date highlighting”이 추가되었다고 되어 있어 상태가 분산될 위험.([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
**수정**

* `selectedVoyageId`, `expandedVoyageIds`를 상위(페이지/컨텍스트)에서 관리하고 하위는 dumb view로
* “선택 날짜 하이라이트”는 `date-highlights.ts` 같은 유틸로 통일

**AC**

* 카드 접힘/선택이 스케줄/타임라인과 항상 동기화

---

### 11) `components/dashboard/sidebar-nav.tsx` — 접근성(키보드/aria) + ScrollSpy 경계값 튜닝 (P2)

 **문제** : 섹션이 늘어날수록 사이드 네비는 “활성 섹션”과 “키보드 포커스”에서 문제가 자주 납니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
**수정**

* `aria-current="page"` / `aria-label` 적용
* 키보드 이동(↑↓ Enter) 지원
* ScrollSpy offset(헤더+SummaryBar 높이) 상수화

**AC**

* 키보드만으로 섹션 이동 가능
* active 표시가 스크롤에 맞게 안정적으로 유지

---

### 12) `components/dashboard/summary-bar.tsx` — sticky/반응형/레이아웃 시프트(LCP) 억제 (P2)

 **문제** : sticky summary는 잘못 만들면 콘텐츠 점프/겹침이 생깁니다(특히 compact/fullscreen).([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
**수정**

* sticky 높이 고정(또는 placeholder로 공간 확보)
* compact/fullscreen 모드에 따라 컬럼 수/줄바꿈 규칙 정의

**AC**

* 스크롤 시 레이아웃 점프 없음
* 모바일/좁은 폭에서도 겹침 없음

---

### 13) `components/dashboard/pipeline-status.tsx` + `lib/utils/pipeline-summary.ts` — “파이프라인 요약”을 순수 함수 + 예외 안전으로 (P2)

 **문제** : PR 설명에 pipeline summary를 붙였다고 하나, 운영 데이터가 없거나 부분적으로만 있을 때 NPE/undefined가 잘 납니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
**수정**

* `pipeline-summary.ts`는 **입력 → 출력**만 하는 순수 함수로 만들고, 입력이 비어도 안전한 결과를 반환
* UI는 “unknown / stale / ok / warn” 같은 상태 머신으로 렌더

**AC**

* ops 데이터가 비어도 화면이 깨지지 않음
* 상태가 애매하면 “unknown”으로 표시(거짓 OK 금지)

---

### 14) `lib/utils/date-highlights.ts` 포함 신규 유틸/컴포넌트 — 단위테스트(Vitest) 최소 세트 추가 + CI에 연결 (P2)

 **문제** : PR에서 “시각적 스모크 테스트만” 수행했다고 되어 있고, JS/TS 테스트 파이프라인이 부족해 보입니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
**수정**

* Vitest로 최소 단위테스트 추가
  * `date-highlights` (경계: DST/UTC/월경계)
  * `pipeline-summary` (입력 null/empty/partial)
* GitHub Actions에서 `pnpm lint && pnpm test && pnpm build` 수행

**AC**

* PR에서 자동으로 테스트/빌드 검증
* 핵심 유틸은 회귀 방지

---

## 적용 순서 (Tidy First 방식으로 “진짜로 14개 다” 처리하는 루트)

### 1) Structural (행위 불변) 커밋 2~3개

* `structural(dashboard): clean page composition & remove duplicates`
* `structural(dashboard): normalize section ids & nav contract`
* `structural(utils): harden pipeline/date utilities signatures`

### 2) Behavioral (행위 변경) 커밋 3~5개

* `behavioral(dashboard): fix day number semantics (integer day index)`
* `behavioral(dashboard): schedule table default visibility (no 0/7 on load)`
* `behavioral(ci): add vitest + actions pipeline`

---

## 검증 체크리스트

* 로컬:
  * `pnpm install`
  * `pnpm dev` (기본 플로우 확인: Timeline → Voyages → Weather → Notice → Logs)
  * `pnpm build` (컴파일/타입에러 0)
* UI 확인:
  * Day Number 정수 표기
  * Schedule table 최초 진입 시 데이터 표시(“0 of 7 visible” 방지)([TR Transport Dashboard](https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"))
* 테스트/CI:
  * `vitest` 최소 2~3개 유틸 테스트
  * Actions에 lint/test/build 연결

---

## 참고로: PR #1 자체는 “아이디어는 좋은데, 정리/검증이 부족한 상태”

PR #1의 의도(요약바/사이드네비/날씨·리스크·파이프라인 시그널 강화)는 운영 관점에서 가치가 있습니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1 "https://github.com/macho715/tr_dashboard/pull/1"))
다만 현재 diff에서 보이는 중복/불일치(특히 `useState` initializer 중복, 섹션 배열 중복, KPI/Day Number 표기 혼선)는 **머지 불가급(P0)**이므로 위 #1~#6을 먼저 바로잡는 게 맞습니다.([GitHub](https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47 "https://github.com/macho715/tr_dashboard/pull/1/files/0f6e2e9bc8e5eb693c247e0a9b654c966819aa47"))

---

원하시는 “14개”가 **제가 위에 정의한 14개(파일/이슈 기반)**가 아니라, 이전에 주고받은 목록(14항목)이 따로 있는 케이스라면:
그 14개 항목 텍스트만 붙여주시면, 동일한 포맷(파일/수정안/AC/테스트)으로 **그 14개를 그대로 ‘치환’해서** 드리겠습니다.
