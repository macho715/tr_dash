---
doc_id: gantt-data-density-implementation-plan
created: 2026-02-05
refs: [AGENTS.md, patch.md, components/gantt/VisTimelineGantt.tsx, lib/gantt/visTimelineMapper.ts, timeline-data-density-features-plan.md]
status: ready_for_implementation
---

# Gantt Data Density & Visualization Upgrade (12–15) — vis-timeline Focus

**생성일**: 2026-02-05  
**프로젝트**: TR 이동 대시보드  
**범위**: vis-timeline Gantt 4개 기능 구현

---

## Summary

Implement four density/UX upgrades in the vis-timeline Gantt:

1. **Auto swimlane grouping** (TR → Phase → Resource) with collapsible lanes and critical/blocked filters.
2. **Mini-map navigator** with viewport highlight and click/drag navigation.
3. **Rich activity hover card** (status/progress/owner/evidence preview + quick actions).
4. **Density heatmap background toggle** (1-day activity overlap count).

**Custom Gantt path** remains functional but with minimal or no feature parity (per scope choice). All changes remain **derived-only** (SSOT untouched).

---

## Key Decisions Locked

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Engine target** | vis-timeline only | Custom gantt not in scope for feature parity |
| **Grouping order** | TR → Phase → Resource | Matches operational hierarchy |
| **Filters** | Placed in TimelineControls | Centralized control location |
| **Heatmap metric** | 1-day bucket, activity count | Simple overlap detection |
| **Critical definition** | `slack=0` | From existing slackMap calculation |
| **Blocked definition** | `activity.status === "blocked"` | SSOT Activity.state |
| **Mini-map interaction** | Click to jump + drag to pan | Standard timeline navigation |
| **Hover card mode** | Read-only preview + quick actions | No inline editing |

---

## Interfaces / API Changes

### 1) VisTimelineGantt.tsx

**New Props**:
```typescript
interface VisTimelineGanttProps {
  // ... existing props
  
  /** Hover events for activity hover card */
  onItemHover?: (payload: { id: string; x: number; y: number }) => void
  onItemBlur?: () => void
  
  /** Group interaction */
  onGroupClick?: (groupId: string) => void
  
  // onRangeChange already exists (used by mini-map)
}
```

**Extended Handle**:
```typescript
export interface VisTimelineGanttHandle {
  // ... existing methods
  
  /** Set window range with optional animation */
  setWindow: (start: Date, end: Date, opts?: { animation?: boolean }) => void
}
```

### 2) gantt-chart.tsx

**New Props**:
```typescript
interface GanttChartProps {
  // ... existing props
  
  /** Optional SSOT for evidence preview map */
  ssot?: OptionC | null
  
  /** Quick action callbacks */
  onOpenEvidence?: (activityId: string) => void
  onOpenHistory?: (activityId: string) => void
}
```

### 3) timeline-controls.tsx

**Extended Props**:
```typescript
interface TimelineControlsProps {
  // ... existing props
  
  /** Filters state */
  filters: {
    criticalOnly: boolean
    blockedOnly: boolean
  }
  onFiltersChange: (filters: TimelineFilters) => void
  
  /** Grouping state */
  grouping: {
    enabled: boolean
    collapsed: Set<string>  // group IDs that are collapsed
  }
  onCollapseAll?: () => void
  onExpandAll?: () => void
  
  /** Heatmap toggle */
  heatmapEnabled: boolean
  onHeatmapToggle: () => void
}
```

---

## Implementation Plan

### 12. Swimlane Auto-Grouping + Collapse/Expand + Filters

**Goal**: Show 7 trips in one view and reduce cognitive load.

#### 12.1 Grouping Helpers (New Utility Module)

Create `lib/gantt/grouping.ts`:

