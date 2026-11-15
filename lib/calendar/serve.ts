import { buildCalendar, calendarEtag, feedOrigin, feedPublishedAt, icsFilename } from "./ics.ts"
import { tokenFromSegment } from "./token.ts"
import type { TripCalendarSource } from "./types.ts"

export type FeedLoad = "missing" | "revoked" | TripCalendarSource

function notFound(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  })
}

function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false
  if (header.trim() === "*") return true
  return header.split(",").some((part) => part.trim().replace(/^W\//, "") === etag)
}

function notModifiedSince(header: string | null, lastModifiedMs: number): boolean {
  if (!header) return false
  const since = Date.parse(header)
  if (Number.isNaN(since)) return false
  return Math.floor(lastModifiedMs / 1000) <= Math.floor(since / 1000)
}

export function feedLastModified(source: TripCalendarSource): number {
  return feedPublishedAt(source)
}

export async function serveCalendarFeed(
  request: Request,
  tokenSegment: string,
  load: (token: string) => Promise<FeedLoad>,
): Promise<Response> {
  const token = tokenFromSegment(tokenSegment)
  if (!token) return notFound()
  const loaded = await load(token)
  if (loaded === "missing" || loaded === "revoked") return notFound()

  const body = buildCalendar(loaded, feedOrigin(request.url))
  const etag = calendarEtag(body)
  const lastModifiedMs = feedLastModified(loaded)
  const lastModified = new Date(lastModifiedMs).toUTCString()
  const headers = {
    ETag: etag,
    "Last-Modified": lastModified,
    "Cache-Control": "private, max-age=0, must-revalidate",
  }
  const ifNoneMatch = request.headers.get("if-none-match")
  if (etagMatches(ifNoneMatch, etag)) {
    return new Response(null, { status: 304, headers })
  }
  if (!ifNoneMatch && notModifiedSince(request.headers.get("if-modified-since"), lastModifiedMs)) {
    return new Response(null, { status: 304, headers })
  }
  return new Response(body, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${icsFilename(loaded.tripName)}"`,
    },
  })
}
