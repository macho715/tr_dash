// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { WidgetErrorBoundary } from "@/components/dashboard/WidgetErrorBoundary"
import { MapListFallback } from "@/components/dashboard/fallbacks/MapListFallback"
import { GanttListFallback } from "@/components/dashboard/fallbacks/GanttListFallback"
import { scheduleActivities } from "@/lib/data/schedule-data"
import type { OptionC } from "@/src/types/ssot"

function ThrowOnRender(): ReactElement {
  throw new Error("forced failure")
}

const minimalSsot = {
  entities: {
    locations: {
      LOC_A: { location_id: "LOC_A", name: "Yard A", lat: 24.55, lon: 54.42 },
      LOC_B: { location_id: "LOC_B", name: "Jetty B", lat: 24.81, lon: 53.71 },
    },
    activities: {},
  },
} as unknown as OptionC

describe("WidgetErrorBoundary fail-soft fallback", () => {
  it("shows map list fallback when Map widget throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <WidgetErrorBoundary
        widgetName="Map"
        fallback={<MapListFallback ssot={minimalSsot} />}
      >
        <ThrowOnRender />
      </WidgetErrorBoundary>
    )

    expect(screen.getByTestId("map-list-fallback")).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it("shows gantt table fallback when Gantt widget throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <WidgetErrorBoundary
        widgetName="Gantt"
        fallback={<GanttListFallback activities={scheduleActivities.slice(0, 3)} />}
      >
        <ThrowOnRender />
      </WidgetErrorBoundary>
    )

    expect(screen.getByTestId("gantt-list-fallback")).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
