"use client";

import * as React from "react";

export type FilterDrawerProps = {
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  triggerLabel?: string;
  className?: string;
};

/**
 * Mobile-friendly filter drawer.
 * Keeps implementation lightweight and dependency-free for fail-soft usage.
 */
export function FilterDrawer({
  open,
  title = "Filters",
  onOpenChange,
  children,
  triggerLabel = "Filters",
  className = "",
}: FilterDrawerProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="min-h-[44px] min-w-[44px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-accent/30"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-label={triggerLabel}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close filters"
            onClick={() => onOpenChange(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl ${className}`}
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm text-slate-200 hover:bg-slate-800"
                aria-label="Close"
              >
                Close
              </button>
            </header>
            <div>{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default FilterDrawer;
