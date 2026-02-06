"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"

interface AddHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    eventType: string
    entityType: string
    entityId: string
    message: string
  }) => Promise<void>
  defaultEntityType?: string
  defaultEntityId?: string
}

const EVENT_TYPES = [
  { value: "note", label: "Note" },
  { value: "delay", label: "Delay" },
  { value: "decision", label: "Decision" },
  { value: "risk", label: "Risk" },
  { value: "milestone", label: "Milestone" },
  { value: "issue", label: "Issue" },
  { value: "manual_update", label: "Manual Update" },
  { value: "custom", label: "Custom" },
]

const ENTITY_TYPES = [
  { value: "activity", label: "Activity" },
  { value: "trip", label: "Trip" },
  { value: "tr", label: "TR (Transformer)" },
  { value: "resource", label: "Resource" },
  { value: "project", label: "Project" },
]

export function AddHistoryModal({
  isOpen,
  onClose,
  onSubmit,
  defaultEntityType = "activity",
  defaultEntityId = "",
}: AddHistoryModalProps) {
  const [eventType, setEventType] = useState("note")
  const [entityType, setEntityType] = useState(defaultEntityType)
  const [entityId, setEntityId] = useState(defaultEntityId)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!eventType || !entityType || !entityId.trim() || !message.trim()) {
      toast.error("All fields are required")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        eventType,
        entityType,
        entityId: entityId.trim(),
        message: message.trim(),
      })
      
      // Reset form
      setEventType("note")
      setEntityType(defaultEntityType)
      setEntityId(defaultEntityId)
      setMessage("")
      
      toast.success("History event created")
      onClose()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create event"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200">Add History Event</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type */}
          <div>
            <label
              htmlFor="event-type"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Event Type
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type */}
          <div>
            <label
              htmlFor="entity-type"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Entity Type
            </label>
            <select
              id="entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity ID */}
          <div>
            <label
              htmlFor="entity-id"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Entity ID
            </label>
            <input
              id="entity-id"
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g., LO-A-010"
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the event..."
              rows={4}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Help Text */}
          <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs text-cyan-200">
            <strong>💡 Note:</strong> Manual events are appended to the history log. They
            are stored in option_c.json and cannot be hard-deleted (only soft-deleted).
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !eventType || !entityType || !entityId.trim() || !message.trim()}
              className="flex-1 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
