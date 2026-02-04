# TR Dashboard Korean to English Patch Plan

**작성일**: 2026-02-04  
**목표**: 대시보드에 나오는 모든 한글 텍스트를 영어로 변환  
**방식**: 하드코딩 직접 교체 (i18n 시스템 도입 없음)

---

## 0) Executive Summary

| 항목 | 내용 |
|------|------|
| **영향 컴포넌트** | 23개 파일 (components/) + 8개 파일 (lib/) |
| **데이터 파일** | option_c.json, 테스트 fixtures |
| **작업 방식** | Task별 개별 커밋, 단계별 검증 |
| **롤백 전략** | Git 커밋 단위 롤백 |
| **예상 시간** | 5 Tasks × 30-45분 = 2.5-4시간 |

---

## 1) 번역 용어집 (Terminology Standards)

### 1.1 핵심 도메인 용어

| 한글 | 영어 | 사용 위치 |
|------|------|----------|
| 라이브 | Live | View Mode |
| 히스토리 | History | View Mode |
| 승인 | Approval | View Mode |
| 비교 | Compare | View Mode |
| 없음 | None | Risk Overlay |
| 전체 | All | Risk Overlay |
| 기상 | Weather | Risk Overlay |
| 자원 | Resource | Risk Overlay |
| 허가 | Permit | Risk Overlay |
| 도움말 | Help | UI Button |
| 가이드 | Guide | Tooltip |
| 접기 | Collapse | Button |
| 펼치기 | Expand | Button |
| 지도 | Map | UI Section |
| 선택 | Select | Action |
| 이동 | Movement | Domain |
| 액티비티 | Activity | Domain |
| 충돌 | Collision | Domain |
| 계획 | Plan | State |
| 실제 | Actual | State |
| 증빙 | Evidence | Domain |
| 리플로우 | Reflow | Action |
| 미리보기 | Preview | UI |
| 적용 | Apply | Action |
| 취소 | Cancel | Action |
| 확인 | Confirm | Action |
| 저장 | Save | Action |
| 삭제 | Delete | Action |
| 수정 | Edit | Action |
| 추가 | Add | Action |
| 검색 | Search | Action |
| 필터 | Filter | Action |
| 정렬 | Sort | Action |
| 새로고침 | Refresh | Action |
| 다운로드 | Download | Action |
| 업로드 | Upload | Action |
| 내보내기 | Export | Action |
| 가져오기 | Import | Action |

### 1.2 상태/Status 용어

| 한글 | 영어 |
|------|------|
| 대기 | Pending |
| 진행중 | In Progress |
| 완료 | Completed |
| 취소됨 | Cancelled |
| 차단됨 | Blocked |
| 일시정지 | Paused |
| 준비 | Ready |
| 검증됨 | Verified |

### 1.3 UI 섹션 이름

| 한글 | 영어 |
|------|------|
| 전체 개요 | Overview |
| 상세 정보 | Details |
| 이력 | History |
| 증빙 자료 | Evidence |
| 충돌 목록 | Collisions |
| 리스크 | Risks |
| 일정 | Schedule |
| 간트 차트 | Gantt Chart |
| 타임라인 | Timeline |
| 컨트롤 | Controls |

---

## 2) 한글 사용 현황 분석

### 2.1 Components (23 files)

#### 우선순위 HIGH (사용자 직접 노출)

