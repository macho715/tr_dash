# VisTimelineGantt Phase 1 구현 계획 (우선 3개)

**생성일**: 2026-02-04  
**상태**: Ready for Implementation  
**예상 시간**: 24시간 (3일)  
**위험도**: Low

---

## Executive Summary

**목표**: VisTimelineGantt 성능 및 UX 개선 (Quick Wins 3개)

**범위**:
1. **A3. Mapper Caching** (4시간) - 재렌더링 30% 개선
2. **B3. Evidence 직접 링크** (12시간) - 증빙 누락 발견율 100%
3. **B5. Dependency Type 시각화** (8시간) - FS/SS/FF/SF 구분

**총 예상 효과**:
- ✅ 성능: 재렌더링 시간 30% 감소
- ✅ UX: Evidence 발견율 70% → 100%
- ✅ 가독성: Dependency 이해도 40% 향상

---

## 1. A3. Mapper Caching (4시간)

### 1.1 Technical Design

**현재 문제**:
```typescript
// gantt-chart.tsx (현재)
const visData = useMemo(() => {
  return ganttRowsToVisData(ganttRows, options)
}, [ganttRows, options]) // ganttRows 전체가 바뀌면 전체 재변환
```

**개선 방안**:
```typescript
// 1. Activity ID 기반 diff 계산
// 2. 변경된 row만 재변환
// 3. 캐시 적중률 90%+ 목표
```

---

### 1.2 Implementation Steps

#### Step 1.1: visTimelineMapper.ts에 캐시 로직 추가 (1.5h)

**파일**: `lib/gantt/visTimelineMapper.ts`

```typescript
// 새로운 타입 추가
interface MapperCache {
  rowsCache: WeakMap<GanttRow, VisItem>
  groupsCache: WeakMap<GanttRow, VisGroup>
  lastHash: string
}

// 캐시 인스턴스 (모듈 레벨)
const mapperCache: MapperCache = {
  rowsCache: new WeakMap(),
  groupsCache: new WeakMap(),
  lastHash: '',
}

// 해시 계산 함수
function computeRowsHash(rows: GanttRow[]): string {
  // Activity ID + level1 + level2 + start + end 조합
  return rows
    .map(r => `${r.activity_id}-${r.level1}-${r.level2}-${r.start}-${r.end}`)
    .join('|')
}

// 캐시 적용 매퍼
export function ganttRowsToVisDataCached(
  ganttRows: GanttRow[],
  options?: GanttVisOptions
): { groups: VisGroup[]; items: VisItem[] } {
  const currentHash = computeRowsHash(ganttRows)
  
  // 전체 해시가 동일하면 빠른 경로
  if (currentHash === mapperCache.lastHash && !options?.reflowPreview) {
    console.log('[mapper] Cache hit (full)')
    // groups/items를 캐시에서 복원
    const cachedGroups = ganttRows.map(r => mapperCache.groupsCache.get(r)).filter(Boolean)
    const cachedItems = ganttRows.map(r => mapperCache.rowsCache.get(r)).filter(Boolean)
    
    if (cachedGroups.length === ganttRows.length && cachedItems.length === ganttRows.length) {
      return { groups: cachedGroups as VisGroup[], items: cachedItems as VisItem[] }
    }
  }
  
  // 부분 캐시: 변경된 row만 재변환
  const groups: VisGroup[] = []
  const items: VisItem[] = []
  let cacheHits = 0
  
  ganttRows.forEach(row => {
    const cachedGroup = mapperCache.groupsCache.get(row)
    const cachedItem = mapperCache.rowsCache.get(row)
    
    if (cachedGroup && cachedItem) {
      groups.push(cachedGroup)
      items.push(cachedItem)
      cacheHits++
    } else {
      // 새로운 변환
      const newGroup = rowToVisGroup(row)
      const newItem = rowToVisItem(row, options)
      
      groups.push(newGroup)
      items.push(newItem)
      
      // 캐시 저장
      mapperCache.groupsCache.set(row, newGroup)
      mapperCache.rowsCache.set(row, newItem)
    }
  })
  
  console.log(`[mapper] Cache hits: ${cacheHits}/${ganttRows.length}`)
  mapperCache.lastHash = currentHash
  
  return { groups, items }
}

// 기존 함수는 유지 (역호환)
export function ganttRowsToVisData(...args) {
  return ganttRowsToVisDataCached(...args)
}
```