```typescript
/**
 * Grouping utility for vis-timeline Gantt
 * 
 * Hierarchy: TR → Phase → Resource
 */

import type { GanttRow } from "@/lib/dashboard-data"
import type { VisGroup, VisItem } from "@/lib/gantt/visTimelineMapper"

export interface GroupingOptions {
  mode: "flat" | "by_tr" | "by_phase" | "by_resource" | "full_hierarchy"
  collapsedGroupIds?: Set<string>
}

export interface GroupTreeResult {
  groups: VisGroup[]
  items: VisItem[]
  activityToGroupMap: Map<string, string>  // activityId → groupId
}

/**
 * Get phase label from activity
 * Priority: anchor_type → level1
 */
export function getPhaseLabel(activity: GanttRow): string {
  const anchorTypeMap: Record<string, string> = {
    'LOADOUT': 'Loadout',
    'SAIL_AWAY': 'Sail Away',
    'LOADIN': 'Load-In',
    'TURNING': 'Turning',
    'JACKDOWN': 'Jack-Down',
  }
  
  if (activity.anchor_type && anchorTypeMap[activity.anchor_type]) {
    return anchorTypeMap[activity.anchor_type]
  }
  
  return activity.level1 || 'Unknown Phase'
}

/**
 * Get TR label from activity
 * Priority: tr_unit_id → level1
 */
export function getTrLabel(activity: GanttRow): string {
  if (activity.tr_unit_id) {
    return activity.tr_unit_id
  }
  
  // Fallback: extract from level1 if it contains "TR"
  if (activity.level1?.includes('TR')) {
    return activity.level1
  }
  
  return 'TR Unknown'
}

/**
 * Get resource label from activity
 * Priority: resource_tags[0] → "Unassigned"
 */
export function getResourceLabel(activity: GanttRow): string {
  if (activity.resource_tags && activity.resource_tags.length > 0) {
    return activity.resource_tags[0]
  }
  
  return 'Unassigned'
}

/**
 * Build group tree for vis-timeline
 */
export function buildGroupTree(
  activities: GanttRow[],
  options: GroupingOptions
): GroupTreeResult {
  if (options.mode === "flat") {
    // No grouping - existing behavior
    return buildFlatGroups(activities)
  }
  
  if (options.mode === "full_hierarchy") {
    return buildFullHierarchy(activities, options.collapsedGroupIds)
  }
  
  // Single-level grouping
  return buildSingleLevelGroups(activities, options.mode)
}

/**
 * Build full TR → Phase → Resource hierarchy
 */
function buildFullHierarchy(
  activities: GanttRow[],
  collapsedGroupIds?: Set<string>
): GroupTreeResult {
  const groups: VisGroup[] = []
  const items: VisItem[] = []
  const activityToGroupMap = new Map<string, string>()
  
  // Group by TR
  const trMap = new Map<string, GanttRow[]>()
  activities.forEach(activity => {
    const trLabel = getTrLabel(activity)
    if (!trMap.has(trLabel)) {
      trMap.set(trLabel, [])
    }
    trMap.get(trLabel)!.push(activity)
  })
  
  let trOrder = 0
  trMap.forEach((trActivities, trLabel) => {
    const trGroupId = `tr-${trLabel}`
    
    // TR group (level 1)
    groups.push({
      id: trGroupId,
      content: trLabel,
      order: trOrder++,
      nestedGroups: [],
    })
    
    // Group by Phase within TR
    const phaseMap = new Map<string, GanttRow[]>()
    trActivities.forEach(activity => {
      const phaseLabel = getPhaseLabel(activity)
      if (!phaseMap.has(phaseLabel)) {
        phaseMap.set(phaseLabel, [])
      }
      phaseMap.get(phaseLabel)!.push(activity)
    })
    
    let phaseOrder = 0
    phaseMap.forEach((phaseActivities, phaseLabel) => {
      const phaseGroupId = `${trGroupId}-phase-${phaseLabel}`
      
      // Phase group (level 2)
      groups.push({
        id: phaseGroupId,
        content: phaseLabel,
        order: phaseOrder++,
        nestedGroups: [trGroupId],  // Nested under TR
      })
      
      // Group by Resource within Phase
      const resourceMap = new Map<string, GanttRow[]>()
      phaseActivities.forEach(activity => {
        const resourceLabel = getResourceLabel(activity)
        if (!resourceMap.has(resourceLabel)) {
          resourceMap.set(resourceLabel, [])
        }
        resourceMap.get(resourceLabel)!.push(activity)
      })
      
      let resourceOrder = 0
      resourceMap.forEach((resourceActivities, resourceLabel) => {
        const resourceGroupId = `${phaseGroupId}-res-${resourceLabel}`
        
        // Resource group (level 3 - leaf)
        groups.push({
          id: resourceGroupId,
          content: resourceLabel,
          order: resourceOrder++,
          nestedGroups: [phaseGroupId],  // Nested under Phase
        })
        
        // Add activities to this leaf group
        resourceActivities.forEach(activity => {
          items.push({
            id: activity.id,
            group: resourceGroupId,
            content: activity.label,
            start: new Date(activity.planned_start),
            end: new Date(activity.planned_finish),
            type: "range",
            className: getActivityClassName(activity),
            title: getActivityTitle(activity),
          })
          
          activityToGroupMap.set(activity.id, resourceGroupId)
        })
      })
    })
  })
  
  // Apply collapse logic
  if (collapsedGroupIds && collapsedGroupIds.size > 0) {
    return applyCollapseLogic(groups, items, collapsedGroupIds)
  }
  
  return { groups, items, activityToGroupMap }
}

/**
 * Apply collapse logic: hide nested groups/items
 */
function applyCollapseLogic(
  groups: VisGroup[],
  items: VisItem[],
  collapsedGroupIds: Set<string>
): GroupTreeResult {
  // Build parent map
  const parentMap = new Map<string, string>()
  groups.forEach(g => {
    if (g.nestedGroups && g.nestedGroups.length > 0) {
      parentMap.set(g.id, g.nestedGroups[0])
    }
  })
  
  // Find all collapsed descendants
  const hiddenGroups = new Set<string>()
  collapsedGroupIds.forEach(collapsedId => {
    groups.forEach(g => {
      if (isDescendant(g.id, collapsedId, parentMap)) {
        hiddenGroups.add(g.id)
      }
    })
  })
  
  // Filter out hidden groups and items
  const visibleGroups = groups.filter(g => !hiddenGroups.has(g.id))
  const visibleItems = items.filter(item => !hiddenGroups.has(item.group))
  
  // Build new activity map
  const activityToGroupMap = new Map<string, string>()
  visibleItems.forEach(item => {
    activityToGroupMap.set(item.id, item.group)
  })
  
  return {
    groups: visibleGroups,
    items: visibleItems,
    activityToGroupMap,
  }
}

/**
 * Check if groupId is descendant of ancestorId
 */
function isDescendant(
  groupId: string,
  ancestorId: string,
  parentMap: Map<string, string>
): boolean {
  let current: string | undefined = groupId
  while (current) {
    if (current === ancestorId) {
      return true
    }
    current = parentMap.get(current)
  }
  return false
}

// Helper: existing logic
function getActivityClassName(activity: GanttRow): string {
  // Based on state, collision, etc.
  return "gantt-activity"
}

function getActivityTitle(activity: GanttRow): string {
  return `${activity.label} (${activity.planned_start} - ${activity.planned_finish})`
}

// ... buildFlatGroups, buildSingleLevelGroups implementations
```

