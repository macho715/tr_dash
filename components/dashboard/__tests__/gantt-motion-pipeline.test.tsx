// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { DateProvider } from "@/lib/contexts/date-context"
import { scheduleActivities } from "@/lib/data/schedule-data"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactElement }) => {
    const MockDynamicComponent = (props: {
      onRangeChange?: (range: { start: Date; end: Date }) => void
      onRender?: () => void
    }) => (
      <div>
        {options?.loading ? options.loading() : null}
        <button
          data-testid="emit-range"
          onClick={() =>
            props.onRangeChange?.({
              start: new Date("2026-02-04T00:00:00Z"),
              end: new Date("2026-02-10T00:00:00Z"),
            })
          }
        >
          emit-range
        </button>
        <button data-testid="emit-render" onClick={() => props.onRender?.()}>
          emit-render
        </button>
      </div>
    )
    return MockDynamicComponent
  },
}))

vi.mock("@/components/gantt/DependencyArrowsOverlay", () => ({
  DependencyArrowsOverlay: ({ renderKey }: { renderKey?: number }) => (
    <div data-testid="dep-render-key">{String(renderKey ?? 0)}</div>
  ),
}))

vi.mock("@/components/gantt/WeatherOverlay", () => ({
  WeatherOverlay: ({ viewStart, viewEnd }: { viewStart: Date; viewEnd: Date }) => (
    <div data-testid="weather-range">
      {viewStart.toISOString()}|{viewEnd.toISOString()}
    </div>
  ),
}))

import { GanttChart } from "../gantt-chart"

describe("Gantt motion pipeline", () => {
  it("updates visRange from range change without incrementing render tick until render event", async () => {
    const weatherForecast: WeatherForecastData = {
      updatedAt: "2026-02-01T00:00:00Z",
      series: [],
    }
    const weatherLimits: WeatherLimits = {
      hsLimitM: 2.0,
      windLimitKt: 18,
    }

    render(
      <DateProvider>
        <GanttChart
          activities={scheduleActivities.slice(0, 6)}
          view="Week"
          onViewChange={() => {}}
          highlightFlags={{ delay: true, lock: false, constraint: true }}
          onHighlightFlagsChange={() => {}}
          jumpDate=""
          onJumpDateChange={() => {}}
          projectEndDate="2026-03-31"
          weatherForecast={weatherForecast}
          weatherLimits={weatherLimits}
          weatherOverlayVisible={true}
        />
      </DateProvider>
    )

    expect(screen.getByTestId("dep-render-key")).toHaveTextContent("0")

    fireEvent.click(screen.getByTestId("emit-range"))

    await waitFor(() => {
      expect(screen.getByTestId("weather-range")).toHaveTextContent("2026-02-04T00:00:00.000Z")
    })
    expect(screen.getByTestId("dep-render-key")).toHaveTextContent("0")

    fireEvent.click(screen.getByTestId("emit-render"))

    await waitFor(() => {
      expect(screen.getByTestId("dep-render-key")).toHaveTextContent("1")
    })
  })
})