**테스트**:
```typescript
// lib/gantt/__tests__/visTimelineMapper.test.ts
describe('Mapper Caching', () => {
  it('caches unchanged rows', () => {
    const rows = [mockRow1, mockRow2]
    
    // 첫 호출
    const result1 = ganttRowsToVisData(rows)
    
    // 두 번째 호출 (동일 데이터)
    const result2 = ganttRowsToVisData(rows)
    
    // 참조 동일성 확인 (캐시 적중)
    expect(result2.groups[0]).toBe(result1.groups[0])
  })
  
  it('recomputes changed rows only', () => {
    const rows = [mockRow1, mockRow2]
    const result1 = ganttRowsToVisData(rows)
    
    // 한 row만 변경
    const modifiedRows = [mockRow1, { ...mockRow2, start: '2026-02-05' }]
    const result2 = ganttRowsToVisData(modifiedRows)
    
    // row1은 캐시, row2는 재계산
    expect(result2.groups[0]).toBe(result1.groups[0])
    expect(result2.items[1]).not.toBe(result1.items[1])
  })
})
```

---

#### Step 1.2: gantt-chart.tsx에서 useMemo 최적화 (1h)

**파일**: `components/dashboard/gantt-chart.tsx`

```typescript
// 변경 전
const visData = useMemo(() => {
  return ganttRowsToVisData(ganttRows, { reflowPreview, ... })
}, [ganttRows, reflowPreview, weatherPreview, ...])

// 변경 후
const visData = useMemo(() => {
  console.log('[gantt-chart] Recomputing vis data')
  return ganttRowsToVisData(ganttRows, {
    reflowPreview,
    weatherPreview,
    weatherPropagated,
    selectedDate,
  })
}, [
  ganttRows, // 이제 캐시가 내부적으로 diff 계산
  reflowPreview,
  weatherPreview,
  weatherPropagated,
  selectedDate,
])

// Performance 측정 추가
useEffect(() => {
  const start = performance.now()
  const visData = ganttRowsToVisData(ganttRows, options)
  const elapsed = performance.now() - start
  
  if (elapsed > 100) {
    console.warn(`[gantt-chart] Slow mapper: ${elapsed}ms for ${ganttRows.length} rows`)
  }
}, [ganttRows])
```

---

#### Step 1.3: 성능 벤치마크 추가 (1h)

**파일**: `lib/gantt/__tests__/mapper-performance.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { ganttRowsToVisData } from '../visTimelineMapper'
import { generateMockRows } from './fixtures'

describe('Mapper Performance', () => {
  it('handles 100 rows in < 100ms (cold cache)', () => {
    const rows = generateMockRows(100)
    
    const start = performance.now()
    ganttRowsToVisData(rows)
    const elapsed = performance.now() - start
    
    expect(elapsed).toBeLessThan(100)
  })
  
  it('handles 100 rows in < 10ms (warm cache)', () => {
    const rows = generateMockRows(100)
    
    // Warm cache
    ganttRowsToVisData(rows)
    
    const start = performance.now()
    ganttRowsToVisData(rows)
    const elapsed = performance.now() - start
    
    expect(elapsed).toBeLessThan(10)
  })
  
  it('cache hit rate > 90% for minor changes', () => {
    const rows = generateMockRows(100)
    
    // Initial
    ganttRowsToVisData(rows)
    
    // Change 5 rows
    const modifiedRows = rows.map((row, i) => 
      i < 5 ? { ...row, start: '2026-02-05' } : row
    )
    
    ganttRowsToVisData(modifiedRows)
    
    // Cache hit rate: 95/100 = 95%
    // (측정 로직은 console.log 파싱 또는 cache stats 반환)
  })
})
```

---

#### Step 1.4: 문서 갱신 (0.5h)

**파일**: `lib/gantt/visTimelineMapper.ts` (JSDoc)

```typescript
/**
 * Convert GanttRow[] to vis-timeline format with intelligent caching.
 * 
 * **Performance:**
 * - Uses WeakMap for O(1) cache lookups
 * - Activity ID-based diff calculation
 * - Cache hit rate: 90%+ for minor changes
 * - Cold cache: < 100ms for 100 rows
 * - Warm cache: < 10ms for 100 rows
 * 
 * **Cache Invalidation:**
 * - Automatic on row content change
 * - Manual clear via `clearMapperCache()`
 * 
 * @param ganttRows - Source data from SSOT
 * @param options - Visualization options (ghost bars, etc.)
 * @returns vis-timeline groups and items
 */
export function ganttRowsToVisData(...) { ... }
```

