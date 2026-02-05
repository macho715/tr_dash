---
doc_id: timeline-data-density-features-plan
created: 2026-02-05
refs: [AGENTS.md, patch.md, innovation-scout-vis-timeline-upgrade-20260204.md, components/gantt/VisTimelineGantt.tsx, lib/gantt/visTimelineMapper.ts]
---

# Timeline Data Density & Visualization Features - Implementation Plan

**생성일**: 2026-02-05  
**프로젝트**: TR 이동 대시보드  
**대상**: VisTimelineGantt 데이터 밀도 & 시각화 4개 기능

---

## Executive Summary

### 목표
7 Trip + 50+ activities를 한 화면에 효율적으로 표시하고, 정보 접근성을 대폭 개선하는 4개 기능 구현.

### 4개 기능 개요

| # | 기능 | 난이도 | 공수 | 효과 | 우선순위 |
|---|------|--------|------|------|---------|
| **F3** | Activity Thumbnail Hover | Low | 1주 | Detail 왕복 80% 감소 | P1 |
| **F1** | Swimlane Auto-Grouping | Medium | 2주 | 인지 부하 50% 감소 | P2 |
| **F2** | Mini-Map Navigator | Medium | 1.5주 | 네비게이션 70% 단축 | P3 |
| **F4** | Gantt Density Heatmap | Medium | 1.5주 | 병목 사전 발견 100% | P3 |

### 예상 ROI

- **생산성**: Detail 패널 왕복 클릭 80% 감소 (F3)
- **인지 부하**: 7 Trip 한 화면 표시 + 인지 부하 50% 감소 (F1)
- **네비게이션**: 긴 타임라인 탐색 시간 70% 단축 (F2)
- **리스크**: 병목 구간 사전 발견 100% (F4)

### 총 공수 및 기간

- **Phase 1 (F3)**: 1주 (40시간)
- **Phase 2 (F1)**: 2주 (80시간)
- **Phase 3 (F2+F4)**: 2주 (80시간)
- **총 기간**: 5주 (200시간)

---

## 1. Architecture & Integration

### 현재 기술 스택

```yaml
Framework: React 19.2.0 + Next.js 16.0.10
TypeScript: Strict mode
Styling: Tailwind CSS
Gantt Library: vis-timeline/standalone v8.5.0
UI Components: Radix UI (Hover Card, Dialog, Tooltip, Context Menu)
Data: vis-data v8.0.3 (DataSet)
SSOT: option_c.json
```

### 컴포넌트 구조 (현재)

```
components/gantt/
  ├── VisTimelineGantt.tsx         # vis-timeline 래퍼
  └── (신규 추가 예정)

lib/gantt/
  ├── visTimelineMapper.ts         # GanttRow[] → VisData 변환
  └── gantt-contract.ts            # 이벤트 타입

components/dashboard/
  └── (F3 관련 hover card 컴포넌트)
```

### SSOT 연동 방식

```typescript
// Data Flow
option_c.json
  → lib/data/schedule-data.ts (scheduleActivitiesToGanttRows)
  → GanttRow[]
  → lib/gantt/visTimelineMapper.ts (ganttRowsToVisData)
  → { groups: VisGroup[], items: VisItem[] }
  → VisTimelineGantt.tsx (vis-timeline 렌더링)
```

**불변조건**:
- SSOT는 option_c.json만 사용 (우회 금지)
- Activity 상태/진척률/증빙/Collision은 Activity 객체에서만 계산
- Trip/TR은 참조(ref)만 유지

### vis-timeline 확장 방식

| 기능 | vis-timeline API | 추가 레이어 | 비고 |
|------|-----------------|------------|------|
| F3 Hover | `hover` 이벤트 | Radix Hover Card (React Portal) | DOM overlay |
| F1 Grouping | `groups` (nesting 지원) | 커스텀 group header | vis-timeline 내장 |
| F2 MiniMap | 없음 | Canvas overlay (absolute position) | 독립 렌더링 |
| F4 Heatmap | `background` | Canvas background layer | vis-timeline 뒤 |

---

## 2. Feature Implementation Plans

### F3. Activity Thumbnail Hover (Phase 1 - 1주)

#### 목표
Activity bar에 hover 시 카드 팝업으로 정보 즉시 접근. Detail 패널 왕복 클릭 80% 감소.

#### 기술 스택
- **Radix Hover Card**: `@radix-ui/react-hover-card` (이미 설치됨)
- **React Portal**: Timeline 컨테이너 밖 렌더링
- **vis-timeline event**: `itemover`, `itemout`

