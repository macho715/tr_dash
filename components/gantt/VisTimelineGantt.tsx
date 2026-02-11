"use client"

import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import { DataSet } from "vis-data"
import { Timeline } from "vis-timeline/standalone"
import type { VisGroup, VisItem } from "@/lib/gantt/visTimelineMapper"
import { PROJECT_START, PROJECT_END } from "@/lib/dashboard-data"
import { toUtcNoon, dateToIsoUtc } from "@/lib/ssot/schedule"
import {
  type GanttEventBase,
  createItemSelectedEvent,
  createGanttReadyEvent,
  type TripId,
} from "@/lib/gantt/gantt-contract"

/** Task 9: Zoom/Controls - zoomIn, zoomOut, fit, moveToToday, panLeft, panRight */
export interface VisTimelineGanttHandle {
  scrollToActivity: (activityId: string) => void
  zoomIn: (percentage?: number) => void
  zoomOut: (percentage?: number) => void
  fit: () => void
  moveToToday: (date?: Date) => void
  panLeft: () => void
  panRight: () => void
  setWindow: (start: Date, end: Date, opts?: { animation?: boolean }) => void
}

export type TimelineView = "Day" | "Week"

/** Payload emitted when an item is dragged to a new position */
export type DragMovePayload = {
  itemId: string
  newStart: Date
  newEnd: Date
}

