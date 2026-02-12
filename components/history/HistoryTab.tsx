'use client'

import { useMemo, useState } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import type { OptionC, HistoryEvent } from '@/src/types/ssot'
import { toast } from 'sonner'
import { AddHistoryModal } from './AddHistoryModal'
import { composeHistoryEventsWithDeletionState } from '@/lib/ssot/history-deletion'

const EVENT_TYPE_LABELS: Record<string, string> = {
  plan_changed: 'Plan changed',
  actual_changed: 'Actual changed',
  state_transition: 'State transition',
  blocker_changed: 'Blocker changed',
  evidence_changed: 'Evidence changed',
  reflow_previewed: 'Reflow previewed',
  reflow_applied: 'Reflow applied',
  collision_opened: 'Collision opened',
  baseline_created: 'Baseline created',
  baseline_activated: 'Baseline activated',
  note: 'Note',
  delay: 'Delay',
  decision: 'Decision',
  risk: 'Risk',
  milestone: 'Milestone',
  issue: 'Issue',
  history_soft_deleted: 'History soft deleted',
  history_restored: 'History restored',
}

type HistoryTabProps = {
  ssot: OptionC | null
  filterEventType?: string | null
  selectedActivityId?: string | null
  onAddEvent?: (data: {
    eventType: string
    entityType: string
    entityId: string
    message: string
  }) => Promise<void> | void
  onDeleteEvent?: (eventId: string) => Promise<void>
  onRestoreEvent?: (eventId: string) => Promise<void>
  canAdd?: boolean
  canDelete?: boolean
}

export function HistoryTab({
  ssot,
  filterEventType = null,
  selectedActivityId = null,
  onAddEvent,
  onDeleteEvent,
  onRestoreEvent,
  canAdd = false,
  canDelete = false,
}: HistoryTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const events = ssot?.history_events ?? []
  const filtered = useMemo(() => {
    let list = composeHistoryEventsWithDeletionState(events).sort(
      (a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime()
    )
    if (filterEventType) {
      list = list.filter((e) => e.event_type === filterEventType)
    }
    if (selectedActivityId) {
      list = list.filter(
        (e) => e.entity_ref?.entity_type === 'activity' && e.entity_ref?.entity_id === selectedActivityId
      )
    }
    return list
  }, [events, filterEventType, selectedActivityId])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, HistoryEvent[]> = {}
    for (const e of filtered) {
      const timestamp = e.ts || new Date().toISOString()
      const date = timestamp.slice(0, 10)
      if (!groups[date]) groups[date] = []
      groups[date].push(e)
    }
    return groups
  }, [filtered])

  if (!ssot) {
    return (
      <div
        className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground"
        data-testid="history-tab-placeholder"
      >
        Load SSOT to display history
      </div>
    )
  }

  const handleDelete = async (eventId: string) => {
    if (!onDeleteEvent) return
    
    if (!confirm('Are you sure you want to delete this event? (Soft delete - can be restored)')) {
      return
    }
    
    setDeletingId(eventId)
    try {
      await onDeleteEvent(eventId)
      toast.success('Event deleted')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleRestore = async (eventId: string) => {
    if (!onRestoreEvent) return
    
    setDeletingId(eventId)
    try {
      await onRestoreEvent(eventId)
      toast.success('Event restored')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore event'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3" data-testid="history-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          History (append-only)
        </span>
        {canAdd && onAddEvent && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded border border-accent/30 px-2 py-1 text-xs hover:bg-accent/10"
            data-testid="history-add-open"
          >
            + Add Event
          </button>
        )}
      </div>
      {canAdd && onAddEvent && (
        <AddHistoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => Promise.resolve(onAddEvent(data))}
          defaultEntityType="activity"
          defaultEntityId={selectedActivityId ?? ''}
        />
      )}
      <div className="max-h-[240px] overflow-y-auto rounded-lg border border-accent/20 bg-background/50">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No events
          </div>
        ) : (
          <ul className="divide-y divide-accent/10">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .flatMap(([date, evts]) =>
                evts.map((e) => {
                  const isDeleted = e.deleted === true
                  return (
                    <li
                      key={e.event_id}
                      className={`px-3 py-2 text-xs ${isDeleted ? 'opacity-50' : ''}`}
                      data-testid={`history-event-${e.event_id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">
                              {(e.ts || '').slice(11, 16)}
                            </span>
                            <span className="font-medium">
                              {EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}
                            </span>
                            {isDeleted && (
                              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                                Deleted
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-muted-foreground">
                            {e.actor} · {e.entity_ref?.entity_type}:{e.entity_ref?.entity_id}
                          </div>
                          {e.details?.message && (
                            <div className="mt-1 text-foreground/90" data-testid="history-event-message">
                              {String(e.details.message)}
                            </div>
                          )}
                          {isDeleted && e.deleted_by && e.deleted_at && (
                            <div className="mt-1 text-[10px] text-red-400/70">
                              Deleted by {e.deleted_by} at {e.deleted_at.slice(0, 16)}
                            </div>
                          )}
                        </div>
                        
                        {/* Delete/Restore Buttons */}
                        {canDelete && (onDeleteEvent || onRestoreEvent) && (
                          <div className="flex gap-1">
                            {!isDeleted && onDeleteEvent && (
                              <button
                                type="button"
                                onClick={() => handleDelete(e.event_id)}
                                disabled={deletingId === e.event_id}
                                className="rounded p-1 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                title="Delete (soft delete, can be restored)"
                                data-testid={`history-delete-${e.event_id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                            {isDeleted && onRestoreEvent && (
                              <button
                                type="button"
                                onClick={() => handleRestore(e.event_id)}
                                disabled={deletingId === e.event_id}
                                className="rounded p-1 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                                title="Restore"
                                data-testid={`history-restore-${e.event_id}`}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })
              )}
          </ul>
        )}
      </div>
    </div>
  )
}
