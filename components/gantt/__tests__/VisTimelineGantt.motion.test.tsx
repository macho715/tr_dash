// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"

const visMocks = vi.hoisted(() => {
  let latestTimeline: MockTimeline | null = null
  const setLatestTimeline = (timeline: MockTimeline) => {
    latestTimeline = timeline
  }

  class MockDataSet<T = unknown> {
    clear() {}
    add(_items: T[] | T) {}
  }

  class MockTimeline {
    public handlers = new Map<string, Array<(payload?: unknown) => void>>()
    public options: {
      onMove?: (
        item: { id: string | number; start: Date; end: Date },
        callback: (item: { id: string | number; start: Date; end: Date } | null) => void
      ) => void
    }

    constructor(
      _container: Element,
      _items: unknown,
      _groups: unknown,
      options: {
        onMove?: (
          item: { id: string | number; start: Date; end: Date },
          callback: (item: { id: string | number; start: Date; end: Date } | null) => void
        ) => void
      }
    ) {
      this.options = options
      setLatestTimeline(this)
    }

    on(eventName: string, handler: (payload?: unknown) => void) {
      const arr = this.handlers.get(eventName) ?? []
      arr.push(handler)
      this.handlers.set(eventName, arr)
    }

    emit(eventName: string, payload?: unknown) {
      const arr = this.handlers.get(eventName) ?? []
      for (const handler of arr) {
        handler(payload)
      }
    }

    getWindow() {
      return {
        start: new Date("2026-02-01T00:00:00Z"),
        end: new Date("2026-02-10T00:00:00Z"),
      }
    }

    destroy() {}
    addCustomTime() {}
    setCustomTimeTitle() {}
    setSelection() {}
    setWindow() {}
    zoomIn() {}
    zoomOut() {}
    fit() {}
    moveTo() {}
  }

  return {
    MockDataSet,
    MockTimeline,
    getLatestTimeline: () => latestTimeline,
  }
})

vi.mock("vis-data", () => ({
  DataSet: visMocks.MockDataSet,
}))

vi.mock("vis-timeline/standalone", () => ({
  Timeline: visMocks.MockTimeline,
}))

import { VisTimelineGantt } from "../VisTimelineGantt"

describe("VisTimelineGantt motion pipeline", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("emits range updates only via rangechanged path", () => {
    const onRangeChange = vi.fn()

    render(
      <VisTimelineGantt
        groups={[{ id: "g1", content: "Group 1" }]}
        items={[
          { id: "A1000", type: "range", group: "g1", content: "A1000", start: new Date(), end: new Date() },
        ]}
        selectedDate={new Date("2026-02-01T12:00:00Z")}
        onRangeChange={onRangeChange}
      />
    )

    const timeline = visMocks.getLatestTimeline()
    expect(timeline).toBeTruthy()
    expect(onRangeChange).toHaveBeenCalledTimes(1)

    timeline?.emit("rangechange")
    expect(onRangeChange).toHaveBeenCalledTimes(1)

    timeline?.emit("rangechanged")
    expect(onRangeChange).toHaveBeenCalledTimes(2)
  })

  it("debounces preview-generated callback per activity while keeping onMove behavior", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"))

    const onItemMove = vi.fn()
    const onPreviewGenerated = vi.fn()

    render(
      <VisTimelineGantt
        groups={[{ id: "g1", content: "Group 1" }]}
        items={[
          { id: "A1000", type: "range", group: "g1", content: "A1000", start: new Date(), end: new Date() },
        ]}
        selectedDate={new Date("2026-02-01T12:00:00Z")}
        onItemMove={onItemMove}
        onPreviewGenerated={onPreviewGenerated}
      />
    )

    const timeline = visMocks.getLatestTimeline()
    expect(timeline).toBeTruthy()

    const callback = vi.fn()
    const movedItem = {
      id: "A1000",
      start: new Date("2026-02-03T12:00:00Z"),
      end: new Date("2026-02-05T12:00:00Z"),
    }

    timeline?.options.onMove?.(movedItem, callback)
    timeline?.options.onMove?.(movedItem, callback)

    expect(onItemMove).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, null)
    expect(callback).toHaveBeenNthCalledWith(2, null)
    expect(onPreviewGenerated).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date("2026-02-01T00:00:01Z"))
    timeline?.options.onMove?.(movedItem, callback)
    expect(onPreviewGenerated).toHaveBeenCalledTimes(2)
  })
})