| 파일 | 한글 사용처 | 예시 |
|------|-----------|------|
| `GlobalControlBar.tsx` | View Mode, Risk Overlay 라벨 | "라이브", "히스토리", "기상" |
| `StoryHeader.tsx` | 도움말 버튼, 안내 문구 | "도움말", "좌측 지도에서 TR 선택" |
| `gantt-chart.tsx` | 범례, 컨트롤 | - |
| `WhyPanel.tsx` | 패널 제목, 버튼 | - |
| `ReflowPreviewPanel.tsx` | 미리보기 UI | "미리보기", "적용" |
| `GanttLegendDrawer.tsx` | 범례 설명 | - |
| `timeline-controls.tsx` | 컨트롤 라벨 | - |
| `schedule-table.tsx` | 테이블 헤더 | - |
| `kpi-cards.tsx` | KPI 라벨 | - |
| `alerts.tsx` | 알림 메시지 | - |
| `weather-block.tsx` | 기상 정보 | - |
| `go-nogo-badge.tsx` | Go/No-Go 라벨 | - |
| `operation-overview.tsx` | 운영 개요 | - |

#### 우선순위 MED (Ops/AGI 관련)

| 파일 | 한글 사용처 |
|------|-----------|
| `OpsCommandBar.tsx` | 명령어 UI |
| `AgiOpsDock.tsx` | AGI 도킹 |
| `AgiCommandBar.tsx` | AGI 명령 |
| `AgiPreviewDrawer.tsx` | AGI 미리보기 |
| `AgiDiffTable.tsx` | Diff 테이블 |
| `AgiConflictsPanel.tsx` | 충돌 패널 |
| `agi-schedule-updater-bar.tsx` | 스케줄 업데이트 |

#### 우선순위 MED (Gantt/Resource)

| 파일 | 한글 사용처 |
|------|-----------|
| `VisTimelineGantt.tsx` | 주석, 툴팁 |
| `ResourceConflictsPanel.tsx` | 리소스 충돌 |

#### 우선순위 LOW (Layout)

| 파일 | 한글 사용처 |
|------|-----------|
| `tr-three-column-layout.tsx` | 레이아웃 라벨 |

### 2.2 Lib (8 files)

| 파일 | 한글 사용처 | 예시 |
|------|-----------|------|
| `gantt-legend-guide.ts` | 범례 가이드 | 타입별 범례 설명 |
| `dashboard-data.ts` | 데이터 타입 정의 | - |
| `ssot/map-status-colors.ts` | 맵 상태 컬러 | - |
| `ssot/history-events.ts` | 히스토리 이벤트 | - |
| `ops/agi/types.ts` | AGI 타입 | - |
| `ops/agi/parseCommand.ts` | 명령 파싱 | - |
| `ops/agi/history.ts` | AGI 히스토리 | - |
| `ops/agi/applyShift.ts` | 시프트 적용 | - |

### 2.3 Data Files

| 파일 | 한글 사용처 |
|------|-----------|
| `data/schedule/option_c.json` | Activity 이름, 설명 |
| `tests/fixtures/option_c_baseline.json` | 테스트 데이터 |
| `tests/fixtures/option_c_minimal.json` | 최소 테스트 데이터 |

---

## 3) Task Breakdown

### Task 1: Core UI Controls (HIGH Priority)

**Target**: 사용자가 가장 먼저 접하는 컨트롤

**Files**:
- `components/control-bar/GlobalControlBar.tsx`
- `components/dashboard/StoryHeader.tsx`

**Changes**:

```typescript
// GlobalControlBar.tsx
const VIEW_MODES: { value: ViewMode; label: string }[] = [
-  { value: 'live', label: '라이브' },
-  { value: 'history', label: '히스토리' },
-  { value: 'approval', label: '승인' },
-  { value: 'compare', label: '비교' },
+  { value: 'live', label: 'Live' },
+  { value: 'history', label: 'History' },
+  { value: 'approval', label: 'Approval' },
+  { value: 'compare', label: 'Compare' },
]

const RISK_OVERLAYS: { value: RiskOverlay; label: string }[] = [
-  { value: 'none', label: '없음' },
-  { value: 'all', label: '전체' },
-  { value: 'wx', label: '기상' },
-  { value: 'resource', label: '자원' },
-  { value: 'permit', label: '허가' },
+  { value: 'none', label: 'None' },
+  { value: 'all', label: 'All' },
+  { value: 'wx', label: 'Weather' },
+  { value: 'resource', label: 'Resource' },
+  { value: 'permit', label: 'Permit' },
]
```