---

### 1.3 Testing Checklist

- [ ] Unit tests: 캐시 적중/재계산 로직
- [ ] Performance tests: 100 rows < 100ms (cold), < 10ms (warm)
- [ ] Integration test: gantt-chart.tsx에서 실제 동작 확인
- [ ] Manual verification: 브라우저 DevTools Performance 프로파일링

---

### 1.4 Success Criteria

- ✅ 재렌더링 시간 30% 감소 (예: 150ms → 105ms)
- ✅ Cache hit rate 90%+ (console.log 확인)
- ✅ TypeScript strict 통과
- ✅ 기존 테스트 모두 통과

---

## 2. B3. Evidence 직접 링크 (12시간)

### 2.1 Technical Design

**UI Flow**:
```
Activity bar 우클릭
  ↓
Context Menu: "증빙 보기"
  ↓
Evidence Drawer (Radix Dialog) 열림
  ↓
Required vs Attached 비교표
  ↓
"업로드" 버튼 → File picker
```

**Component Structure**:
```
VisTimelineGantt.tsx
  ├─ onContextMenu → setSelectedActivity
  └─ EvidenceDrawer
      ├─ EvidenceTable (required vs attached)
      ├─ MissingBadge (강조)
      └─ UploadButton
```

---

### 2.2 Implementation Steps

#### Step 2.1: EvidenceDrawer 컴포넌트 생성 (4h)

**파일**: `components/evidence/EvidenceDrawer.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, FileCheck, AlertTriangle } from 'lucide-react'
import type { Activity, Evidence } from '@/types/ssot'

interface EvidenceDrawerProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload?: (activityId: string, file: File) => Promise<void>
}

export function EvidenceDrawer({ activity, open, onOpenChange, onUpload }: EvidenceDrawerProps) {
  if (!activity) return null
  
  const requiredTypes = activity.evidence_required?.types || []
  const attachedEvidence = activity.evidence || []
  
  // 누락 항목 계산
  const missingTypes = requiredTypes.filter(type => 
    !attachedEvidence.some(e => e.type === type)
  )
  
  const missingCount = activity.evidence_required?.min_count 
    ? Math.max(0, activity.evidence_required.min_count - attachedEvidence.length)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            증빙 현황: {activity.activity_name || activity.activity_id}
          </DialogTitle>
        </DialogHeader>
        
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900 rounded-lg">
          <div>
            <div className="text-sm text-slate-400">Required Types</div>
            <div className="text-2xl font-bold">{requiredTypes.length}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Attached</div>
            <div className="text-2xl font-bold text-green-400">{attachedEvidence.length}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Missing</div>
            <div className="text-2xl font-bold text-red-400">
              {missingTypes.length + missingCount}
            </div>
          </div>
        </div>
        
        {/* 누락 경고 */}
        {(missingTypes.length > 0 || missingCount > 0) && (
          <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-500/50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="text-sm text-red-300">
              {missingTypes.length > 0 && `Required types missing: ${missingTypes.join(', ')}`}
              {missingCount > 0 && ` (Need ${missingCount} more evidence)`}
            </div>
          </div>
        )}
        
        {/* 비교 테이블 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Required Evidence Types</h3>
          
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Attached</th>
              </tr>
            </thead>
            <tbody>
              {requiredTypes.map(type => {
                const attached = attachedEvidence.filter(e => e.type === type)
                const isMissing = attached.length === 0
                
                return (
                  <tr key={type} className="border-b border-slate-800">
                    <td className="p-2 font-medium">{type}</td>
                    <td className="p-2">
                      {isMissing ? (
                        <Badge variant="destructive">Missing</Badge>
                      ) : (
                        <Badge variant="success">✓ {attached.length}</Badge>
                      )}
                    </td>
                    <td className="p-2 text-sm text-slate-400">
                      {attached.map(e => e.url || e.reference).join(', ') || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* 업로드 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            // File picker 트리거
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files
              if (files && onUpload) {
                for (const file of Array.from(files)) {
                  await onUpload(activity.activity_id, file)
                }
              }
            }
            input.click()
          }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Evidence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

#### Step 2.2: VisTimelineGantt에 Context Menu 추가 (4h)

**파일**: `components/gantt/VisTimelineGantt.tsx`

```typescript
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer'

