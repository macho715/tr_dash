// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { WaterTidePanel } from "../sections/water-tide-section"

function buildDay(date: string, base: number) {
  return {
    date,
    high: base + 0.8,
    highTime: "07:00",
    low: base - 0.6,
    lowTime: "16:00",
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      height: Number((base + Math.sin((hour / 24) * Math.PI * 2) * 0.7).toFixed(2)),
    })),
  }
}

describe("WaterTidePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders tide header, chips, and toggles hourly table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          location: "MINA ZAYED",
          days: [buildDay("2026-02-11", 1.2), buildDay("2026-02-12", 1.1)],
        }),
      })
    )

    render(<WaterTidePanel />)

    await screen.findByText("Water Tide")
    expect(screen.getByText("MINA ZAYED")).toBeTruthy()
    expect(screen.getByText(/^High$/)).toBeTruthy()
    expect(screen.getByText(/^Low$/)).toBeTruthy()

    const toggle = screen.getByRole("button", { name: /show hourly table/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText("06:00")).toBeTruthy()
    })
  })

  it("applies work-window highlight for 06:00-17:00 rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          location: "MINA ZAYED",
          days: [buildDay("2026-02-11", 1.2)],
        }),
      })
    )

    render(<WaterTidePanel />)
    await screen.findByText("Water Tide")

    fireEvent.click(screen.getByRole("button", { name: /show hourly table/i }))

    const hour0600 = await screen.findByText("06:00")
    const row = hour0600.closest("tr")
    expect(row?.className).toContain("bg-cyan-500/10")
  })

  it("shows error fallback when API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    )

    render(<WaterTidePanel />)

    await waitFor(() => {
      expect(screen.getByText(/tide data unavailable/i)).toBeTruthy()
    })
  })

  it("virtualizes long daily list and does not render far tail initially", async () => {
    const days = Array.from({ length: 120 }, (_, idx) => {
      const day = String(idx + 1).padStart(2, "0")
      return buildDay(`2026-03-${day <= "31" ? day : "31"}`, 1 + idx * 0.01)
    })

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          location: "MINA ZAYED",
          days,
        }),
      })
    )

    render(<WaterTidePanel />)
    await screen.findByText("Daily highs/lows")

    expect(screen.queryByText(/L 2\.19@16:00/)).toBeNull()
  })
})
