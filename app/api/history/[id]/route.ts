import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { setHistoryEventDeleted } from "@/lib/ssot/update-history"

export const runtime = "nodejs"

type RouteParams = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const eventId = params?.id
  if (!eventId) {
    return NextResponse.json({ error: "Missing history event id" }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const deleted =
    typeof body.deleted === "boolean" ? body.deleted : undefined
  if (deleted === undefined) {
    return NextResponse.json({ error: "Missing deleted flag" }, { status: 400 })
  }

  try {
    const result = await setHistoryEventDeleted({
      eventId,
      deleted,
      actor: typeof body.actor === "string" ? body.actor : "user",
      reason: typeof body.reason === "string" ? body.reason : undefined,
    })
    return NextResponse.json({ event: result.event })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update history event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