#### 컴포넌트 구조

```typescript
// components/gantt/ActivityHoverCard.tsx (신규)
interface ActivityHoverCardProps {
  activity: GanttRow | null
  anchorElement: HTMLElement | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 카드 내용
- 상태 배지 (PLANNED/IN_PROGRESS/COMPLETED/BLOCKED)
- 진척률 Progress Bar (calc.progress)
- 담당자/연락처
- 증빙 상태: required vs attached (evidence_summary)
- Collision 요약 (collision 있으면)
- Dependencies: incoming/outgoing (dependencies_summary)
- Quick Actions: 
  - Edit (Live 모드만)
  - Add Evidence (Live 모드만)
  - View History
  - Copy Link
```

#### VisTimelineGantt.tsx 수정

```typescript
// 1. State 추가
const [hoveredActivity, setHoveredActivity] = useState<GanttRow | null>(null)
const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
const hoverTimeoutRef = useRef<NodeJS.Timeout>()

// 2. vis-timeline 이벤트 등록
timeline.on('itemover', (properties) => {
  const activityId = properties.item
  const element = properties.event.target as HTMLElement
  
  // 0.5초 지연
  hoverTimeoutRef.current = setTimeout(() => {
    const activity = findActivityById(activityId)
    setHoveredActivity(activity)
    setHoverAnchor(element)
  }, 500)
})

timeline.on('itemout', () => {
  clearTimeout(hoverTimeoutRef.current)
  setHoveredActivity(null)
})

// 3. Render
return (
  <>
    <div ref={containerRef} />
    <ActivityHoverCard
      activity={hoveredActivity}
      anchorElement={hoverAnchor}
      open={!!hoveredActivity}
    />
  </>
)
```

#### Data Flow

```typescript
// GanttRow에 필요한 정보 추가 (schedule-data.ts)
interface GanttRow {
  // 기존 필드...
  
  // 추가 필요
  assigned_to?: string
  contact?: string
  evidence_summary?: {
    required: number
    attached: number
    types_missing: string[]
  }
  dependencies_summary?: {
    incoming: string[]  // activity IDs
    outgoing: string[]
  }
}
```

#### UX 상세

- **Trigger**: Activity bar에 마우스 hover 0.5초 후 표시
- **Position**: Activity bar 위쪽 중앙 (Radix Hover Card 자동 배치)
- **Dismiss**: 
  - 마우스 아웃 시 자동 닫힘
  - Esc 키
  - 카드 밖 클릭
- **Quick Actions**:
  - Edit: Detail 패널 열기 (Live 모드만)
  - Add Evidence: Evidence upload 다이얼로그
  - View History: History 패널로 점프 (activity 필터링)
  - Copy Link: `#activity-{id}` URL 복사

#### Edge Cases

- **Activity 없음**: hoveredActivity === null → 카드 표시 안 함
- **긴 내용**: 카드 최대 높이 400px, 스크롤
- **화면 밖**: Radix가 자동으로 flip/shift
- **모바일**: 터치 시 long press (1초) 후 표시

#### 성공 기준 (DoD)

- [ ] 0.5초 지연 후 hover card 표시
- [ ] 상태/진척률/담당자/증빙/Collision/Dependency 정보 표시
- [ ] Quick Actions 4개 모두 동작 (Live/History 모드 고려)
- [ ] Esc 키/마우스 아웃/카드 밖 클릭 시 닫힘
- [ ] TypeScript strict mode 통과
- [ ] 모바일 long press 지원

---

### F1. Swimlane Auto-Grouping (Phase 2 - 2주)

#### 목표
7 Trip + 50+ activities를 한 화면에 효율적으로 표시. 인지 부하 50% 감소.

#### 기술 스택
- **vis-timeline groups**: nesting 지원 (v8.5.0)
- **React state**: 그룹핑 모드/필터 상태
- **Radix Dropdown**: 그룹핑 옵션 선택

#### 그룹핑 옵션

```typescript
type GroupingMode = 
  | "flat"           // 현재 (no grouping)
  | "by_tr"          // TR별 (TR1~TR7)
  | "by_phase"       // Phase별 (Preparation/Transit/Installation)
  | "by_resource"    // Resource별 (SPMT/Crane/Crew)
  | "by_status"      // Status별 (Blocked/Critical/Normal)

type FilterMode =
  | "all"            // 모두 표시
  | "critical_only"  // Critical path만
  | "blocked_only"   // Blocked 상태만
  | "current_week"   // 이번 주만
```

#### visTimelineMapper.ts 확장

