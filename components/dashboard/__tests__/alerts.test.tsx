// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { OperationalNotice } from "../alerts"

let mockedDate = new Date("2026-02-11T12:00:00.000Z")

vi.mock("@/lib/contexts/date-context", () => ({
  useDate: () => ({
    selectedDate: mockedDate,
    formattedDate: mockedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    dayNumber: 17,
    setSelectedDate: vi.fn(),
    resetToInitialDate: vi.fn(),
  }),
}))

describe("OperationalNotice", () => {
  beforeEach(() => {
    localStorage.clear()
    mockedDate = new Date("2026-02-11T12:00:00.000Z")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("updates completion count when checklist item is toggled", () => {
    render(<OperationalNotice />)
    expect(screen.getByText("0/3 done")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "1차 항차: TR 1유닛 로드 (LCT 밸러스팅 제외) 완료 토글",
      })
    )

    expect(screen.getByText("1/3 done")).toBeInTheDocument()
  })

  it("persists checklist state per selected date", () => {
    const first = render(<OperationalNotice />)
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "SPMT 2세트 유지 · MOB 1/26 변경 없음 완료 토글",
      })
    )
    expect(screen.getByText("1/3 done")).toBeInTheDocument()
    first.unmount()

    mockedDate = new Date("2026-02-12T12:00:00.000Z")
    const second = render(<OperationalNotice />)
    expect(screen.getByText("0/3 done")).toBeInTheDocument()
    second.unmount()

    mockedDate = new Date("2026-02-11T12:00:00.000Z")
    render(<OperationalNotice />)
    expect(screen.getByText("1/3 done")).toBeInTheDocument()
  })

  it("routes each Go action with expected callback payload", () => {
    const onSelectVoyageNo = vi.fn()
    const onNavigateSection = vi.fn()

    render(
      <OperationalNotice
        onSelectVoyageNo={onSelectVoyageNo}
        onNavigateSection={onNavigateSection}
      />
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: "1차 항차: TR 1유닛 로드 (LCT 밸러스팅 제외) 이동",
      })
    )
    expect(onSelectVoyageNo).toHaveBeenCalledWith(1)
    expect(onNavigateSection).toHaveBeenCalledWith("voyages")

    fireEvent.click(
      screen.getByRole("button", {
        name: "SPMT 2세트 유지 · MOB 1/26 변경 없음 이동",
      })
    )
    expect(onNavigateSection).toHaveBeenCalledWith("schedule")

    fireEvent.click(
      screen.getByRole("button", {
        name: "잔여 일정 확정 후 반영 이동",
      })
    )
    expect(onNavigateSection).toHaveBeenCalledWith("gantt")
  })
})