#### 12.2 Collapse/Expand Logic

**In gantt-chart.tsx**:

```typescript
const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())

// Build groups with collapse state
const groupTreeResult = useMemo(() => {
  return buildGroupTree(filteredActivities, {
    mode: groupingMode,
    collapsedGroupIds,
  })
}, [filteredActivities, groupingMode, collapsedGroupIds])

// Collapse/Expand handlers
const handleCollapseAll = () => {
  // Find all parent groups (groups with nestedGroups)
  const parentGroups = groupTreeResult.groups
    .filter(g => g.nestedGroups && g.nestedGroups.length === 0)
    .map(g => g.id)
  setCollapsedGroupIds(new Set(parentGroups))
}

const handleExpandAll = () => {
  setCollapsedGroupIds(new Set())
}

const handleGroupClick = (groupId: string) => {
  setCollapsedGroupIds(prev => {
    const next = new Set(prev)
    if (next.has(groupId)) {
      next.delete(groupId)
    } else {
      next.add(groupId)
    }
    return next
  })
}
```

**vis-timeline group template** (if supported):

```typescript
// In VisTimelineGantt.tsx options
const options = {
  // ...
  groupTemplate: (group: VisGroup) => {
    const isCollapsed = collapsedGroupIds.has(group.id)
    const hasNested = group.nestedGroups && group.nestedGroups.length > 0
    
    if (!hasNested) {
      return group.content
    }
    
    return `
      <div class="group-header" data-group-id="${group.id}">
        <button class="collapse-btn">
          ${isCollapsed ? "▶" : "▼"}
        </button>
        <span class="group-name">${group.content}</span>
      </div>
    `
  }
}
```

#### 12.3 Critical/Blocked Filters

**In gantt-chart.tsx**:

```typescript
const [filters, setFilters] = useState({
  criticalOnly: false,
  blockedOnly: false,
})

// Apply filters
const filteredActivities = useMemo(() => {
  let result = activities
  
  if (filters.criticalOnly) {
    result = result.filter(a => {
      const slack = slackMap.get(a.id)
      return slack && slack.slackDays === 0
    })
  }
  
  if (filters.blockedOnly) {
    result = result.filter(a => a.status === "blocked")
  }
  
  return result
}, [activities, filters, slackMap])
```

**In timeline-controls.tsx**:

```tsx
<div className="flex gap-2">
  <Toggle
    pressed={filters.criticalOnly}
    onPressedChange={(pressed) => 
      onFiltersChange({ ...filters, criticalOnly: pressed })
    }
  >
    Critical Only
  </Toggle>
  
  <Toggle
    pressed={filters.blockedOnly}
    onPressedChange={(pressed) =>
      onFiltersChange({ ...filters, blockedOnly: pressed })
    }
  >
    Blocked Only
  </Toggle>
</div>
```

#### 12.4 Custom Gantt Fallback

```typescript
// In gantt-chart.tsx
if (!useVisEngine) {
  // Custom gantt mode: only apply filters, no grouping
  const filteredRows = applyFiltersOnly(rows, filters)
  return <CustomGanttView rows={filteredRows} />
}
```

---

### 13. Mini-Map Navigator (Bottom Right)

**Goal**: 70% faster navigation on long timelines.

#### 13.1 Component: GanttMiniMap.tsx