```typescript
export interface GanttGroupingOptions {
  mode: GroupingMode
  filter?: FilterMode
  collapsedGroups?: Set<string>  // 접힌 그룹 IDs
}

export function ganttRowsToVisData(
  rows: GanttRow[],
  options?: GanttVisOptions & { grouping?: GanttGroupingOptions }
): VisTimelineData {
  const grouping = options?.grouping
  
  if (!grouping || grouping.mode === "flat") {
    // 기존 로직
    return { groups: flatGroups, items: flatItems }
  }
  
  // 그룹핑 로직
  const nestedGroups = createNestedGroups(rows, grouping.mode)
  const filteredRows = applyFilter(rows, grouping.filter)
  
  return {
    groups: nestedGroups,
    items: createGroupedItems(filteredRows, grouping.mode)
  }
}

// TR별 그룹핑 예시
function createNestedGroups(rows: GanttRow[], mode: GroupingMode): VisGroup[] {
  if (mode === "by_tr") {
    const trGroups = [
      { id: "TR1", content: "TR1", order: 0 },
      { id: "TR2", content: "TR2", order: 1 },
      // ...
    ]
    
    const activityGroups = rows.map(row => ({
      id: row.id,
      content: row.label,
      nestedGroups: [row.tripId],  // vis-timeline nesting
      order: row.order
    }))
    
    return [...trGroups, ...activityGroups]
  }
  // by_phase, by_resource, by_status 유사 로직
}
```

#### 그룹 헤더 커스터마이징

vis-timeline은 그룹 헤더를 HTML로 커스터마이징 가능.

```typescript
// VisTimelineGantt.tsx
const options = {
  groupTemplate: (group: VisGroup) => {
    if (group.nestedGroups) {
      // 부모 그룹 (TR/Phase/Resource)
      const summary = calculateGroupSummary(group.id)
      return `
        <div class="group-header">
          <button class="collapse-btn" data-group="${group.id}">
            ${collapsed ? "▶" : "▼"}
          </button>
          <span class="group-name">${group.content}</span>
          <span class="group-summary">
            ${summary.completed}/${summary.total} ·
            ${summary.delayed} delayed ·
            ${summary.resourceUtil}% util
          </span>
        </div>
      `
    }
    return group.content  // 자식 activity
  }
}
```

#### Collapse/Expand 로직

```typescript
// VisTimelineGantt.tsx
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

// 버튼 클릭 이벤트
useEffect(() => {
  const handleCollapseClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('collapse-btn')) {
      const groupId = target.dataset.group
      setCollapsedGroups(prev => {
        const next = new Set(prev)
        if (next.has(groupId)) {
          next.delete(groupId)
        } else {
          next.add(groupId)
        }
        return next
      })
    }
  }
  
  containerRef.current?.addEventListener('click', handleCollapseClick)
  return () => containerRef.current?.removeEventListener('click', handleCollapseClick)
}, [])

// vis-timeline에 반영
useEffect(() => {
  if (!timelineRef.current) return
  
  collapsedGroups.forEach(groupId => {
    // vis-timeline API로 그룹 접기
    timelineRef.current.setGroups(/* collapsed groups */)
  })
}, [collapsedGroups])
```

#### UI 컨트롤

