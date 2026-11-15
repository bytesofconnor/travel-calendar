import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"
import { serveCalendarFeed } from "@/lib/calendar/serve"
import type { TripCalendarSource } from "@/lib/calendar/types"

export const dynamic = "force-dynamic"

function unavailable() {
  return new Response(null, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  })
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return unavailable()
  const { token } = await context.params
  const convex = new ConvexHttpClient(url)
  try {
    return await serveCalendarFeed(request, token, async (secret) => {
      const source = await convex.query(api.calendarFeeds.readByToken, { token: secret })
      if (!source) return "missing"
      return source as TripCalendarSource
    })
  } catch {
    return unavailable()
  }
}