```typescript
// components/gantt/GanttMiniMap.tsx

import { useRef, useEffect, useState } from "react"
import type { GanttRow } from "@/lib/dashboard-data"

interface GanttMiniMapProps {
  activities: GanttRow[]
  projectStart: Date
  projectEnd: Date
  visibleRange: { start: Date; end: Date }
  onWindowChange: (range: { start: Date; end: Date }) => void
  visible: boolean
}

export function GanttMiniMap({
  activities,
  projectStart,
  projectEnd,
  visibleRange,
  onWindowChange,
  visible,
}: GanttMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Render minimap
  useEffect(() => {
    if (!visible) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')!
    const width = 200
    const height = 80
    
    canvas.width = width
    canvas.height = height
    
    // Clear
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)
    
    // Calculate density buckets (1-day)
    const buckets = calculateDensityBuckets(activities, projectStart, projectEnd)
    const maxDensity = Math.max(...buckets, 1)
    
    // Draw density heatline
    buckets.forEach((count, i) => {
      const x = (i / buckets.length) * width
      const w = width / buckets.length
      const intensity = count / maxDensity
      
      ctx.fillStyle = getDensityColor(intensity)
      ctx.fillRect(x, 0, w, height)
    })
    
    // Draw viewport rectangle
    const vpStart = timeToX(visibleRange.start, projectStart, projectEnd, width)
    const vpEnd = timeToX(visibleRange.end, projectStart, projectEnd, width)
    
    ctx.strokeStyle = 'blue'
    ctx.lineWidth = 2
    ctx.strokeRect(vpStart, 0, vpEnd - vpStart, height)
    
  }, [activities, projectStart, projectEnd, visibleRange, visible])
  
  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    const clickedTime = xToTime(x, canvas.width, projectStart, projectEnd)
    
    // Center viewport on clicked time
    const duration = visibleRange.end.getTime() - visibleRange.start.getTime()
    const newStart = new Date(clickedTime.getTime() - duration / 2)
    const newEnd = new Date(clickedTime.getTime() + duration / 2)
    
    onWindowChange({ start: newStart, end: newEnd })
  }
  
  // Drag handlers
  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    
    // Calculate delta and pan
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const deltaX = e.movementX
    
    const totalDuration = projectEnd.getTime() - projectStart.getTime()
    const deltaTime = (deltaX / canvas.width) * totalDuration
    
    const newStart = new Date(visibleRange.start.getTime() + deltaTime)
    const newEnd = new Date(visibleRange.end.getTime() + deltaTime)
    
    onWindowChange({ start: newStart, end: newEnd })
  }
  
  if (!visible) return null
  
  return (
    <div className="absolute bottom-4 right-4 border rounded shadow-lg bg-white p-2 z-10">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="cursor-pointer"
        style={{ width: 200, height: 80 }}
      />
    </div>
  )
}

// Helper functions
function calculateDensityBuckets(
  activities: GanttRow[],
  projectStart: Date,
  projectEnd: Date
): number[] {
  const days = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
  const buckets = new Array(days).fill(0)
  
  activities.forEach(activity => {
    const startDay = Math.floor((new Date(activity.planned_start).getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    const endDay = Math.floor((new Date(activity.planned_finish).getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let i = Math.max(0, startDay); i <= Math.min(days - 1, endDay); i++) {
      buckets[i]++
    }
  })
  
  return buckets
}

function getDensityColor(intensity: number): string {
  if (intensity < 0.33) return 'rgba(34, 197, 94, 0.3)'   // green
  if (intensity < 0.66) return 'rgba(234, 179, 8, 0.3)'   // yellow
  if (intensity < 0.85) return 'rgba(249, 115, 22, 0.3)'  // orange
  return 'rgba(239, 68, 68, 0.3)'                         // red
}

function timeToX(time: Date, start: Date, end: Date, width: number): number {
  const ratio = (time.getTime() - start.getTime()) / (end.getTime() - start.getTime())
  return ratio * width
}

function xToTime(x: number, width: number, start: Date, end: Date): Date {
  const ratio = x / width
  return new Date(start.getTime() + ratio * (end.getTime() - start.getTime()))
}
```

#### 13.2 Integration in gantt-chart.tsx

```typescript
const [visibleRange, setVisibleRange] = useState({
  start: PROJECT_START,
  end: addDays(PROJECT_START, 14)
})

const handleRangeChange = (range: { start: Date; end: Date }) => {
  setVisibleRange(range)
}

const handleMiniMapWindowChange = (range: { start: Date; end: Date }) => {
  visTimelineRef.current?.setWindow(range.start, range.end, { animation: true })
}

return (
  <div className="relative">
    <VisTimelineGantt
      ref={visTimelineRef}
      onRangeChange={handleRangeChange}
      {...props}
    />
    <GanttMiniMap
      activities={activities}
      projectStart={PROJECT_START}
      projectEnd={PROJECT_END}
      visibleRange={visibleRange}
      onWindowChange={handleMiniMapWindowChange}
      visible={miniMapEnabled}
    />
  </div>
)
```

