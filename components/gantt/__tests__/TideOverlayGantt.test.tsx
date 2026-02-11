// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { __resetTideCacheForTests } from "@/lib/services/tideService"

const { warningMock } = vi.hoisted(() => ({
  warningMock: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    warning: warningMock,
  },
}))

vi.mock("@/lib/data/schedule-data", () => ({
  scheduleActivities: [
    {
      activity_id: "A1000",
      activity_name: "Loadout",
      level1: "Voyage 1",
      level2: "Loadout",
      duration: 1,
      planned_start: "2026-02-11",
      planned_finish: "2026-02-11",
      status: "planned",
    },
  ],
}))

vi.mock("gantt-task-react", () => ({
  ViewMode: { Day: "Day" },
  Gantt: ({
    tasks,
    onDateChange,
    TooltipContent,
  }: {
    tasks: Array<{
      id: string
      name: string
      start: Date
      end: Date
    }>
    onDateChange?: (task: { id: string; name: string; start: Date; end: Date }, children: unknown[]) => void
    TooltipContent?: import("react").ComponentType<{
      task: { id: string; name: string; start: Date; end: Date }
      fontSize: string
      fontFamily: string
    }>
  }) => (
    <div data-testid="mock-gantt">
      {tasks.map((task) => (
        <button
          key={task.id}
          data-testid={`drag-${task.id}`}
          onClick={() => {
            const hourMs = 60 * 60 * 1000
            onDateChange?.(
              {
                ...task,
                start: new Date(task.start.getTime() + hourMs),
                end: new Date(task.end.getTime() + hourMs),
              },
              []
            )
          }}
        >
          drag {task.id}
        </button>
      ))}
      {tasks[0] && TooltipContent ? (
        <div data-testid="tooltip-probe">
          <TooltipContent task={tasks[0]} fontSize="12px" fontFamily="monospace" />
        </div>
      ) : null}
    </div>
  ),
}))

import { TideOverlayGantt } from "../TideOverlayGantt"

function makeDay(date: string, mode: "danger" | "safe") {
  return {
    date,
    high: 2.1,
    highTime: "07:00",
    low: 1.0,
    lowTime: "12:00",
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      height:
        mode === "safe"
          ? hour >= 6 && hour <= 17
            ? 1.9
            : 1.2
          : hour === 6 || hour === 7
            ? 1.9
            : 1.2,
    })),
  }
}

describe("TideOverlayGantt", () => {
  beforeEach(() => {
    __resetTideCacheForTests()
    warningMock.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          location: "MINA ZAYED",
          days: [
            makeDay("2026-02-11", "danger"),
            makeDay("2026-02-12", "safe"),
            makeDay("2026-02-13", "safe"),
          ],
        }),
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders tide strip and gantt on successful API response", async () => {
    render(<TideOverlayGantt />)

    await screen.findByTestId("tide-overlay-gantt")
    expect(screen.getByTestId("tide-strip")).toBeTruthy()
    expect(screen.getByTestId("tide-summary-chip")).toBeTruthy()
    expect(screen.getByTestId("mock-gantt")).toBeTruthy()
  })

  it("revalidates safety, shows nearest SAFE slot, and offers +1/+2d what-if", async () => {
    render(<TideOverlayGantt />)
    await screen.findByTestId("mock-gantt")

    fireEvent.click(screen.getByTestId("drag-A1000"))

    await waitFor(() => {
      expect(warningMock).toHaveBeenCalled()
    })
    const call = warningMock.mock.calls[0] as [string, { description?: string }]
    expect(call[1]?.description ?? "").toContain("+1d SAFE")
    expect(screen.getByTestId("tide-danger-guidance")).toBeTruthy()
    expect(screen.getByText(/nearest safe slot/i)).toBeTruthy()
    expect(screen.getByTestId("whatif-1d")).toBeTruthy()
    expect(screen.getByTestId("whatif-2d")).toBeTruthy()
  })

  it("renders fail-soft fallback when API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    )

    render(<TideOverlayGantt />)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch tide data/i)).toBeTruthy()
    })
    expect(screen.getByText(/showing static safety fallback/i)).toBeTruthy()
  })
})