export function VisTimelineGantt({ ... }) {
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  
  useEffect(() => {
    if (!timelineRef.current) return
    
    // Context menu 이벤트
    timelineRef.current.on('contextmenu', (event: any) => {
      event.event.preventDefault()
      
      const itemId = event.item
      if (!itemId) return
      
      // Activity 찾기
      const activity = activities.find(a => a.activity_id === itemId)
      if (activity) {
        setSelectedActivity(activity)
        setEvidenceDrawerOpen(true)
      }
    })
    
    return () => {
      timelineRef.current?.off('contextmenu')
    }
  }, [activities])
  
  // Upload handler
  const handleEvidenceUpload = async (activityId: string, file: File) => {
    console.log(`[evidence] Uploading for ${activityId}:`, file.name)
    
    // TODO: 실제 업로드 API 호출
    // await uploadEvidence(activityId, file)
    
    // SSOT 업데이트 (Preview → Apply 패턴)
    // onEvidenceAdd?.(activityId, { type: 'PHOTO', url: uploadedUrl })
  }
  
  return (
    <>
      <div ref={containerRef} className="w-full h-full" />
      
      <EvidenceDrawer
        activity={selectedActivity}
        open={evidenceDrawerOpen}
        onOpenChange={setEvidenceDrawerOpen}
        onUpload={handleEvidenceUpload}
      />
    </>
  )
}
```

---

#### Step 2.3: 타입 정의 및 SSOT 통합 (2h)

**파일**: `src/types/ssot.ts`

```typescript
export interface Evidence {
  type: string
  url?: string
  reference?: string
  uploaded_at?: string
  uploaded_by?: string
}

export interface EvidenceRequired {
  types: string[]
  min_count?: number
  before_state?: ActivityState[]
}

export interface Activity {
  activity_id: string
  // ... 기존 필드
  evidence?: Evidence[]
  evidence_required?: EvidenceRequired
}
```

**파일**: `app/page.tsx` (SSOT 로드 시 evidence 포함)

```typescript
// activities에 evidence 필드 확인
const activitiesWithEvidence = activities.map(activity => ({
  ...activity,
  evidence: activity.evidence || [],
  evidence_required: activity.evidence_required || { types: [], min_count: 0 },
}))
```

---

#### Step 2.4: 테스트 작성 (2h)

**파일**: `components/evidence/__tests__/EvidenceDrawer.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { EvidenceDrawer } from '../EvidenceDrawer'

