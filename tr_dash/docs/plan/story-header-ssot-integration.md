---
doc_id: story-header-ssot-integration
status: ✅ 완료
created: 2026-02-04
updated: 2026-02-04
refs: [../AGENTS.md, ../patch.md, LAYOUT.md, WORK_LOG_20260202.md]
---

# StoryHeader SSOT Integration

## 목표

StoryHeader를 SSOT 기반 실시간 업데이트 시스템으로 전환. TR/Activity 선택 시 Location, Schedule, Evidence 정보를 파생 계산으로 자동 갱신.

## 구현 내용

### 1. SSOT 타입 및 유틸리티 Import

**파일**: `app/page.tsx`

```typescript
import type { Activity, ActivityState, OptionC } from "@/src/types/ssot"
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from "@/src/lib/derived-calc"
import { checkEvidenceGate } from "@/src/lib/state-machine/evidence-gate"
```

**역할**:
- `Activity`, `ActivityState`, `OptionC`: SSOT 타입 정의
- `calculateCurrentActivityForTR`: TR의 현재 Activity 계산
- `calculateCurrentLocationForTR`: TR의 현재 Location 계산
- `checkEvidenceGate`: Evidence 누락 체크

### 2. getEvidenceTargetState() 헬퍼

```typescript
function getEvidenceTargetState(state: ActivityState): ActivityState {
  if (state === "in_progress") return "completed"
  if (state === "planned" || state === "ready" || state === "blocked") return "in_progress"
  return state
}
```

**역할**: Activity 상태에 따른 Evidence 검증 대상 상태 계산

**로직**:
- `in_progress` → `completed` (완료 전환 시 필요한 증빙)
- `planned`/`ready`/`blocked` → `in_progress` (시작 전환 시 필요한 증빙)

### 3. selectedTrId State 추가

```typescript
const [selectedTrId, setSelectedTrId] = useState<string | null>(null)
const [ssot, setSsot] = useState<OptionC | null>(null)
```

**역할**: 
- `selectedTrId`: 사용자가 선택한 TR ID (Map/Gantt/Activity 클릭 시)
- `ssot`: SSOT 전체 데이터

### 4. StoryHeader Activity 파생

```typescript
const storyHeaderActivity = useMemo<Activity | null>(() => {
  if (!ssot) return null
  if (selectedActivityId) {
    return ssot.entities.activities[selectedActivityId] ?? null
  }
  if (selectedTrId) {
    const activityId = calculateCurrentActivityForTR(ssot, selectedTrId)
    if (activityId) return ssot.entities.activities[activityId] ?? null
  }
  return null
}, [ssot, selectedActivityId, selectedTrId])

const storyHeaderTrId = useMemo(() => {
  return selectedTrId ?? storyHeaderActivity?.tr_ids?.[0] ?? null
}, [selectedTrId, storyHeaderActivity])
```

**폴백 우선순위**:
1. `selectedActivityId` → Activity 직접 조회
2. `selectedTrId` → TR의 현재 Activity 계산
3. `null`

### 5. StoryHeader Data 파생 계산

```typescript
const storyHeaderData = useMemo(() => {
  if (!ssot || !storyHeaderTrId) {
    return {
      trId: storyHeaderTrId,
      where: undefined,
      whenWhat: undefined,
      evidence: undefined,
    }
  }

  // Where: Current Location
  const locationId = calculateCurrentLocationForTR(ssot, storyHeaderTrId)
  const locationName = locationId
    ? ssot.entities.locations[locationId]?.name ?? locationId
    : null
  const where = locationName ? `Now @ ${locationName}` : "Location —"

  // When/What: Activity Schedule
  const activity = storyHeaderActivity
  const activityTitle = activity?.title ?? activity?.activity_id ?? "—"
  const activityState = activity?.state ?? "—"
  const blockerCode =
    activity?.blocker_code && activity.blocker_code !== "none"
      ? activity.blocker_code
      : "none"
  const whenWhat = activity
    ? `${activityTitle} • ${activityState} • Blocker: ${blockerCode}`
    : "Schedule —"

  // Evidence: Missing Count & Types
  let evidence = "Evidence —"
  if (activity) {
    const targetState = getEvidenceTargetState(activity.state)
    const gateResult = checkEvidenceGate(activity, targetState, activity.state, ssot)
    const missingTypes = Array.from(
      new Set(gateResult.missing.map((missing) => missing.evidence_type))
    )
    const typesLabel = missingTypes.length > 0 ? missingTypes.join(", ") : "—"
    evidence = `Missing: ${gateResult.missing.length} | Types: ${typesLabel}`
  }

  return {
    trId: storyHeaderTrId,
    where,
    whenWhat,
    evidence,
  }
}, [ssot, storyHeaderTrId, storyHeaderActivity])
```

