import { NextResponse } from "next/server"

import { countryFromHint, localeCountry, searchPlaces, type PlaceKind } from "@/lib/geo-search"
import { cachedJson } from "@/lib/server-cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const kind: PlaceKind = url.searchParams.get("kind") === "flight" ? "flight" : "place"
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ places: [] })
  }
  const country = countryFromHint(url.searchParams.get("bias") ?? "")
  const locale = localeCountry(request.headers.get("accept-language") ?? "")
  const bias = {
    ...(country ? { country } : {}),
    ...(locale ? { localeCountry: locale } : {}),
  }
  const key = `place|${kind}|${bias.country ?? ""}|${bias.localeCountry ?? ""}|${q.toLowerCase()}`
  try {
    const places = await cachedJson(key, () => searchPlaces(q, kind, bias))
    return NextResponse.json({
      places,
      attribution: "Cities by Open-Meteo. Addresses © OpenStreetMap via Photon.",
    })
  } catch {
    return NextResponse.json({ places: [], attribution: "Cities by Open-Meteo. Addresses © OpenStreetMap via Photon." })
  }
}