```typescript
// StoryHeader.tsx
-            aria-label={helpOpen ? "도움말 접기" : "도움말 펼치기"}
-            title={helpOpen ? "가이드 접기" : "가이드 펼치기"}
+            aria-label={helpOpen ? "Collapse Help" : "Expand Help"}
+            title={helpOpen ? "Collapse Guide" : "Expand Guide"}

-            도움말
+            Help

-              <p className="text-sm font-medium text-foreground">좌측 지도에서 TR 선택</p>
+              <p className="text-sm font-medium text-foreground">Select TR from Map</p>

-              <p className="text-sm font-medium text-foreground">중앙 타임라인에서 일정 확인</p>
+              <p className="text-sm font-medium text-foreground">Check schedule in Timeline</p>

-              <p className="text-sm font-medium text-foreground">우측 패널에서 증빙 확인</p>
+              <p className="text-sm font-medium text-foreground">Verify evidence in Detail</p>
```

**Verification**:
```bash
pnpm typecheck
pnpm lint
pnpm build
```

**Commit**:
```bash
git add components/control-bar/GlobalControlBar.tsx components/dashboard/StoryHeader.tsx
git commit -m "i18n(ko→en): GlobalControlBar + StoryHeader - View modes, Risk overlays, Help guide"
```

---

### Task 2: Gantt & Timeline UI (HIGH Priority)

**Target**: Gantt 차트, 타임라인 관련 UI 텍스트

**Files**:
- `components/dashboard/gantt-chart.tsx`
- `components/dashboard/timeline-controls.tsx`
- `components/gantt/VisTimelineGantt.tsx`
- `components/dashboard/GanttLegendDrawer.tsx`
- `lib/gantt-legend-guide.ts`

**Changes Pattern**:
- 범례 라벨: "이동" → "Movement", "로드아웃" → "Loadout"
- 컨트롤: "일간" → "Daily", "주간" → "Weekly"
- 툴팁: "드래그하여 이동" → "Drag to move"

**Verification**:
```bash
grep -r "일간\|주간\|이동\|로드아웃" components/dashboard/gantt* components/gantt/ lib/gantt*
pnpm typecheck
pnpm build
```

**Commit**:
```bash
git commit -m "i18n(ko→en): Gantt chart, Timeline controls, Legend guide"
```

---

### Task 3: Detail Panels & Modals (MED Priority)

**Target**: Why 패널, Reflow 미리보기, 충돌 패널

**Files**:
- `components/dashboard/WhyPanel.tsx`
- `components/dashboard/ReflowPreviewPanel.tsx`
- `components/gantt/ResourceConflictsPanel.tsx`

**Changes Pattern**:
- 버튼: "미리보기" → "Preview", "적용" → "Apply", "취소" → "Cancel"
- 패널 제목: "충돌 원인" → "Collision Root Cause"
- 상태: "대기중" → "Pending", "진행중" → "In Progress"

**Verification**:
```bash
grep -r "미리보기\|적용\|취소\|충돌\|원인" components/dashboard/Why* components/dashboard/Reflow* components/gantt/Resource*
pnpm typecheck
pnpm build
```

**Commit**:
```bash
git commit -m "i18n(ko→en): WhyPanel, ReflowPreviewPanel, ResourceConflictsPanel"
```

---

### Task 4: Schedule & KPI Components (MED Priority)

**Target**: 스케줄 테이블, KPI 카드, 알림, 운영 개요

**Files**:
- `components/dashboard/schedule-table.tsx`
- `components/dashboard/kpi-cards.tsx`
- `components/dashboard/alerts.tsx`
- `components/dashboard/operation-overview.tsx`
- `components/dashboard/weather-block.tsx`
- `components/dashboard/go-nogo-badge.tsx`

