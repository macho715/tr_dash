// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { DateProvider } from "@/lib/contexts/date-context"
import { scheduleActivities } from "@/lib/data/schedule-data"

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactElement }) => {
    const MockDynamicComponent = () => (options?.loading ? options.loading() : null)
    return MockDynamicComponent
  },
}))

import { GanttChart } from "../gantt-chart"

describe("GanttChart loading fallback", () => {
  it("shows GanttSkeleton as dynamic loading fallback", () => {
    render(
      <DateProvider>
        <GanttChart
          activities={scheduleActivities.slice(0, 3)}
          view="Week"
          onViewChange={() => {}}
          highlightFlags={{ delay: true, lock: false, constraint: true }}
          onHighlightFlagsChange={() => {}}
          jumpDate=""
          onJumpDateChange={() => {}}
          projectEndDate="2026-03-31"
        />
      </DateProvider>
    )

    expect(screen.getByTestId("gantt-skeleton")).toBeInTheDocument()
  })
})