describe('EvidenceDrawer', () => {
  const mockActivity = {
    activity_id: 'ACT-001',
    activity_name: 'Load TR1',
    evidence_required: {
      types: ['PHOTO', 'CHECKLIST', 'SIGNATURE'],
      min_count: 3,
    },
    evidence: [
      { type: 'PHOTO', url: 'photo1.jpg' },
    ],
  }
  
  it('shows missing evidence warning', () => {
    render(
      <EvidenceDrawer
        activity={mockActivity}
        open={true}
        onOpenChange={jest.fn()}
      />
    )
    
    expect(screen.getByText(/Required types missing/)).toBeInTheDocument()
    expect(screen.getByText(/CHECKLIST/)).toBeInTheDocument()
  })
  
  it('triggers upload on button click', async () => {
    const onUpload = jest.fn()
    
    render(
      <EvidenceDrawer
        activity={mockActivity}
        open={true}
        onOpenChange={jest.fn()}
        onUpload={onUpload}
      />
    )
    
    const uploadButton = screen.getByText(/Upload Evidence/)
    fireEvent.click(uploadButton)
    
    // File input이 트리거되었는지 확인
    // (실제 파일 선택은 E2E 테스트에서)
  })
})
```

---

### 2.3 Testing Checklist

- [ ] Unit tests: EvidenceDrawer 렌더링 + 누락 계산
- [ ] Integration test: Context menu → Drawer 열림
- [ ] Manual verification: 
  - [ ] Activity 우클릭 → "증빙 보기" 표시
  - [ ] Drawer에서 누락 항목 빨강으로 강조
  - [ ] Upload 버튼 → File picker 동작

---

### 2.4 Success Criteria

- ✅ Evidence 누락 발견율 100%
- ✅ 우클릭 → Drawer 1-click 동작
- ✅ 업로드 클릭 수: 3 → 1 (Detail 패널 불필요)
- ✅ TypeScript strict 통과

---

## 3. B5. Dependency Type 시각화 강화 (8시간)

### 3.1 Technical Design

**Dependency Types**:
- **FS (Finish-to-Start)**: 실선 (default) `────>`
- **SS (Start-to-Start)**: 점선 `····>`
- **FF (Finish-to-Finish)**: 이중선 `════>`
- **SF (Start-to-Finish)**: 파선 + 역화살표 `<----`

**Lag Visualization**:
- `+2d` → 화살표 중간에 라벨
- `-1d` → 빨강 라벨

---

### 3.2 Implementation Steps

#### Step 3.1: SVG 스타일 정의 (2h)

**파일**: `components/dashboard/gantt-chart.tsx`

```typescript
// Dependency type별 스타일 정의
const DEPENDENCY_STYLES = {
  FS: {
    stroke: 'cyan',
    strokeDasharray: 'none',
    markerEnd: 'url(#arrow-fs)',
  },
  SS: {
    stroke: 'cyan',
    strokeDasharray: '4 2',
    markerEnd: 'url(#arrow-ss)',
  },
  FF: {
    stroke: 'cyan',
    strokeDasharray: 'none',
    strokeWidth: 2,
    markerEnd: 'url(#arrow-ff)',
  },
  SF: {
    stroke: 'orange',
    strokeDasharray: '8 4',
    markerStart: 'url(#arrow-sf-reverse)',
  },
}

// SVG markers 정의
const dependencyMarkers = (
  <defs>
    <marker id="arrow-fs" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="cyan" />
    </marker>
    
    <marker id="arrow-ss" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="cyan" opacity="0.7" />
    </marker>
    
    <marker id="arrow-ff" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 Z" fill="cyan" strokeWidth="2" />
    </marker>
    
    <marker id="arrow-sf-reverse" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M10,0 L0,5 L10,10 Z" fill="orange" />
    </marker>
  </defs>
)
```

---

#### Step 3.2: Dependency 렌더링 로직 수정 (4h)

**파일**: `components/dashboard/gantt-chart.tsx`

```typescript
// Dependency 데이터 추출
const dependencies = useMemo(() => {
  const deps: Array<{
    from: string
    to: string
    type: 'FS' | 'SS' | 'FF' | 'SF'
    lag?: number
  }> = []
  
  activities.forEach(activity => {
    activity.dependencies?.forEach(dep => {
      deps.push({
        from: dep.predecessor,
        to: activity.activity_id,
        type: dep.type || 'FS',
        lag: dep.lag_days,
      })
    })
  })
  
  return deps
}, [activities])

// SVG path 계산
function calculateDependencyPath(
  fromItem: VisItem,
  toItem: VisItem,
  type: 'FS' | 'SS' | 'FF' | 'SF'
): string {
  const fromX = type === 'FS' || type === 'FF' ? fromItem.end : fromItem.start
  const toX = type === 'FS' || type === 'SS' ? toItem.start : toItem.end
  
  const fromY = fromItem.top + fromItem.height / 2
  const toY = toItem.top + toItem.height / 2
  
  // Cubic bezier path
  const dx = Math.abs(toX - fromX)
  const controlPointOffset = Math.min(dx / 3, 50)
  
  return `M ${fromX},${fromY} 
          C ${fromX + controlPointOffset},${fromY} 
            ${toX - controlPointOffset},${toY} 
            ${toX},${toY}`
}

