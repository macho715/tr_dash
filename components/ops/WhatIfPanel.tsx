"use client"

import { useState } from "react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

export interface WhatIfScenario {
  activity_id: string
  activity_name: string
  delay_days: number
  reason: string
  confidence?: number
}

export interface WhatIfMetrics {
  affected_activities: number
  total_delay_days: number
  new_conflicts: number
  project_eta_change: number
}

export interface WhatIfPanelProps {
  activity: ScheduleActivity | null
  onSimulate: (scenario: WhatIfScenario) => void
  onCancel: () => void
  metrics?: WhatIfMetrics | null
  isSimulating?: boolean
}

export function WhatIfPanel({
  activity,
  onSimulate,
  onCancel,
  metrics,
  isSimulating = false,
}: WhatIfPanelProps) {
  const [delayDays, setDelayDays] = useState(0)
  const [reason, setReason] = useState("")
  const [confidence, setConfidence] = useState(85)

  const handleSimulate = () => {
    if (!activity || delayDays === 0) return
    const activityId = activity.activity_id ?? ""
    if (!activityId) return

    onSimulate({
      activity_id: activityId,
      activity_name: activity.activity_name || activity.activity_id || "",
      delay_days: delayDays,
      reason: reason || "Manual delay",
      confidence: confidence / 100,
    })
  }

  const handleReset = () => {
    setDelayDays(0)
    setReason("")
    setConfidence(85)
    onCancel()
  }

  if (!activity) return null

  return (
    <div className="what-if-panel border border-cyan-500/30 rounded-lg p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-400">What-If Simulation</h3>
        <button
          onClick={handleReset}
          className="text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Selected Activity */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded">
        <div className="text-sm text-slate-400 mb-1">Selected Activity</div>
        <div className="font-mono text-cyan-300">{activity.activity_id}</div>
        <div className="text-sm text-slate-300 mt-1">
          {activity.activity_name || "No description"}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Current: {activity.planned_start} → {activity.planned_finish}
        </div>
      </div>

      {/* Scenario Input */}
      <div className="space-y-4 mb-4">
        {/* Delay Days */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Delay (days)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-10"
              max="10"
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer 
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                       [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-orange-500"
              disabled={isSimulating}
            />
            <input
              type="number"
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-center
                       text-cyan-300 font-mono"
              disabled={isSimulating}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Advance 10 days</span>
            <span>Delay 10 days</span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Reason / Scenario
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., SPMT breakdown, Weather delay, Resource conflict"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded
                     text-slate-200 placeholder-slate-500 focus:border-orange-500 
                     focus:outline-none focus:ring-1 focus:ring-orange-500"
            disabled={isSimulating}
          />
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Confidence: {confidence}%
          </label>
          <input
            type="range"
            min="50"
            max="100"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-cyan-500"
            disabled={isSimulating}
          />
        </div>
      </div>

      {/* Metrics Display */}
      {metrics && (
        <div className="mb-4 p-3 bg-orange-950/30 border border-orange-500/30 rounded">
          <div className="text-sm font-medium text-orange-400 mb-2">
            Impact Analysis
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400">Affected Activities</div>
              <div className="text-xl font-bold text-orange-300">
                {metrics.affected_activities}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Total Delay</div>
              <div className="text-xl font-bold text-orange-300">
                {metrics.total_delay_days > 0 ? "+" : ""}
                {metrics.total_delay_days} days
              </div>
            </div>
            <div>
              <div className="text-slate-400">New Conflicts</div>
              <div className="text-xl font-bold text-red-400">
                {metrics.new_conflicts}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Project ETA</div>
              <div className="text-xl font-bold text-orange-300">
                {metrics.project_eta_change > 0 ? "+" : ""}
                {metrics.project_eta_change} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSimulate}
          disabled={delayDays === 0 || isSimulating}
          className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700
                   disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium 
                   rounded transition-colors"
        >
          {isSimulating ? "Simulating..." : "Simulate"}
        </button>
        <button
          onClick={handleReset}
          disabled={isSimulating}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium 
                   rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-slate-800/30 rounded text-xs text-slate-400">
        <div className="font-semibold text-slate-300 mb-1">💡 How it works:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Adjust delay to see downstream impact</li>
          <li>Ghost bars show original vs simulated schedule</li>
          <li>Orange highlights indicate affected activities</li>
          <li>Changes are preview only until you Apply</li>
        </ul>
      </div>
    </div>
  )
}