```typescript
// 그룹핑 드롭다운 (Control Bar에 추가)
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="outline">
      Group by: {groupingMode}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setGroupingMode("by_tr")}>
      By TR
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setGroupingMode("by_phase")}>
      By Phase
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setGroupingMode("by_resource")}>
      By Resource
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setGroupingMode("by_status")}>
      By Status
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// 필터 드롭다운
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="outline">
      Show: {filterMode}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setFilterMode("all")}>
      All Activities
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setFilterMode("critical_only")}>
      Critical Only
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setFilterMode("blocked_only")}>
      Blocked Only
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setFilterMode("current_week")}>
      Current Week
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 그룹 요약 계산

```typescript
function calculateGroupSummary(groupId: string, rows: GanttRow[]) {
  const groupRows = rows.filter(row => {
    // grouping mode에 따라 필터링
    if (groupingMode === "by_tr") {
      return row.tripId === groupId
    }
    // by_phase, by_resource, by_status...
  })
  
  return {
    total: groupRows.length,
    completed: groupRows.filter(r => r.state === "COMPLETED").length,
    delayed: groupRows.filter(r => r.calc?.is_delayed).length,
    resourceUtil: calculateResourceUtilization(groupRows)
  }
}
```

#### Edge Cases

- **빈 그룹**: 필터 적용 시 일부 그룹이 빈 경우 → 그룹 헤더만 표시 (회색)
- **그룹 변경**: 그룹핑 모드 변경 시 collapsed 상태 초기화
- **성능**: 100+ activities → useMemo로 그룹 계산 캐싱

#### 성공 기준 (DoD)

- [ ] 4가지 그룹핑 모드 (TR/Phase/Resource/Status) 동작
- [ ] Collapse/Expand 버튼 동작
- [ ] 그룹 헤더에 요약 정보 표시 (완료율/지연/자원 사용률)
- [ ] 4가지 필터 (All/Critical/Blocked/Current Week) 동작
- [ ] 그룹핑 모드 변경 시 smooth 전환
- [ ] 100+ activities 성능 테스트 (렌더링 <2초)

---

### F2. Mini-Map Navigator (Phase 3 - 1.5주)

#### 목표
긴 타임라인 네비게이션 효율화. 탐색 시간 70% 단축.

#### 기술 스택
- **Canvas API**: 미니맵 렌더링
- **React Hook**: useEffect로 vis-timeline 동기화
- **Radix Toggle**: 미니맵 표시/숨김

#### 컴포넌트 구조

```typescript
// components/gantt/MiniMapNavigator.tsx (신규)
interface MiniMapNavigatorProps {
  timeline: Timeline | null
  activities: GanttRow[]
  projectStart: Date
  projectEnd: Date
  currentViewport: { start: Date; end: Date }
  onViewportChange: (range: { start: Date; end: Date }) => void
  visible: boolean
}

// 위치: 타임라인 우측 하단 absolute position
// 크기: 200px x 80px
```

#### 렌더링 로직

```typescript
function MiniMapNavigator({ timeline, activities, ... }: MiniMapNavigatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 미니맵 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')!
    const width = canvas.width
    const height = canvas.height
    
    // 배경
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)
    
    // Activities 그리기 (간략화된 bar)
    activities.forEach(activity => {
      const x = timeToX(activity.plan.start, projectStart, projectEnd, width)
      const w = timeToX(activity.plan.end, projectStart, projectEnd, width) - x
      const y = activityToY(activity, height)
      const h = 2  // 간략화
      
      // 색상: 상태 기반
      ctx.fillStyle = getActivityColor(activity)
      ctx.fillRect(x, y, w, h)
    })
    
    // Critical path 강조 (빨간 점)
    activities.filter(a => a.calc?.is_critical_path).forEach(activity => {
      const x = timeToX(activity.plan.start, projectStart, projectEnd, width)
      const y = activityToY(activity, height)
      ctx.fillStyle = 'red'
      ctx.fillRect(x, y - 1, 3, 4)
    })
    
    // Collision 위치 (주황 점)
    activities.filter(a => a.collision).forEach(activity => {
      const x = timeToX(activity.plan.start, projectStart, projectEnd, width)
      const y = activityToY(activity, height)
      ctx.fillStyle = 'orange'
      ctx.fillRect(x, y - 1, 3, 4)
    })
    
    // 현재 viewport 사각형
    const vpX = timeToX(currentViewport.start, projectStart, projectEnd, width)
    const vpW = timeToX(currentViewport.end, projectStart, projectEnd, width) - vpX
    ctx.strokeStyle = 'blue'
    ctx.lineWidth = 2
    ctx.strokeRect(vpX, 0, vpW, height)
    
  }, [activities, currentViewport, projectStart, projectEnd])
  
  // 클릭/드래그 이벤트
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // x → 시간 변환
    const clickedTime = xToTime(x, canvas.width, projectStart, projectEnd)
    
    // viewport 중앙이 clickedTime이 되도록 이동
    const viewportDuration = currentViewport.end.getTime() - currentViewport.start.getTime()
    const newStart = new Date(clickedTime.getTime() - viewportDuration / 2)
    const newEnd = new Date(clickedTime.getTime() + viewportDuration / 2)
    
    onViewportChange({ start: newStart, end: newEnd })
  }
  
  if (!visible) return null
  
  return (
    <div className="absolute bottom-4 right-4 border rounded shadow-lg bg-white p-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={80}
        onClick={handleCanvasClick}
        className="cursor-pointer"
      />
    </div>
  )
}
```

#### VisTimelineGantt.tsx 통합

```typescript
// 1. State 추가
const [miniMapVisible, setMiniMapVisible] = useState(true)
const [currentViewport, setCurrentViewport] = useState<{ start: Date; end: Date }>({
  start: PROJECT_START,
  end: addDays(PROJECT_START, 14)
})