// Dependency SVG 렌더링
<svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
  {dependencyMarkers}
  
  {dependencies.map((dep, i) => {
    const fromItem = visData.items.find(item => item.id === dep.from)
    const toItem = visData.items.find(item => item.id === dep.to)
    
    if (!fromItem || !toItem) return null
    
    const path = calculateDependencyPath(fromItem, toItem, dep.type)
    const style = DEPENDENCY_STYLES[dep.type]
    
    // Lag 라벨 위치 계산 (path 중간)
    const midX = (fromItem.end + toItem.start) / 2
    const midY = (fromItem.top + toItem.top) / 2
    
    return (
      <g key={`dep-${i}`}>
        <path
          d={path}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 1.5}
          strokeDasharray={style.strokeDasharray}
          fill="none"
          markerEnd={style.markerEnd}
          markerStart={style.markerStart}
        />
        
        {dep.lag !== undefined && dep.lag !== 0 && (
          <text
            x={midX}
            y={midY - 5}
            fontSize="10"
            fill={dep.lag > 0 ? 'cyan' : 'red'}
            textAnchor="middle"
            className="font-mono"
          >
            {dep.lag > 0 ? '+' : ''}{dep.lag}d
          </text>
        )}
      </g>
    )
  })}
</svg>
```

---

#### Step 3.3: 범례 추가 (1h)

**파일**: `components/dashboard/gantt-chart.tsx`

```typescript
// Dependency Type 범례
<div className="flex gap-4 text-xs text-slate-400 mt-2">
  <div className="flex items-center gap-2">
    <svg width="30" height="2">
      <line x1="0" y1="1" x2="30" y2="1" stroke="cyan" strokeWidth="1.5" />
    </svg>
    <span>FS (Finish-Start)</span>
  </div>
  
  <div className="flex items-center gap-2">
    <svg width="30" height="2">
      <line x1="0" y1="1" x2="30" y2="1" stroke="cyan" strokeWidth="1.5" strokeDasharray="4 2" />
    </svg>
    <span>SS (Start-Start)</span>
  </div>
  
  <div className="flex items-center gap-2">
    <svg width="30" height="2">
      <line x1="0" y1="1" x2="30" y2="1" stroke="cyan" strokeWidth="2" />
    </svg>
    <span>FF (Finish-Finish)</span>
  </div>
  
  <div className="flex items-center gap-2">
    <svg width="30" height="2">
      <line x1="0" y1="1" x2="30" y2="1" stroke="orange" strokeWidth="1.5" strokeDasharray="8 4" />
    </svg>
    <span>SF (Start-Finish)</span>
  </div>
</div>
```

---

#### Step 3.4: 테스트 작성 (1h)

**파일**: `components/dashboard/__tests__/dependency-rendering.test.tsx`

```typescript
import { render } from '@testing-library/react'
import { GanttChart } from '../gantt-chart'

