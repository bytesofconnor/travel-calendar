import { NextResponse } from "next/server"

import { isPexelsConfigured, getPexelsApiKey } from "@/lib/env"
import { fetchTripCoverImage } from "@/lib/trip-cover"

export async function POST(request: Request) {
  if (!isPexelsConfigured()) {
    return NextResponse.json({ error: "Cover images are not configured." }, { status: 503 })
  }

  let body: { tripName?: string; query?: string }
  try {
    body = (await request.json()) as { tripName?: string; query?: string }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const tripName = body.tripName?.trim()
  if (!tripName) {
    return NextResponse.json({ error: "tripName is required." }, { status: 400 })
  }

  try {
    const cover = await fetchTripCoverImage(getPexelsApiKey(), tripName, body.query)
    if (!cover) {
      return NextResponse.json({ error: "No cover images found." }, { status: 404 })
    }
    return NextResponse.json(cover)
  } catch (error) {
    console.error("Cover fetch failed:", error)
    return NextResponse.json({ error: "Unable to fetch cover." }, { status: 502 })
  }
}