---

### 14. Activity Thumbnail Hover + Quick Actions

**Goal**: Reduce detail panel ping-pong.

#### 14.1 Hover Events in VisTimelineGantt.tsx

```typescript
// In VisTimelineGantt.tsx
useEffect(() => {
  if (!timelineRef.current) return
  
  const timeline = timelineRef.current
  
  // Item hover
  timeline.on('itemover', (properties: any) => {
    const activityId = properties.item as string
    const event = properties.event as MouseEvent
    
    onItemHover?.({
      id: activityId,
      x: event.clientX,
      y: event.clientY,
    })
  })
  
  // Item out
  timeline.on('itemout', () => {
    onItemBlur?.()
  })
  
  return () => {
    timeline.off('itemover')
    timeline.off('itemout')
  }
}, [onItemHover, onItemBlur])
```

#### 14.2 Hover Card in gantt-chart.tsx

```typescript
// components/gantt/ActivityHoverCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GanttRow } from "@/lib/dashboard-data"
import type { OptionC } from "@/lib/ssot/types"

interface ActivityHoverCardProps {
  activity: GanttRow | null
  position: { x: number; y: number } | null
  ssot?: OptionC | null
  viewMode: "live" | "history" | "approval" | "compare"
  onEdit?: () => void
  onOpenEvidence?: () => void
  onOpenHistory?: () => void
  onClose?: () => void
}

export function ActivityHoverCard({
  activity,
  position,
  ssot,
  viewMode,
  onEdit,
  onOpenEvidence,
  onOpenHistory,
  onClose,
}: ActivityHoverCardProps) {
  if (!activity || !position) return null
  
  // Calculate progress
  const progress = calculateProgress(activity)
  
  // Evidence preview (from SSOT)
  const evidenceSummary = getEvidenceSummary(activity, ssot)
  
  return (
    <div
      className="fixed z-50"
      style={{ left: position.x + 10, top: position.y + 10 }}
    >
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{activity.label}</span>
            <Badge variant={getStatusVariant(activity.status)}>
              {activity.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Progress */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Progress</div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {progress}% complete
            </div>
          </div>
          
          {/* Owner/Resource */}
          <div>
            <div className="text-xs text-muted-foreground">Owner</div>
            <div className="text-sm">
              {activity.resource_tags?.[0] || "Unassigned"}
            </div>
          </div>
          
          {/* Evidence */}
          <div>
            <div className="text-xs text-muted-foreground">Evidence</div>
            <div className="text-sm">
              {evidenceSummary.attached} / {evidenceSummary.required} attached
              {evidenceSummary.missing > 0 && (
                <span className="text-amber-600 ml-2">
                  ({evidenceSummary.missing} missing)
                </span>
              )}
            </div>
          </div>
          
          {/* Dependencies */}
          {activity.dependencies && activity.dependencies.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Dependencies</div>
              <div className="text-sm">
                {activity.dependencies.length} dependency(ies)
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {viewMode === "live" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenEvidence}
              className="flex-1"
            >
              Evidence
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenHistory}
              className="flex-1"
            >
              History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function calculateProgress(activity: GanttRow): number {
  if (activity.actual_finish) return 100
  
  if (activity.actual_start) {
    const now = Date.now()
    const start = new Date(activity.actual_start).getTime()
    const plannedEnd = new Date(activity.planned_finish).getTime()
    const elapsed = now - start
    const total = plannedEnd - start
    return Math.min(100, Math.round((elapsed / total) * 100))
  }
  
  return 0
}

function getEvidenceSummary(activity: GanttRow, ssot?: OptionC | null) {
  if (!ssot) {
    return { required: 0, attached: 0, missing: 0 }
  }
  
  const ssotActivity = ssot.entities.activities.find(a => a.id === activity.id)
  if (!ssotActivity) {
    return { required: 0, attached: 0, missing: 0 }
  }
  
  // Use checkEvidenceGate or similar logic
  const required = ssotActivity.evidence?.required_types?.length || 0
  const attached = ssotActivity.evidence?.items?.length || 0
  const missing = Math.max(0, required - attached)
  
  return { required, attached, missing }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "blocked") return "destructive"
  if (status === "in_progress") return "default"
  return "secondary"
}
```

#### 14.3 Integration in gantt-chart.tsx

