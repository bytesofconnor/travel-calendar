import { NextResponse } from "next/server"

import {
  changeTrip,
  createPlan,
  readRoom,
  removePlan,
  seedRoom,
  updatePlan,
  writeNote,
} from "@/lib/trip-pair"
import type { ItemInput } from "@/lib/shared-trip"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function closed() {
  return process.env.UI_REVIEW !== "1"
}

function asRecord(value: unknown) {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value !== "string" || !value.trim()) return null
  return value
}

function memberOf(value: unknown) {
  return value === "owner" || value === "partner" ? value : null
}

function itemInput(record: Record<string, unknown>): ItemInput | null {
  const title = readString(record, "title")
  const startDate = readString(record, "startDate")
  const endDate = readString(record, "endDate")
  const location = readString(record, "location")
  if (!title || !startDate || !endDate || !location) return null
  const notes = typeof record.notes === "string" ? record.notes : undefined
  const locationTo = typeof record.locationTo === "string" ? record.locationTo : undefined
  return { title, notes, startDate, endDate, location, locationTo }
}

export async function GET(request: Request) {
  if (closed()) return new NextResponse(null, { status: 404 })
  const url = new URL(request.url)
  const member = memberOf(url.searchParams.get("member"))
  const roomId = url.searchParams.get("room") ?? ""
  if (!member || !roomId) return NextResponse.json({ error: "Room and member are required." }, { status: 400 })
  const view = await readRoom(roomId, member)
  if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
  return NextResponse.json(view)
}

export async function POST(request: Request) {
  if (closed()) return new NextResponse(null, { status: 404 })
  const body = asRecord(await request.json().catch(() => null))
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  try {
    if (body.action === "seed") {
      return NextResponse.json(await seedRoom())
    }

    const member = memberOf(body.member)
    const roomId = typeof body.roomId === "string" ? body.roomId : ""
    if (!member || !roomId) return NextResponse.json({ error: "Room and member are required." }, { status: 400 })

    if (body.action === "trip.update") {
      const name = readString(body, "name")
      const startDate = readString(body, "startDate")
      const endDate = readString(body, "endDate")
      if (!name || !startDate || !endDate) {
        return NextResponse.json({ error: "Trip name and dates are required." }, { status: 400 })
      }
      const view = await changeTrip(roomId, member, name, startDate, endDate)
      if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
      return NextResponse.json(view)
    }

    if (body.action === "item.create") {
      const input = itemInput(body)
      if (!input) return NextResponse.json({ error: "Plan fields are required." }, { status: 400 })
      const view = await createPlan(roomId, member, input)
      if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
      return NextResponse.json(view)
    }

    if (body.action === "item.update") {
      const itemId = readString(body, "itemId")
      const input = itemInput(body)
      if (!itemId || !input) return NextResponse.json({ error: "Plan fields are required." }, { status: 400 })
      const view = await updatePlan(roomId, member, itemId, input)
      if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
      return NextResponse.json(view)
    }

    if (body.action === "item.remove") {
      const itemId = readString(body, "itemId")
      if (!itemId) return NextResponse.json({ error: "Plan is required." }, { status: 400 })
      const view = await removePlan(roomId, member, itemId)
      if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
      return NextResponse.json(view)
    }

    if (body.action === "note.save") {
      const content = typeof body.content === "string" ? body.content : null
      if (content === null) return NextResponse.json({ error: "Note is required." }, { status: 400 })
      const view = await writeNote(roomId, member, content)
      if (!view) return NextResponse.json({ error: "Trip room not found." }, { status: 404 })
      return NextResponse.json(view)
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the trip."
    const status = message === "Trip room not found." ? 404 : message.includes("Owner access required") ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