**Changes Pattern**:
- 테이블 헤더: "액티비티" → "Activity", "시작일" → "Start", "종료일" → "End"
- KPI 라벨: "총 일수" → "Total Days", "진행률" → "Progress"
- 기상: "양호" → "Good", "주의" → "Caution", "위험" → "Danger"

**Verification**:
```bash
grep -r "액티비티\|시작일\|종료일\|진행률\|양호\|주의\|위험" components/dashboard/schedule* components/dashboard/kpi* components/dashboard/alerts* components/dashboard/operation* components/dashboard/weather* components/dashboard/go-nogo*
pnpm typecheck
pnpm build
```

**Commit**:
```bash
git commit -m "i18n(ko→en): Schedule table, KPI cards, Alerts, Operation overview, Weather"
```

---

### Task 5: AGI/Ops Components & Data (LOW Priority)

**Target**: AGI 운영 도구, 데이터 파일

**Files**:
- `components/ops/OpsCommandBar.tsx`
- `components/ops/AgiOpsDock.tsx`
- `components/ops/AgiCommandBar.tsx`
- `components/ops/AgiPreviewDrawer.tsx`
- `components/ops/AgiDiffTable.tsx`
- `components/ops/AgiConflictsPanel.tsx`
- `components/dashboard/agi-schedule-updater-bar.tsx`
- `lib/ops/agi/*.ts`
- `data/schedule/option_c.json` (Activity names only)

**Changes Pattern**:
- 명령: "시프트" → "Shift", "업데이트" → "Update"
- Activity 이름: 한글 → 영어 (MOBILIZATION, LOADOUT, TRANSPORT 등은 이미 영어)

**Verification**:
```bash
grep -r "[가-힣]" components/ops/ lib/ops/agi/
pnpm typecheck
scripts/validate_optionc.py  # SSOT validation
pnpm build
```

**Commit**:
```bash
git commit -m "i18n(ko→en): AGI/Ops components, option_c activity names"
```

---

### Task 6: Lib Utilities & Types (Cleanup)

**Target**: Lib 내 한글 주석, 타입 정의

**Files**:
- `lib/dashboard-data.ts`
- `lib/ssot/map-status-colors.ts`
- `lib/ssot/history-events.ts`

**Note**: 주석은 코드 이해에 필요하면 유지, UI 노출 텍스트만 변환

**Verification**:
```bash
pnpm typecheck
pnpm lint
```

**Commit**:
```bash
git commit -m "i18n(ko→en): Lib utilities - UI-exposed strings only"
```

---

## 4) 검증 계획

### 4.1 각 Task 후 실행

```bash
# 1. TypeScript 컴파일
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Build
pnpm build

# 4. (Task 5만) SSOT 검증
scripts/validate_optionc.py
```

### 4.2 전체 완료 후 E2E 확인

1. **로컬 서버 실행**:
   ```bash
   pnpm dev
   ```

2. **수동 UI 체크**:
   - GlobalControlBar: View Mode, Risk Overlay 드롭다운
   - StoryHeader: Help 버튼, 가이드 문구
   - Gantt Chart: 범례, 컨트롤, 툴팁
   - Detail Panel: Why 패널, Reflow 미리보기
   - Schedule Table: 헤더, 데이터
   - KPI Cards: 라벨, 숫자
   - Alerts: 알림 메시지

3. **한글 잔존 체크**:
   ```bash
   # Components
   grep -r "[가-힣]" components/ --include="*.tsx" --include="*.ts"

   # Lib (주석 제외)
   grep -r "[가-힣]" lib/ --include="*.tsx" --include="*.ts" | grep -v "//"

   # Data
   grep -r "[가-힣]" data/schedule/option_c.json
   ```

4. **기능 동작 확인**:
   - Gantt 드래그/줌
   - Map 선택 → Detail 동기화
   - Reflow Preview → Apply
   - Compare Mode 활성화

---