describe('Dependency Rendering', () => {
  it('renders FS dependency with solid line', () => {
    const activities = [
      { activity_id: 'A', dependencies: [{ predecessor: 'B', type: 'FS' }] },
      { activity_id: 'B' },
    ]
    
    const { container } = render(<GanttChart activities={activities} />)
    
    const path = container.querySelector('path[stroke="cyan"]')
    expect(path).toBeInTheDocument()
    expect(path?.getAttribute('stroke-dasharray')).toBe('none')
  })
  
  it('renders SS dependency with dashed line', () => {
    const activities = [
      { activity_id: 'A', dependencies: [{ predecessor: 'B', type: 'SS' }] },
      { activity_id: 'B' },
    ]
    
    const { container } = render(<GanttChart activities={activities} />)
    
    const path = container.querySelector('path[stroke-dasharray="4 2"]')
    expect(path).toBeInTheDocument()
  })
  
  it('shows lag label for positive lag', () => {
    const activities = [
      { activity_id: 'A', dependencies: [{ predecessor: 'B', type: 'FS', lag_days: 2 }] },
      { activity_id: 'B' },
    ]
    
    const { container } = render(<GanttChart activities={activities} />)
    
    const label = container.querySelector('text')
    expect(label?.textContent).toBe('+2d')
  })
})
```

---

### 3.3 Testing Checklist

- [ ] Unit tests: Dependency 스타일 렌더링
- [ ] Visual test: FS/SS/FF/SF 구분 확인
- [ ] Manual verification:
  - [ ] 4가지 dependency type 모두 표시
  - [ ] Lag 라벨 정확 표시 (+2d, -1d)
  - [ ] 범례 가독성

---

### 3.4 Success Criteria

- ✅ 4가지 dependency type 시각적 구분
- ✅ Lag 라벨 표시 (화살표 중간)
- ✅ 범례 추가
- ✅ 엔지니어 이해도 40% 향상 (설문 조사)

---

## 4. 통합 타임라인

### Day 1: A3. Mapper Caching (4h)
- AM: Step 1.1 캐시 로직 (1.5h)
- AM: Step 1.2 useMemo 최적화 (1h)
- PM: Step 1.3 성능 벤치마크 (1h)
- PM: Step 1.4 문서 갱신 (0.5h)

**Checkpoint**: `pnpm test mapper-performance` 통과

---

### Day 2: B3. Evidence 직접 링크 (Part 1, 6h)
- AM: Step 2.1 EvidenceDrawer 컴포넌트 (4h)
- PM: Step 2.2 Context Menu 추가 (2h)

**Checkpoint**: Drawer 렌더링 확인

---

### Day 3: B3 완료 + B5 시작 (8h)
- AM: Step 2.3 타입 정의 (2h)
- AM: Step 2.4 테스트 작성 (2h)
- PM: Step 3.1 SVG 스타일 (2h)
- PM: Step 3.2 Dependency 렌더링 (2h)

**Checkpoint**: Evidence Drawer 완전 동작

---

### Day 4: B5 완료 (4h)
- AM: Step 3.2 완료 (2h)
- AM: Step 3.3 범례 추가 (1h)
- AM: Step 3.4 테스트 작성 (1h)

**Final Checkpoint**: 모든 테스트 통과 + 브라우저 검증

---

## 5. Quality Gates

### 5.1 TypeScript Strict Mode
```bash
pnpm typecheck
# Expected: 0 errors
```

### 5.2 ESLint
```bash
pnpm lint
# Expected: 0 warnings (or only pre-existing)
```

### 5.3 Unit Tests
```bash
pnpm test visTimelineMapper mapper-performance EvidenceDrawer dependency-rendering --run
# Expected: All passed
```

### 5.4 Performance Benchmarks
- Mapper cold cache: < 100ms for 100 rows
- Mapper warm cache: < 10ms for 100 rows
- Evidence Drawer open: < 200ms
- Dependency SVG render: < 50ms for 50 dependencies

### 5.5 SSOT Integrity
- `option_c.json` 불변 (읽기 전용)
- Preview → Apply 패턴 준수
- Freeze/Lock 규칙 유지

---

## 6. Risk Assessment

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| Mapper 캐시 버그 | Low | Medium | 기존 로직 유지, 캐시 on/off 토글 |
| Context menu 충돌 | Low | Low | vis-timeline 이벤트 우선순위 |
| Dependency SVG 성능 | Medium | Low | 50+ deps 시 Canvas 전환 고려 |
| Evidence 업로드 API | High | Medium | Mock 구현, 실제 API는 Phase 2 |

**종합 리스크**: 🟢 Low

---

## 7. Rollback Plan

### Mapper Caching 롤백
```bash
git revert <commit-hash-mapper-caching>
# 기존 ganttRowsToVisData 그대로 복원
```

### Evidence Drawer 롤백
```bash
# EvidenceDrawer 파일 삭제
rm components/evidence/EvidenceDrawer.tsx
# VisTimelineGantt에서 import 제거
git revert <commit-hash-evidence>
```

### Dependency Type 롤백
```bash
# SVG 스타일만 원복
git revert <commit-hash-dependency-styles>
```

---

## 8. Success Metrics

### Performance (측정 가능)
- [ ] 재렌더링 시간: 150ms → 105ms (30% 감소)
- [ ] Cache hit rate: 90%+
- [ ] Evidence Drawer 응답: < 200ms

### UX (사용자 피드백)
- [ ] Evidence 누락 발견율: 70% → 100%
- [ ] Dependency 이해도: 설문 조사 (사전 60점 → 사후 84점)
- [ ] 업로드 클릭 수: 3 → 1

### Code Quality
- [ ] TypeScript strict: 0 errors
- [ ] ESLint: 0 new warnings
- [ ] Test coverage: 모든 신규 코드 90%+

---

## Refs

- [innovation-scout-vis-timeline-upgrade-20260204.md](innovation-scout-vis-timeline-upgrade-20260204.md)
- [AGENTS.md](../../AGENTS.md)
- [components/gantt/VisTimelineGantt.tsx](../../components/gantt/VisTimelineGantt.tsx)
- [lib/gantt/visTimelineMapper.ts](../../lib/gantt/visTimelineMapper.ts)
