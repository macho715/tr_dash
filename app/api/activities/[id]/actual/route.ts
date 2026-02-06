import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateActualDates } from "@/lib/ssot/update-actual"

export const runtime = "nodejs"

type RouteParams = {
  params: { id: string }
}

function normalizeInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return undefined
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const activityId = params?.id
  if (!activityId) {
    return NextResponse.json({ error: "Missing activity id" }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const result = await updateActualDates({
      activityId,
      actualStart: normalizeInput(body.actualStart),
      actualEnd: normalizeInput(body.actualEnd),
      actor: typeof body.actor === "string" ? body.actor : "user",
    })

    return NextResponse.json({
      activity: result.activity,
      historyEvent: result.historyEvent,
      transition: result.transition,
      transitionEvent: result.transitionEvent ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update actual dates"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
