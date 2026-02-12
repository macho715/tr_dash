"use client"

import * as React from "react"

type FilterDrawerProps = {
  open: boolean
  title?: string
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function FilterDrawer({
  open,
  title = "Filters",
  onClose,
  onOpenChange,
  children,
  className = "",
}: FilterDrawerProps) {
  const close = React.useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false)
      return
    }
    onClose?.()
  }, [onClose, onOpenChange])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, close])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] md:hidden" aria-label="Filter Drawer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-label="Close filters"
      />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-accent/20 bg-card/95 p-4 shadow-2xl backdrop-blur-xl ${className}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-mobile-heading font-semibold">{title}</h2>
          <button
            type="button"
            onClick={close}
            className="touch-target rounded-lg border border-accent/20 bg-card/80 px-3 text-sm"
            aria-label="Close filters"
          >
            Close
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

export default FilterDrawer
