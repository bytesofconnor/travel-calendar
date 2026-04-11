import { NextRequest, NextResponse } from "next/server"

import { fetchTripCoverImage } from "@/lib/trip-cover"
import { getPexelsApiKey, isPexelsConfigured } from "@/lib/supabase/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{
    tripId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!isPexelsConfigured()) {
    return NextResponse.json({ error: "Pexels is not configured." }, { status: 503 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { tripId } = await params
  const body = (await request.json().catch(() => ({}))) as { query?: string }

  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .select("id, name")
    .eq("id", tripId)
    .single()

  if (tripError || !tripRow) {
    return NextResponse.json({ error: tripError?.message ?? "Trip not found." }, { status: 404 })
  }

  const cover = await fetchTripCoverImage(getPexelsApiKey(), tripRow.name, body.query)

  if (!cover) {
    return NextResponse.json({ error: "No matching cover image found." }, { status: 404 })
  }

  const { data: updatedTrip, error: updateError } = await supabase
    .from("trips")
    .update({
      cover_image_url: cover.imageUrl,
      cover_image_photographer: cover.photographer,
      cover_image_source_url: cover.sourceUrl,
      cover_image_query: cover.query,
    })
    .eq("id", tripId)
    .select("id, cover_image_url, cover_image_photographer, cover_image_source_url, cover_image_query")
    .single()

  if (updateError || !updatedTrip) {
    return NextResponse.json({ error: updateError?.message ?? "Unable to save trip cover." }, { status: 400 })
  }

  return NextResponse.json(updatedTrip)
}
