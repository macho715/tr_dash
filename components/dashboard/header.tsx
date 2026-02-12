"use client"

import { Ship } from "lucide-react"
import Link from "next/link"
import { DatePicker } from "@/components/dashboard/date-picker"

const UNIFIED_COMMAND_PALETTE_ENABLED =
  process.env.NEXT_PUBLIC_UNIFIED_COMMAND_PALETTE === "true"

export function DashboardHeader() {
  const openAiCommand = () => {
    if (!UNIFIED_COMMAND_PALETTE_ENABLED) return
    if (typeof window === "undefined") return
    window.dispatchEvent(
      new CustomEvent("tr:open-command-palette", {
        detail: { aiMode: true },
      })
    )
  }

  return (
    <header className="bg-glass backdrop-blur-xl p-7 rounded-2xl mb-6 border border-accent/40 shadow-glow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
            <Ship className="w-7 h-7 text-cyan-400" />
            HVDC TR Transport
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            AGI Site (Al Ghallan Island) | 7 Transformer Units | LCT BUSHRA
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 rounded-full font-mono font-bold text-xs uppercase tracking-widest mb-3 shadow-cyan">
            <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse" />
            Confirmed
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Project Completion:{" "}
            <strong className="text-amber-400 font-mono text-base">March 22, 2026</strong>
          </p>
        </div>
      </div>
      <div className="pt-4 border-t border-accent/20 flex flex-wrap items-center justify-between gap-3">
        <DatePicker />
        <div className="flex items-center gap-2">
          {UNIFIED_COMMAND_PALETTE_ENABLED ? (
            <button
              type="button"
              onClick={openAiCommand}
              className="inline-flex min-h-[44px] items-center rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/25"
              aria-label="Open AI Command Palette"
              title="Open AI Command Palette (Ctrl/⌘+K)"
            >
              AI Command
            </button>
          ) : null}
          <Link
            href="/tide-gantt"
            className="inline-flex min-h-[44px] items-center rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Open Tide Gantt
          </Link>
        </div>
      </div>
    </header>
  )
}