## 5) 롤백 계획

### 5.1 Task별 롤백

```bash
# 최근 커밋만 롤백
git log --oneline -6  # 최근 6개 확인
git reset --soft HEAD~1  # 직전 커밋만 취소 (변경사항 유지)
# 또는
git reset --hard HEAD~1  # 직전 커밋 완전 취소
```

### 5.2 전체 롤백

```bash
# Task 1 시작 전 커밋으로 복귀
git log --oneline --grep="i18n" -n 1  # 첫 i18n 커밋 확인
git reset --hard <commit-before-task1>
```

### 5.3 부분 수정

```bash
# 특정 파일만 이전 버전으로
git checkout HEAD~1 -- components/control-bar/GlobalControlBar.tsx
git commit -m "revert: GlobalControlBar i18n partial rollback"
```

---

## 6) 실행 순서 (tr-implementer용)

```bash
# 0. 현재 상태 확인
git status
git log --oneline -3

# 1. Task 1 실행
# - GlobalControlBar.tsx 수정
# - StoryHeader.tsx 수정
# - typecheck → lint → build
# - commit

# 2. Task 2 실행
# - Gantt 관련 파일들 수정
# - typecheck → build
# - commit

# 3. Task 3 실행
# - Panel 컴포넌트들 수정
# - typecheck → build
# - commit

# 4. Task 4 실행
# - Schedule/KPI 컴포넌트들 수정
# - typecheck → build
# - commit

# 5. Task 5 실행
# - Ops/AGI 컴포넌트 + option_c.json 수정
# - typecheck → validate_optionc.py → build
# - commit

# 6. Task 6 실행
# - Lib 유틸리티 정리
# - typecheck → lint
# - commit

# 7. 전체 검증
# - pnpm dev
# - 수동 UI 체크
# - 한글 잔존 grep
# - 기능 동작 확인

# 8. 배포 (선택)
# git push origin main
# vercel --prod
```

---

## 7) 참고사항

### 7.1 변경 제외 항목

- **코드 주석**: 한글 주석은 유지 (팀 이해도 우선)
- **테스트 설명**: `describe()`, `it()` 내 한글 유지 가능
- **개발 문서**: `docs/`, `README.md` 등은 이번 작업 범위 외
- **Git 커밋 메시지**: 한글 유지 (팀 컨벤션 따름)

### 7.2 주의사항

- **SSOT 스키마 불변**: `option_c.json`의 구조는 변경 금지, 데이터 값만 변경
- **aria-label**: 접근성을 위해 영어로 변경 필수
- **title/tooltip**: 사용자 노출 텍스트이므로 영어로 변경
- **enum/const**: TypeScript enum 값은 변경 시 전체 영향 검토 필요

### 7.3 도구

```bash
# 한글 검색
grep -r "[가-힣]" <directory> --include="*.tsx" --include="*.ts"

# 특정 한글 단어 검색
grep -r "라이브\|히스토리" components/

# 파일별 한글 카운트
find components -name "*.tsx" -exec grep -c "[가-힣]" {} \; -print | paste - -
```

---

## 8) 완료 기준 (DoD)

- [ ] Task 1-6 모두 완료 및 개별 커밋
- [ ] `pnpm typecheck` PASS
- [ ] `pnpm lint` PASS (warning 0)
- [ ] `pnpm build` SUCCESS
- [ ] `scripts/validate_optionc.py` PASS (Task 5)
- [ ] `grep -r "[가-힣]" components/ lib/` → UI 노출 한글 0건
- [ ] 로컬 `pnpm dev` 실행 후 모든 화면 수동 확인
- [ ] Gantt/Map/Detail 상호작용 정상 작동
- [ ] Git 커밋 이력 정리 (6개 커밋)

---

## Refs

- `AGENTS.md`: SSOT 원칙
- `patch.md`: UI/UX 계약
- `docs/LAYOUT.md`: 레이아웃 구조