**파생 데이터**:
- **Where**: `Now @ [Location Name]`
- **When/What**: `[Activity Title] • [State] • Blocker: [Code]`
- **Evidence**: `Missing: [Count] | Types: [Type1, Type2, ...]`

### 6. TR 선택 와이어링

#### handleActivityClick

```typescript
const handleActivityClick = (activityId: string, start: string) => {
  setWhatIfMetrics(null)
  setReflowPreview(null)
  setSelectedActivityId(activityId)
  setFocusedActivityId(activityId)
  const trId = findTrIdForActivity(activityId)
  if (trId) setSelectedTrId(trId)  // ✅ TR ID 설정
  const v = findVoyageByActivityDate(start, voyages)
  if (v) setSelectedVoyage(v)
  // ...
}
```

#### Map onTrClick

```typescript
<MapPanelWrapper
  onTrClick={(trId) => setSelectedTrId(trId)}  // ✅ TR 클릭
  onActivitySelect={(activityId) => {
    setSelectedActivityId(activityId)
    setFocusedActivityId(activityId)
    const trId = findTrIdForActivity(activityId)
    if (trId) setSelectedTrId(trId)  // ✅ Activity 선택 시 TR 설정
    // ...
  }}
/>
```

### 7. StoryHeader Props 전달

```typescript
<StoryHeader
  trId={storyHeaderData.trId}
  where={storyHeaderData.where}
  whenWhat={storyHeaderData.whenWhat}
  evidence={storyHeaderData.evidence}
/>
```

### 8. ReadinessPanel SSOT 연동

```typescript
<ReadinessPanel 
  tripId={readinessTripId}  // ✅ 기존 Trip 매칭 로직 유지
  ssot={ssot}  // ✅ SSOT 전체 데이터 전달
/>
```

**노트**: `readinessTripId`는 ViewMode → Voyage 매칭 폴백을 사용 (이전 구현 유지)

## 장점

### 1. 실시간 SSOT 동기화
- Activity/TR 선택 시 StoryHeader가 자동으로 갱신
- Location, Schedule, Evidence 정보가 파생 계산으로 일관성 보장

### 2. 정확한 Evidence 추적
- `checkEvidenceGate`로 누락된 증빙 자동 계산
- 누락 개수 + 타입 표시로 사용자에게 명확한 정보 제공

### 3. 유연한 폴백
- Activity 선택 → TR 선택 → null 순서로 fallback
- 항상 유효한 데이터 표시 (없으면 `"—"`)

### 4. SSOT 원칙 준수
- Activity = 단일 진실원
- 모든 정보는 `ssot.entities`에서 파생 계산
- UI는 읽기 전용 (derived-calc 사용)

## 테스트 시나리오

### 시나리오 1: Activity 클릭 (Gantt)
```typescript
User clicks Activity "A1030" (TR1, Load-out)
→ selectedActivityId = "A1030"
→ selectedTrId = "TR1" (findTrIdForActivity)
→ storyHeaderActivity = ssot.entities.activities["A1030"]
→ storyHeaderData:
   - where: "Now @ Mina Zayed"
   - whenWhat: "Load-out TR1 • in_progress • Blocker: none"
   - evidence: "Missing: 2 | Types: photo, checklist"
```