```typescript
const [hoverCard, setHoverCard] = useState<{
  activityId: string
  position: { x: number; y: number }
} | null>(null)

const handleItemHover = (payload: { id: string; x: number; y: number }) => {
  setHoverCard({
    activityId: payload.id,
    position: { x: payload.x, y: payload.y },
  })
}

const handleItemBlur = () => {
  setHoverCard(null)
}

const handleQuickEdit = () => {
  if (!hoverCard) return
  onActivityClick?.(hoverCard.activityId)
  setHoverCard(null)
}

const handleQuickEvidence = () => {
  if (!hoverCard) return
  onOpenEvidence?.(hoverCard.activityId)
  setHoverCard(null)
}

const handleQuickHistory = () => {
  if (!hoverCard) return
  onOpenHistory?.(hoverCard.activityId)
  setHoverCard(null)
}

return (
  <>
    <VisTimelineGantt
      onItemHover={handleItemHover}
      onItemBlur={handleItemBlur}
      {...props}
    />
    
    <ActivityHoverCard
      activity={activities.find(a => a.id === hoverCard?.activityId) || null}
      position={hoverCard?.position || null}
      ssot={ssot}
      viewMode={viewMode}
      onEdit={handleQuickEdit}
      onOpenEvidence={handleQuickEvidence}
      onOpenHistory={handleQuickHistory}
      onClose={() => setHoverCard(null)}
    />
  </>
)
```

---

### 15. Gantt Density Heatmap Toggle

**Goal**: Reveal bottlenecks early.

#### 15.1 Density Calculation

```typescript
// lib/gantt/density.ts

export function calculateDensityBuckets(
  activities: GanttRow[],
  projectStart: Date,
  projectEnd: Date
): number[] {
  const days = Math.ceil(
    (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  const buckets = new Array(days).fill(0)
  
  activities.forEach(activity => {
    const startDay = Math.floor(
      (new Date(activity.planned_start).getTime() - projectStart.getTime()) /
      (1000 * 60 * 60 * 24)
    )
    const endDay = Math.floor(
      (new Date(activity.planned_finish).getTime() - projectStart.getTime()) /
      (1000 * 60 * 60 * 24)
    )
    
    for (let i = Math.max(0, startDay); i <= Math.min(days - 1, endDay); i++) {
      buckets[i]++
    }
  })
  
  return buckets
}

export function getDensityColor(intensity: number): string {
  // intensity: 0-1
  if (intensity < 0.33) return 'rgba(34, 197, 94, 0.2)'   // green-500
  if (intensity < 0.66) return 'rgba(234, 179, 8, 0.2)'   // yellow-500
  if (intensity < 0.85) return 'rgba(249, 115, 22, 0.2)'  // orange-500
  return 'rgba(239, 68, 68, 0.2)'                         // red-500
}
```

#### 15.2 Overlay Component

```typescript
// components/gantt/DensityHeatmapOverlay.tsx

import { useRef, useEffect } from "react"
import type { GanttRow } from "@/lib/dashboard-data"
import { calculateDensityBuckets, getDensityColor } from "@/lib/gantt/density"

interface DensityHeatmapOverlayProps {
  activities: GanttRow[]
  projectStart: Date
  projectEnd: Date
  visibleRange: { start: Date; end: Date }
  timelineElement: HTMLElement | null
  visible: boolean
}

export function DensityHeatmapOverlay({
  activities,
  projectStart,
  projectEnd,
  visibleRange,
  timelineElement,
  visible,
}: DensityHeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    if (!visible || !timelineElement) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = timelineElement.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Calculate density
    const buckets = calculateDensityBuckets(activities, projectStart, projectEnd)
    const maxDensity = Math.max(...buckets, 1)
    
    // Only render visible range
    const startDay = Math.floor(
      (visibleRange.start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const endDay = Math.ceil(
      (visibleRange.end.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    for (let i = startDay; i <= endDay; i++) {
      if (i < 0 || i >= buckets.length) continue
      
      const intensity = buckets[i] / maxDensity
      const x = ((i - startDay) / (endDay - startDay)) * canvas.width
      const w = canvas.width / (endDay - startDay)
      
      ctx.fillStyle = getDensityColor(intensity)
      ctx.fillRect(x, 0, w, canvas.height)
    }
    
  }, [activities, projectStart, projectEnd, visibleRange, timelineElement, visible])
  
  if (!visible) return null
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}
```

#### 15.3 Integration

```typescript
// In gantt-chart.tsx
const [heatmapEnabled, setHeatmapEnabled] = useState(false)

return (
  <div className="relative">
    <DensityHeatmapOverlay
      activities={activities}
      projectStart={PROJECT_START}
      projectEnd={PROJECT_END}
      visibleRange={visibleRange}
      timelineElement={visTimelineContainerRef.current}
      visible={heatmapEnabled}
    />
    <VisTimelineGantt
      ref={visTimelineRef}
      containerRef={visTimelineContainerRef}
      {...props}
    />
  </div>
)
```

#### 15.4 Toggle + Legend