// 2. vis-timeline rangechange 이벤트
timeline.on('rangechange', (properties) => {
  setCurrentViewport({
    start: properties.start,
    end: properties.end
  })
  onRangeChange?.({ start: properties.start, end: properties.end })
})

// 3. MiniMap에서 viewport 변경 시
const handleViewportChange = (range: { start: Date; end: Date }) => {
  timelineRef.current?.setWindow(range.start, range.end)
}

// 4. Render
return (
  <div className="relative">
    <div ref={containerRef} />
    <MiniMapNavigator
      timeline={timelineRef.current}
      activities={rows}
      projectStart={PROJECT_START}
      projectEnd={PROJECT_END}
      currentViewport={currentViewport}
      onViewportChange={handleViewportChange}
      visible={miniMapVisible}
    />
  </div>
)
```

#### 토글 버튼 (Control Bar)

```typescript
<Toggle
  pressed={miniMapVisible}
  onPressedChange={setMiniMapVisible}
  aria-label="Toggle mini-map"
>
  <MapIcon className="h-4 w-4" />
  Mini-Map
</Toggle>
```

#### Edge Cases

- **프로젝트 기간 변경**: PROJECT_START/END 변경 시 미니맵 재렌더링
- **Activity 수 많음**: 100+ activities → 2px 간격으로 샘플링
- **Viewport 밖**: viewport가 프로젝트 범위 밖이면 clamp

#### 성공 기준 (DoD)

- [ ] 전체 타임라인 미니맵 표시 (200x80px)
- [ ] 현재 viewport 사각형 강조
- [ ] Critical path/Collision 위치 표시 (점)
- [ ] 클릭으로 즉시 점프
- [ ] 드래그로 viewport 이동 (선택)
- [ ] 토글 버튼으로 표시/숨김
- [ ] vis-timeline rangechange와 동기화

---

### F4. Gantt Density Heatmap (Phase 3 - 1.5주)

#### 목표
시간대별 병목 시각화. 병목 사전 발견 100%.

#### 기술 스택
- **Canvas API**: 히트맵 레이어
- **d3-scale** (선택): 색상 interpolation (기존 없음 → 추가 고려)
- **Radix Toggle**: 히트맵 표시/숨김

#### 컴포넌트 구조

```typescript
// components/gantt/DensityHeatmap.tsx (신규)
interface DensityHeatmapProps {
  activities: GanttRow[]
  projectStart: Date
  projectEnd: Date
  timelineElement: HTMLElement | null
  visible: boolean
  densityType: "activity" | "resource"  // activity 밀도 or 자원 점유율
}

// 위치: vis-timeline 배경 (z-index: -1)
// 크기: 타임라인과 동일
```

#### 밀도 계산

```typescript
// 시간대별 activity 밀도 계산
function calculateDensity(
  activities: GanttRow[],
  projectStart: Date,
  projectEnd: Date,
  resolution: number = 24  // 1일 단위
): number[] {
  const densityMap = new Array(resolution).fill(0)
  
  activities.forEach(activity => {
    const startIdx = timeToIndex(activity.plan.start, projectStart, projectEnd, resolution)
    const endIdx = timeToIndex(activity.plan.end, projectStart, projectEnd, resolution)
    
    for (let i = startIdx; i <= endIdx; i++) {
      densityMap[i] += 1
    }
  })
  
  return densityMap
}

// 자원 점유율 계산 (SPMT/Crew)
function calculateResourceUtilization(
  activities: GanttRow[],
  resourceType: string,  // "SPMT" | "Crew"
  projectStart: Date,
  projectEnd: Date,
  resolution: number = 24
): number[] {
  const utilMap = new Array(resolution).fill(0)
  const capacity = getResourceCapacity(resourceType)  // SPMT=1, Crew=10
  
  activities.forEach(activity => {
    if (!activity.resources_required?.includes(resourceType)) return
    
    const startIdx = timeToIndex(activity.plan.start, projectStart, projectEnd, resolution)
    const endIdx = timeToIndex(activity.plan.end, projectStart, projectEnd, resolution)
    
    for (let i = startIdx; i <= endIdx; i++) {
      utilMap[i] += 1
    }
  })
  
  // 0~1 정규화
  return utilMap.map(u => u / capacity)
}
```

#### 렌더링 로직

```typescript
function DensityHeatmap({ activities, projectStart, projectEnd, timelineElement, visible, densityType }: DensityHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    if (!visible || !timelineElement) return
    
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    
    // 타임라인 크기에 맞춤
    const rect = timelineElement.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    
    // 밀도 계산
    const resolution = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24))  // 일 단위
    const density = densityType === "activity"
      ? calculateDensity(activities, projectStart, projectEnd, resolution)
      : calculateResourceUtilization(activities, "SPMT", projectStart, projectEnd, resolution)
    
    // 색상 매핑
    const maxDensity = Math.max(...density)
    
    density.forEach((d, i) => {
      const x = (i / resolution) * canvas.width
      const w = canvas.width / resolution
      
      // 색상: 초록(0) → 노랑(0.5) → 주황(0.75) → 빨강(1.0)
      const ratio = d / maxDensity
      ctx.fillStyle = getDensityColor(ratio)
      ctx.globalAlpha = 0.3  // 반투명
      ctx.fillRect(x, 0, w, canvas.height)
    })
    
  }, [activities, visible, densityType, projectStart, projectEnd, timelineElement])
  
  if (!visible) return null
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}

