// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MapPanelWrapper } from "../MapPanelWrapper"

describe("MapPanelWrapper loading", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("renders MapPanelSkeleton while internal SSOT fetch is pending", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // keep pending
          })
      )
    )

    render(<MapPanelWrapper />)
    expect(screen.getByTestId("map-panel-skeleton")).toBeInTheDocument()
  })

  it("renders error box when internal SSOT fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    )

    render(<MapPanelWrapper />)
    await waitFor(() => {
      expect(screen.getByTestId("map-panel-error")).toBeInTheDocument()
    })
  })
})