```tsx
// In timeline-controls.tsx
<div className="flex items-center gap-2">
  <Toggle
    pressed={heatmapEnabled}
    onPressedChange={onHeatmapToggle}
    aria-label="Toggle density heatmap"
  >
    <LayersIcon className="h-4 w-4 mr-2" />
    Heatmap
  </Toggle>
  
  {heatmapEnabled && (
    <div className="flex items-center gap-1 text-xs">
      <div className="w-3 h-3 bg-green-500/20 border" />
      <span>Low</span>
      <div className="w-3 h-3 bg-yellow-500/20 border" />
      <span>Med</span>
      <div className="w-3 h-3 bg-orange-500/20 border" />
      <span>High</span>
      <div className="w-3 h-3 bg-red-500/20 border" />
      <span>Critical</span>
    </div>
  )}
</div>
```

---

## Tests

### Unit Tests (vitest)

#### 1. Grouping Builder

```typescript
// lib/gantt/__tests__/grouping.test.ts

import { describe, it, expect } from 'vitest'
import { buildGroupTree, getTrLabel, getPhaseLabel, getResourceLabel } from '../grouping'
import type { GanttRow } from '@/lib/dashboard-data'

describe('grouping', () => {
  it('should extract TR label from tr_unit_id', () => {
    const activity: Partial<GanttRow> = {
      tr_unit_id: 'TR1',
      level1: 'Prep',
    }
    expect(getTrLabel(activity as GanttRow)).toBe('TR1')
  })
  
  it('should fallback to level1 for TR label', () => {
    const activity: Partial<GanttRow> = {
      level1: 'TR2',
    }
    expect(getTrLabel(activity as GanttRow)).toBe('TR2')
  })
  
  it('should extract phase label from anchor_type', () => {
    const activity: Partial<GanttRow> = {
      anchor_type: 'LOADOUT',
      level1: 'Prep',
    }
    expect(getPhaseLabel(activity as GanttRow)).toBe('Loadout')
  })
  
  it('should extract resource label from resource_tags', () => {
    const activity: Partial<GanttRow> = {
      resource_tags: ['SPMT', 'Crane'],
    }
    expect(getResourceLabel(activity as GanttRow)).toBe('SPMT')
  })
  
  it('should build full hierarchy groups', () => {
    const activities: GanttRow[] = [
      {
        id: 'A1',
        tr_unit_id: 'TR1',
        anchor_type: 'LOADOUT',
        resource_tags: ['SPMT'],
        label: 'Activity 1',
        planned_start: '2026-01-01',
        planned_finish: '2026-01-02',
        // ... other required fields
      } as GanttRow,
      {
        id: 'A2',
        tr_unit_id: 'TR1',
        anchor_type: 'LOADOUT',
        resource_tags: ['Crane'],
        label: 'Activity 2',
        planned_start: '2026-01-03',
        planned_finish: '2026-01-04',
      } as GanttRow,
    ]
    
    const result = buildGroupTree(activities, { mode: 'full_hierarchy' })
    
    // Should have TR group, Phase group, 2 Resource groups
    expect(result.groups.length).toBe(4)
    
    // Should have 2 items
    expect(result.items.length).toBe(2)
    
    // Verify nesting
    const trGroup = result.groups.find(g => g.id === 'tr-TR1')
    expect(trGroup).toBeDefined()
    
    const phaseGroup = result.groups.find(g => g.id.includes('phase-Loadout'))
    expect(phaseGroup?.nestedGroups).toContain('tr-TR1')
  })
  
  it('should collapse groups correctly', () => {
    const activities: GanttRow[] = [
      // ... same as above
    ]
    
    const result = buildGroupTree(activities, {
      mode: 'full_hierarchy',
      collapsedGroupIds: new Set(['tr-TR1'])
    })
    
    // Only TR group should be visible (nested groups hidden)
    expect(result.groups.length).toBe(1)
    expect(result.items.length).toBe(0)
  })
})
```

#### 2. Filters

```typescript
// components/gantt/__tests__/filters.test.ts

describe('filters', () => {
  it('should filter critical activities only', () => {
    const activities: GanttRow[] = [
      { id: 'A1', /* ... */ } as GanttRow,
      { id: 'A2', /* ... */ } as GanttRow,
    ]
    const slackMap = new Map([
      ['A1', { slackDays: 0, /* ... */ }],
      ['A2', { slackDays: 5, /* ... */ }],
    ])
    
    const filtered = applyFilters(activities, { criticalOnly: true }, slackMap)
    
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('A1')
  })
  
  it('should filter blocked activities only', () => {
    const activities: GanttRow[] = [
      { id: 'A1', status: 'blocked', /* ... */ } as GanttRow,
      { id: 'A2', status: 'in_progress', /* ... */ } as GanttRow,
    ]
    
    const filtered = applyFilters(activities, { blockedOnly: true })
    
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('A1')
  })
})
```

#### 3. Heatmap Buckets