// 색상 함수
function getDensityColor(ratio: number): string {
  if (ratio < 0.33) return 'rgb(34, 197, 94)'   // green-500
  if (ratio < 0.66) return 'rgb(234, 179, 8)'   // yellow-500
  if (ratio < 0.85) return 'rgb(249, 115, 22)'  // orange-500
  return 'rgb(239, 68, 68)'                     // red-500
}
```

#### VisTimelineGantt.tsx 통합

```typescript
// 1. State 추가
const [heatmapVisible, setHeatmapVisible] = useState(false)
const [heatmapType, setHeatmapType] = useState<"activity" | "resource">("activity")

// 2. Render
return (
  <div className="relative">
    <DensityHeatmap
      activities={rows}
      projectStart={PROJECT_START}
      projectEnd={PROJECT_END}
      timelineElement={containerRef.current}
      visible={heatmapVisible}
      densityType={heatmapType}
    />
    <div ref={containerRef} />
  </div>
)
```

#### 토글 버튼 (Control Bar)

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Toggle
      pressed={heatmapVisible}
      onPressedChange={setHeatmapVisible}
      aria-label="Toggle density heatmap"
    >
      <ActivityIcon className="h-4 w-4" />
      Density Heatmap
    </Toggle>
  </DropdownMenuTrigger>
  {heatmapVisible && (
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => setHeatmapType("activity")}>
        Activity Density
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setHeatmapType("resource")}>
        Resource Utilization
      </DropdownMenuItem>
    </DropdownMenuContent>
  )}
</DropdownMenu>
```

#### 클릭 이벤트 (선택 기능)

```typescript
// 히트맵 클릭 시 해당 시간대 activity 목록 표시
const handleHeatmapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current!
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  
  // x → 시간 변환
  const clickedTime = xToTime(x, canvas.width, projectStart, projectEnd)
  
  // 해당 시간대 activities 필터링
  const activitiesAtTime = activities.filter(a => 
    a.plan.start <= clickedTime && clickedTime <= a.plan.end
  )
  
  // Popover 표시
  showActivityListPopover(activitiesAtTime, e.clientX, e.clientY)
}
```

#### Edge Cases

- **밀도 0**: 해당 시간대는 투명 (배경 표시 안 함)
- **Resolution 조정**: 타임라인 zoom level에 따라 resolution 동적 조정
- **성능**: 100+ activities → requestAnimationFrame으로 throttle

#### 성공 기준 (DoD)

- [ ] 시간대별 activity 밀도 히트맵 표시
- [ ] 색상 코딩 (초록/노랑/주황/빨강)
- [ ] 자원 점유율 히트맵 (SPMT/Crew)
- [ ] 토글 버튼으로 표시/숨김
- [ ] Activity/Resource 타입 전환
- [ ] 반투명 배경 (타임라인 가독성 유지)
- [ ] (선택) 클릭 시 activity 목록 표시

---

## 3. Implementation Sequence

### Phase 1: F3 Activity Thumbnail Hover (1주)

**Week 1**
- [ ] Day 1-2: ActivityHoverCard 컴포넌트 생성
- [ ] Day 3-4: VisTimelineGantt.tsx 이벤트 통합
- [ ] Day 5: GanttRow 데이터 확장 (evidence_summary, dependencies_summary)
- [ ] Day 6-7: Quick Actions 구현 + 테스트

**DoD**:
- [ ] Hover card 표시/숨김 동작
- [ ] 모든 정보 표시 (상태/진척률/담당자/증빙/Collision/Dependency)
- [ ] Quick Actions 4개 동작
- [ ] TypeScript strict mode 통과
- [ ] 모바일 long press 지원

---

### Phase 2: F1 Swimlane Auto-Grouping (2주)