type Props = {
  groups: VisGroup[]
  items: VisItem[]
  selectedDate?: Date
  /** Task 9: Day=14d visible, Week=56d visible */
  view?: TimelineView
  /** GANTTPATCH2: Event stream (ITEM_SELECTED, GANTT_READY) */
  onEvent?: (event: GanttEventBase) => void
  onItemClick?: (itemId: string) => void
  onItemHover?: (payload: { id: string; x: number; y: number }) => void
  onItemBlur?: () => void
  onGroupClick?: (groupId: string) => void
  /** Bug 3: 배경 클릭 시 선택 해제 → 화면 고정 해제 */
  onDeselect?: () => void
  /** Drag-to-Edit: called when user finishes dragging an activity bar */
  onItemMove?: (payload: DragMovePayload) => void
  /** Whether drag-to-edit is enabled (default: true) */
  dragEnabled?: boolean
  focusedActivityId?: string | null
  /** GANTTPATCH2: Trip context for events */
  tripId?: TripId
  /** Vis timeline window updates (range change) */
  onRangeChange?: (range: { start: Date; end: Date }) => void
  /** Vis timeline render tick (after redraw) */
  onRender?: () => void
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAY_VIEW_DAYS = 14
const WEEK_VIEW_DAYS = 56

export const VisTimelineGantt = forwardRef<VisTimelineGanttHandle, Props>(
  function VisTimelineGantt(
    {
      groups,
      items,
      selectedDate,
      view = "Day",
      onEvent,
      onItemClick,
      onItemHover,
      onItemBlur,
      onGroupClick,
      onDeselect,
      onItemMove,
      dragEnabled = true,
      focusedActivityId,
      tripId = 1,
      onRangeChange,
      onRender,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const timelineRef = useRef<Timeline | null>(null)
    const tripIdRef = useRef(tripId)
    const onItemClickRef = useRef(onItemClick)
    const onItemHoverRef = useRef(onItemHover)
    const onItemBlurRef = useRef(onItemBlur)
    const onGroupClickRef = useRef(onGroupClick)
    const onDeselectRef = useRef(onDeselect)
    const onItemMoveRef = useRef(onItemMove)
    const onEventRef = useRef(onEvent)
    const onRangeChangeRef = useRef(onRangeChange)
    const onRenderRef = useRef(onRender)

    useEffect(() => {
      tripIdRef.current = tripId
    }, [tripId])
    useEffect(() => {
      onItemClickRef.current = onItemClick
      onItemHoverRef.current = onItemHover
      onItemBlurRef.current = onItemBlur
      onGroupClickRef.current = onGroupClick
      onDeselectRef.current = onDeselect
      onItemMoveRef.current = onItemMove
      onEventRef.current = onEvent
      onRangeChangeRef.current = onRangeChange
      onRenderRef.current = onRender
    }, [
      onItemClick,
      onItemHover,
      onItemBlur,
      onGroupClick,
      onDeselect,
      onItemMove,
      onEvent,
      onRangeChange,
      onRender,
    ])

    const groupsDS = useMemo(() => new DataSet<VisGroup>([]), [])
    const itemsDS = useMemo(() => new DataSet<VisItem>([]), [])

    useImperativeHandle(ref, () => ({
      scrollToActivity(activityId: string) {
        const timeline = timelineRef.current
        if (timeline) {
          timeline.setSelection([activityId], { focus: true, animation: {} })
        }
      },
      zoomIn(percentage = 0.2) {
        timelineRef.current?.zoomIn(percentage, { animation: true })
      },
      zoomOut(percentage = 0.2) {
        timelineRef.current?.zoomOut(percentage, { animation: true })
      },
      fit() {
        timelineRef.current?.fit({ animation: true })
      },
      moveToToday(date?: Date) {
        const target = date ?? selectedDate ?? new Date()
        timelineRef.current?.moveTo(toUtcNoon(target), { animation: true })
      },
      panLeft() {
        const timeline = timelineRef.current
        if (!timeline) return
        const win = timeline.getWindow()
        const newStart = new Date(win.start.getTime() - 7 * MS_PER_DAY)
        const newEnd = new Date(win.end.getTime() - 7 * MS_PER_DAY)
        timeline.setWindow(newStart, newEnd, { animation: true })
      },
      panRight() {
        const timeline = timelineRef.current
        if (!timeline) return
        const win = timeline.getWindow()
        const newStart = new Date(win.start.getTime() + 7 * MS_PER_DAY)
        const newEnd = new Date(win.end.getTime() + 7 * MS_PER_DAY)
        timeline.setWindow(newStart, newEnd, { animation: true })
      },
      setWindow(start: Date, end: Date, opts?: { animation?: boolean }) {
        timelineRef.current?.setWindow(start, end, opts ?? { animation: true })
      },
    }), [selectedDate])

    useEffect(() => {
      if (!containerRef.current) return

      groupsDS.clear()
      groupsDS.add(groups)
      itemsDS.clear()
      itemsDS.add(items)

      const endWithPadding = new Date(PROJECT_END)
      endWithPadding.setUTCDate(endWithPadding.getUTCDate() + 1)

      const options = {
        start: PROJECT_START,
        end: endWithPadding,
        stack: false,
        multiselect: false,
        selectable: true,
        /** 액티비티 클릭 후 드래그로 일정 이동 (복구) */
        editable: dragEnabled
          ? { updateTime: true, updateGroup: false, remove: false }
          : false,
        itemsAlwaysDraggable: dragEnabled
          ? { item: true, range: true }
          : { item: false, range: false },
        snap: (date: Date) => {
          // Snap to noon UTC for consistent date handling
          const d = new Date(date)
          d.setUTCHours(12, 0, 0, 0)
          return d
        },
        zoomable: true,
        moveable: true,
        /** Bug 1: 날짜를 Gantt 위에 표시 (legacy와 동일) */
        orientation: { axis: "top", item: "top" },
        showMajorLabels: true,
        showMinorLabels: true,
        onMove: (
          item: { id: string | number; start: Date; end: Date },
          callback: (item: { id: string | number; start: Date; end: Date } | null) => void
        ) => {
          const itemId = String(item.id)
          // Reject drag for ghost/overlay items
          if (
            itemId.startsWith("ghost_") ||
            itemId.startsWith("reflow_ghost_") ||
            itemId.startsWith("weather_ghost_") ||
            itemId.startsWith("weather_prop_ghost_") ||
            itemId.startsWith("actual__") ||
            itemId.startsWith("hold__") ||
            itemId.startsWith("milestone__") ||
            itemId.startsWith("baseline_ghost_")
          ) {
            callback(null) // Cancel the move
            return
          }
          // Emit move event to parent, then revert the visual position
          // (parent will show reflow preview ghost bars instead)
          onItemMoveRef.current?.({
            itemId,
            newStart: item.start,
            newEnd: item.end,
          })
          callback(null) // Revert visual — parent handles via reflow preview
        },
        groupTemplate: (group?: { content?: string; level?: number }) => {
          const level = typeof group?.level === "number" ? group.level : -1
          const levelClass = level >= 0 ? `group-level-${level}` : ""
          const label = group?.content ?? ""
          return `<div class="custom-group ${levelClass}">${label}</div>`
        },
      }

      // vis-timeline types don't include snap/onMove but they're supported at runtime
      const timeline = new Timeline(
        containerRef.current,
        itemsDS,
        groupsDS,
        options as Parameters<typeof Timeline.prototype.setOptions>[0]
      )
      timelineRef.current = timeline

      const emitRange = () => {
        const win = timeline.getWindow()
        onRangeChangeRef.current?.({ start: win.start, end: win.end })
      }
      const emitRender = () => {
        onRenderRef.current?.()
      }

      timeline.on("select", (ev: { items?: (string | number)[] }) => {
        const id = ev.items?.[0]
        if (id != null) {
          const itemId = String(id)
          onItemClickRef.current?.(itemId)
          onEventRef.current?.(createItemSelectedEvent(itemId, tripIdRef.current, itemId))
        } else {
          onDeselectRef.current?.()
        }
      })
      timeline.on("itemover", (props: { item?: string | number; event?: MouseEvent }) => {
        const id = props.item != null ? String(props.item) : null
        if (!id || !props.event) return
        onItemHoverRef.current?.({ id, x: props.event.pageX, y: props.event.pageY })
      })
      timeline.on("itemout", () => {
        onItemBlurRef.current?.()
      })
      timeline.on("click", (props: { group?: string | number; item?: string | number }) => {
        if (props.item != null) return
        if (props.group != null) {
          onGroupClickRef.current?.(String(props.group))
        }
      })
      timeline.on("rangechange", emitRange)
      timeline.on("rangechanged", emitRange)
      timeline.on("changed", emitRender)

      onEventRef.current?.(createGanttReadyEvent(tripIdRef.current))
      emitRange()
      emitRender()

      if (selectedDate) {
        const noon = toUtcNoon(selectedDate)
        timeline.addCustomTime(noon, "selected-date")
        timeline.setCustomTimeTitle(`Selected Date (${dateToIsoUtc(noon)} UTC)`, "selected-date")
      }

      return () => {
        timeline.destroy()
        timelineRef.current = null
      }
    }, [groupsDS, itemsDS])

    useEffect(() => {
      itemsDS.clear()
      itemsDS.add(items)
    }, [itemsDS, items])

    useEffect(() => {
      groupsDS.clear()
      groupsDS.add(groups)
    }, [groupsDS, groups])

    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline || !selectedDate) return
      const noon = toUtcNoon(selectedDate)
      try {
        timeline.setCustomTime(noon, "selected-date")
      } catch {
        timeline.addCustomTime(noon, "selected-date")
      }
      timeline.setCustomTimeTitle(
        `Selected Date (${dateToIsoUtc(noon)} UTC)`,
        "selected-date"
      )
    }, [selectedDate])

    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline) return
      if (focusedActivityId) {
        timeline.setSelection([focusedActivityId], { focus: false, animation: {} })
      } else {
        timeline.setSelection([])
      }
    }, [focusedActivityId])

    /** Task 9: Sync visible window when view changes (Day=14d, Week=56d) */
    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline || !selectedDate) return
      const center = toUtcNoon(selectedDate).getTime()
      const days = view === "Week" ? WEEK_VIEW_DAYS : DAY_VIEW_DAYS
      const halfMs = (days / 2) * MS_PER_DAY
      const start = new Date(Math.max(PROJECT_START.getTime(), center - halfMs))
      const end = new Date(Math.min(PROJECT_END.getTime() + MS_PER_DAY, center + halfMs))
      timeline.setWindow(start, end, { animation: false })
    }, [view, selectedDate])

    return <div ref={containerRef} className="gantt-vis-wrapper h-full min-h-[400px] w-full" />
  }
)