### 시나리오 2: TR 클릭 (Map)
```typescript
User clicks TR marker on Map
→ selectedTrId = "TR2"
→ selectedActivityId = null
→ calculateCurrentActivityForTR(ssot, "TR2") = "A2020" (현재 Transport)
→ storyHeaderActivity = ssot.entities.activities["A2020"]
→ storyHeaderData:
   - where: "Now @ Arabian Gulf"
   - whenWhat: "Transport TR2 • in_progress • Blocker: weather"
   - evidence: "Missing: 0 | Types: —"
```

### 시나리오 3: Activity 선택 해제
```typescript
User deselects Activity
→ selectedActivityId = null
→ selectedTrId remains (TR still selected)
→ calculateCurrentActivityForTR(ssot, selectedTrId)
→ StoryHeader shows current TR activity
```

## 영향 범위

### 변경 파일
- ✅ `app/page.tsx`
  - SSOT 타입 import
  - `selectedTrId`, `ssot` state 추가
  - `storyHeaderData` 파생 계산
  - TR 선택 와이어링 (`handleActivityClick`, Map callbacks)
  - ReadinessPanel에 `ssot` prop 전달

- ✅ `CHANGELOG.md`
  - Weather Overlay 슬라이더 범위 수정 (10–30%)
  - StoryHeader SSOT 연동 항목 추가

### 타입 안정성
- ✅ TypeScript 타입 에러 없음 (page.tsx)
- ✅ `useMemo`로 파생 계산 최적화
- ⚠️ 기존 테스트 에러 (what-if-simulation-flow.test.ts 등)는 별도 수정 필요

## 다음 단계 옵션

### 옵션 1: Activity 선택 해제 시 TR도 해제
```typescript
onActivityDeselect={() => {
  setFocusedActivityId(null)
  setSelectedActivityId(null)
  setSelectedTrId(null)  // ✅ 추가
  setShowWhatIfPanel(false)
  setWhatIfMetrics(null)
  setReflowPreview(null)
}}
```

### 옵션 2: StoryHeader UI 개선
- TR 선택 드롭다운 추가
- Location/Schedule/Evidence 각 블록 클릭 시 상세 패널 표시
- Evidence 누락 시 빨간색 배지 강조

### 옵션 3: SSOT API 실시간 폴링
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch("/api/ssot")
    if (response.ok) {
      const data = await response.json()
      setSsot(data)
    }
  }, 5000) // 5초마다 갱신
  return () => clearInterval(interval)
}, [])
```

### 옵션 4: Evidence 필터링
- StoryHeader에서 "Missing Evidence" 클릭 시
- EvidenceTab이 자동으로 열리고 누락 항목만 필터링 표시

## 참고 문서

- [AGENTS.md](../AGENTS.md) - SSOT 원칙 및 Activity = 단일 진실원
- [patch.md](../patch.md) - StoryHeader UI/UX 스펙
- [LAYOUT.md](LAYOUT.md) - StoryHeader 위치 및 역할
- [trip-matching-improvement.md](trip-matching-improvement.md) - ReadinessPanel Trip 매칭

## 완료 체크리스트

- [x] SSOT 타입 import (`Activity`, `ActivityState`, `OptionC`)
- [x] 파생 계산 함수 import (`calculateCurrentActivityForTR`, `calculateCurrentLocationForTR`)
- [x] Evidence gate import (`checkEvidenceGate`)
- [x] `getEvidenceTargetState()` 헬퍼 함수 구현
- [x] `selectedTrId`, `ssot` state 추가
- [x] `storyHeaderActivity`, `storyHeaderTrId` 파생 로직
- [x] `storyHeaderData` 파생 계산 (Where, When/What, Evidence)
- [x] TR 선택 와이어링 (`handleActivityClick`, Map callbacks)
- [x] StoryHeader에 파생 데이터 전달
- [x] ReadinessPanel에 `ssot` prop 전달
- [x] CHANGELOG.md 업데이트
- [x] Git 커밋 준비

---

**Status**: ✅ **완료** (2026-02-04)  
**Commit**: 대기 중  
**파일**: `app/page.tsx` (+175/-116), `CHANGELOG.md`