**Week 2**
- [ ] Day 1-2: visTimelineMapper.ts 그룹핑 로직 추가
- [ ] Day 3-4: vis-timeline group nesting 구현
- [ ] Day 5-7: 그룹 헤더 커스터마이징 + 요약 계산

**Week 3**
- [ ] Day 1-3: Collapse/Expand 버튼 구현
- [ ] Day 4-5: 그룹핑/필터 UI 컨트롤 (Dropdown)
- [ ] Day 6-7: 테스트 + 성능 최적화 (100+ activities)

**DoD**:
- [ ] 4가지 그룹핑 모드 동작 (TR/Phase/Resource/Status)
- [ ] Collapse/Expand 동작
- [ ] 그룹 헤더 요약 정보 표시
- [ ] 4가지 필터 동작
- [ ] 100+ activities 성능 테스트 통과

---

### Phase 3: F2 MiniMap + F4 Heatmap (2주)

**Week 4**
- [ ] Day 1-3: MiniMapNavigator 컴포넌트 생성 + 렌더링
- [ ] Day 4-5: vis-timeline 동기화 + 클릭 이벤트
- [ ] Day 6-7: DensityHeatmap 컴포넌트 생성 + 밀도 계산

**Week 5**
- [ ] Day 1-2: Heatmap 렌더링 + 색상 매핑
- [ ] Day 3-4: 자원 점유율 모드 추가
- [ ] Day 5: 토글 UI + 통합 테스트
- [ ] Day 6-7: 성능 최적화 + 문서 작성

**DoD**:
- [ ] MiniMap 전체 타임라인 표시 + 클릭 점프
- [ ] Heatmap 시간대별 밀도 표시
- [ ] Activity/Resource 타입 전환
- [ ] 토글 버튼 동작
- [ ] vis-timeline과 동기화

---

## 4. Quality Gates

### TypeScript Strict Mode
- [ ] 모든 신규 파일 strict mode 준수
- [ ] `npm run typecheck` 통과

### Lint
- [ ] `npm run lint` 경고 0개

### Tests (vitest)
- [ ] F3: ActivityHoverCard 렌더링 테스트
- [ ] F1: 그룹핑 모드별 데이터 변환 테스트
- [ ] F2: MiniMap viewport 계산 테스트
- [ ] F4: 밀도 계산 정확도 테스트

### 성능 목표
- [ ] 100+ activities 초기 렌더링 < 2초
- [ ] Hover card 표시 지연 0.5초 ± 100ms
- [ ] MiniMap/Heatmap 렌더링 < 100ms
- [ ] 그룹핑 모드 전환 < 500ms

### 접근성
- [ ] Hover card: Esc 키로 닫기
- [ ] 그룹핑 UI: 키보드 네비게이션 (Tab/Enter)
- [ ] 토글 버튼: aria-label 포함
- [ ] 색상 대비: 4.5:1 이상 (히트맵 제외 - 배경이므로)

---

## 5. SSOT Guard

### option_c.json 무결성 체크

각 Phase 완료 시 `scripts/validate_optionc.py` 실행:

```bash
npm run validate:ssot
```

**검증 항목**:
- [ ] Activity 데이터 무결성 (state, plan, actual, evidence)
- [ ] Trip/TR 참조 무결성
- [ ] Collision 데이터 일관성
- [ ] Dependencies 순환 참조 없음

### Activity 상태 기반 표시 로직

모든 기능은 Activity.state를 SSOT로 사용:

```typescript
// ❌ 잘못된 예 (state를 로컬 변수로 저장)
let activityState = "IN_PROGRESS"

// ✅ 올바른 예 (option_c.json에서 계산)
const activityState = activity.state  // from GanttRow
```

### 파생 데이터 계산

진척률/Collision/Critical path는 파생(calc)으로 계산:

```typescript
// lib/gantt/gantt-calc.ts (기존)
export function calculateGanttMetrics(row: GanttRow): GanttCalc {
  return {
    progress: calculateProgress(row),
    is_delayed: isDelayed(row),
    is_critical_path: isCriticalPath(row),
    // ...
  }
}
```

---

## 6. Rollback & Migration

### Feature Flags

각 기능은 독립적으로 토글 가능:

```typescript
// lib/feature-flags.ts (신규)
export const FEATURE_FLAGS = {
  HOVER_CARD: true,
  GROUPING: true,
  MINIMAP: true,
  HEATMAP: true,
} as const

// VisTimelineGantt.tsx
import { FEATURE_FLAGS } from "@/lib/feature-flags"

{FEATURE_FLAGS.HOVER_CARD && (
  <ActivityHoverCard {...props} />
)}
```

