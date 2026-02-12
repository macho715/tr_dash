// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNearViewportPreload } from "@/lib/perf/use-near-viewport-preload"

type MockEntry = {
  isIntersecting: boolean
  target: Element
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  private readonly callback: IntersectionObserverCallback
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  trigger(entries: MockEntry[]) {
    this.callback(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

function Harness({
  targetId,
  preload,
}: {
  targetId: string
  preload: () => Promise<unknown>
}) {
  useNearViewportPreload({ targetId, preload })
  return null
}

describe("useNearViewportPreload", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ""
  })

  it("calls preload once when target enters viewport", async () => {
    const target = document.createElement("div")
    target.id = "gantt"
    document.body.appendChild(target)

    const preload = vi.fn().mockResolvedValue(undefined)
    render(createElement(Harness, { targetId: "gantt", preload }))

    expect(MockIntersectionObserver.instances).toHaveLength(1)
    const observer = MockIntersectionObserver.instances[0]

    act(() => {
      observer.trigger([{ isIntersecting: true, target }])
    })

    await waitFor(() => {
      expect(preload).toHaveBeenCalledTimes(1)
    })

    act(() => {
      observer.trigger([{ isIntersecting: true, target }])
    })
    expect(preload).toHaveBeenCalledTimes(1)
  })
})