```typescript
// lib/gantt/__tests__/density.test.ts

describe('density', () => {
  it('should calculate correct bucket counts', () => {
    const activities: GanttRow[] = [
      {
        id: 'A1',
        planned_start: '2026-01-01',
        planned_finish: '2026-01-03',
      } as GanttRow,
      {
        id: 'A2',
        planned_start: '2026-01-02',
        planned_finish: '2026-01-04',
      } as GanttRow,
    ]
    
    const buckets = calculateDensityBuckets(
      activities,
      new Date('2026-01-01'),
      new Date('2026-01-05')
    )
    
    // Day 0: 1 activity (A1)
    // Day 1: 2 activities (A1, A2)
    // Day 2: 2 activities (A1, A2)
    // Day 3: 1 activity (A2)
    // Day 4: 0 activities
    expect(buckets).toEqual([1, 2, 2, 1, 0])
  })
})
```

---

## Acceptance Criteria

### 12. Swimlane Auto-Grouping

- [ ] 7 trips visible in one screen with grouping collapsed to TR level
- [ ] Expand TR → shows Phase groups
- [ ] Expand Phase → shows Resource groups
- [ ] Collapse All / Expand All buttons work
- [ ] Critical Only filter shows only slack=0 activities
- [ ] Blocked Only filter shows only status=blocked activities
- [ ] Custom Gantt mode: filters apply, no grouping UI

### 13. Mini-Map Navigator

- [ ] Mini-map shows whole timeline with density heatline
- [ ] Viewport box highlights current visible range
- [ ] Click to jump: centers window on clicked date
- [ ] Drag to pan: moves viewport by drag delta
- [ ] Synced with vis-timeline rangechange events

### 14. Activity Hover Card

- [ ] Hover card shows on item hover after 0.5s (optional delay)
- [ ] Displays: Status, Progress, Owner, Evidence summary, Dependencies
- [ ] Quick Actions: Edit (live only), Evidence, History
- [ ] Edit button disabled outside live mode
- [ ] Card closes on item blur or click outside

### 15. Density Heatmap

- [ ] Heatmap toggle visibly overlays density background
- [ ] 1-day buckets calculated correctly
- [ ] Color scale: green → yellow → orange → red
- [ ] Hot spots align with peak overlaps (manual verification)
- [ ] Legend shows color scale
- [ ] No performance impact when disabled

---

## Assumptions / Defaults

| Assumption | Value | Notes |
|------------|-------|-------|
| Phase mapping | anchor_type → label map, fallback level1 | LOADOUT/SAIL_AWAY/LOADIN/TURNING/JACKDOWN |
| Resource group | resource_tags[0] only | Multiple tags: only first used |
| Evidence preview | Shown only if ssot.entities.activities includes activity | SSOT dependency |
| Custom Gantt | Filters apply, no grouping | Minimal feature parity |
| SSOT writes | None | All derived in UI |
| Heatmap bucket size | 1 day | Fixed resolution |
| Collapse logic | vis-timeline nested groups or filter | Depends on vis support |

---

## No SSOT Writes

All features are **derived-only**:
- Grouping: calculated from GanttRow fields
- Filters: calculated from GanttRow.status + slackMap
- Hover card: reads from GanttRow + optional SSOT
- Heatmap: calculated from GanttRow.planned_start/finish

**No changes to option_c.json**.

---

## File Changes Summary

### New Files

```
lib/gantt/grouping.ts                    # Grouping utilities
lib/gantt/density.ts                     # Density calculation
components/gantt/GanttMiniMap.tsx        # Mini-map component
components/gantt/ActivityHoverCard.tsx   # Hover card component
components/gantt/DensityHeatmapOverlay.tsx  # Heatmap overlay
lib/gantt/__tests__/grouping.test.ts     # Grouping tests
lib/gantt/__tests__/density.test.ts      # Density tests
```

### Modified Files

```
components/gantt/VisTimelineGantt.tsx    # Add hover events, setWindow method
components/gantt/gantt-chart.tsx         # Integrate all 4 features
components/timeline/timeline-controls.tsx  # Add new toggles/filters
lib/gantt/visTimelineMapper.ts           # (Optional) group building
```

---

## Next Steps

1. **Phase 1 (Week 1-2)**: Implement grouping + filters
2. **Phase 2 (Week 3)**: Implement mini-map + hover card
3. **Phase 3 (Week 4)**: Implement heatmap + integration tests
4. **Phase 4 (Week 5)**: Polish + documentation + acceptance testing

---

## Refs

- [timeline-data-density-features-plan.md](./timeline-data-density-features-plan.md)
- [innovation-scout-vis-timeline-upgrade-20260204.md](./innovation-scout-vis-timeline-upgrade-20260204.md)
- [components/gantt/VisTimelineGantt.tsx](../../components/gantt/VisTimelineGantt.tsx)
- [lib/gantt/visTimelineMapper.ts](../../lib/gantt/visTimelineMapper.ts)
- [AGENTS.md](../../AGENTS.md)
- [patch.md](../../patch.md)