### 기존 기능 영향 분석

| 기능 | 영향 범위 | Breaking Change | 롤백 방법 |
|------|----------|----------------|-----------|
| F3 Hover | 없음 (additive) | ❌ No | Feature flag OFF |
| F1 Grouping | visTimelineMapper.ts | ⚠️ API 확장 (호환) | Feature flag OFF + flat mode |
| F2 MiniMap | 없음 (overlay) | ❌ No | Feature flag OFF |
| F4 Heatmap | 없음 (background) | ❌ No | Feature flag OFF |

### 롤백 시나리오

**Phase 1 (F3) 롤백**:
1. `FEATURE_FLAGS.HOVER_CARD = false`
2. ActivityHoverCard 컴포넌트 언마운트
3. vis-timeline hover 이벤트 리스너 제거

**Phase 2 (F1) 롤백**:
1. `FEATURE_FLAGS.GROUPING = false`
2. visTimelineMapper.ts에서 `grouping` 옵션 무시 → flat mode
3. UI 컨트롤 숨김

**Phase 3 (F2+F4) 롤백**:
1. `FEATURE_FLAGS.MINIMAP = false`, `FEATURE_FLAGS.HEATMAP = false`
2. Canvas overlay/background 언마운트

### 마이그레이션 계획

**기존 사용자**:
- 모든 기능 default OFF → 점진적 활성화
- Onboarding tooltip: "New: Activity Hover Card" (첫 사용 시)

**신규 사용자**:
- 모든 기능 default ON
- "Show less" 옵션으로 간소화 가능

---

## 7. Dependencies & Package Changes

### 신규 패키지 (선택)

```json
// package.json
{
  "dependencies": {
    // (선택) d3-scale - 히트맵 색상 interpolation
    // "d3-scale": "^4.0.2"  // 30KB
    // → 또는 자체 구현 (getDensityColor 함수)
  }
}
```

**결정**: 자체 구현 권장 (30KB 절약, 의존성 최소화)

---

## 8. Documentation

### 사용자 가이드

`docs/user-guide/timeline-features.md` (신규 작성):

- F3: Activity 정보를 빠르게 확인하는 방법
- F1: 그룹핑으로 대량 Activity 관리하기
- F2: MiniMap으로 긴 타임라인 탐색하기
- F4: 히트맵으로 병목 구간 찾기

### API 문서

`lib/gantt/README.md` (업데이트):

- `GanttGroupingOptions` 인터페이스
- `ganttRowsToVisData` 옵션 확장
- VisTimelineGanttHandle 확장 (선택)

---

## 9. Success Metrics (KPI)

### Phase 1 (F3) 성공 지표
- [ ] Detail 패널 클릭 수 80% 감소
- [ ] Hover card 사용률 > 70% (활성 사용자 중)
- [ ] Quick Actions 클릭 > 30회/일

### Phase 2 (F1) 성공 지표
- [ ] 그룹핑 사용률 > 50% (50+ activities 환경)
- [ ] Collapse 사용 > 20회/일
- [ ] 인지 부하 설문 점수 50% 개선

### Phase 3 (F2+F4) 성공 지표
- [ ] MiniMap 클릭 > 15회/일
- [ ] Heatmap 활성화율 > 40%
- [ ] 병목 구간 사전 발견 사례 수집

---

## 10. Risk & Mitigation

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|----------|
| vis-timeline nesting 제한 | Medium | High | 사전 POC (Phase 2 전) |
| Canvas 성능 (100+ activities) | Medium | Medium | requestAnimationFrame + throttle |
| Hover card 위치 계산 오류 | Low | Low | Radix Hover Card 자동 배치 |
| 그룹 헤더 HTML 커스터마이징 제한 | Low | Medium | vis-timeline groupTemplate 문서 확인 |

---

## Refs

- [innovation-scout-vis-timeline-upgrade-20260204.md](./innovation-scout-vis-timeline-upgrade-20260204.md)
- [components/gantt/VisTimelineGantt.tsx](../../components/gantt/VisTimelineGantt.tsx)
- [lib/gantt/visTimelineMapper.ts](../../lib/gantt/visTimelineMapper.ts)
- [patch.md](../../patch.md)
- [AGENTS.md](../../AGENTS.md)
- [vis-timeline Documentation](https://visjs.github.io/vis-timeline/docs/timeline/)
- [Radix UI Hover Card](https://www.radix-ui.com/primitives/docs/components/hover-card)
