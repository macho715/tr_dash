import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { appendHistoryEventToSsot } from "@/lib/ssot/update-history"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const eventType = typeof body.eventType === "string" ? body.eventType : ""
  const entityRef = body.entityRef as { entity_type?: string; entity_id?: string } | undefined
  const entityType = entityRef?.entity_type
  const entityId = entityRef?.entity_id

  if (!eventType || !entityType || !entityId) {
    return NextResponse.json({ error: "Missing eventType or entityRef" }, { status: 400 })
  }

  try {
    const result = await appendHistoryEventToSsot({
      eventType,
      entityRef: { entity_type: entityType, entity_id: entityId },
      details: (body.details as Record<string, unknown>) ?? {},
      actor: typeof body.actor === "string" ? body.actor : "user",
    })

    return NextResponse.json({ historyEvent: result.historyEvent })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to append history event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
