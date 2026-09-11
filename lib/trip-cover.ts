export interface TripCoverResult {
  imageUrl: string
  photographer: string
  sourceUrl: string
  query: string
}

const queryOverrides: Array<{ pattern: RegExp; query: string }> = [
  { pattern: /\bperu\b.*\bbolivia\b|\bbolivia\b.*\bperu\b/i, query: "Peru Bolivia mountains travel landscape" },
  { pattern: /\bperu\b/i, query: "Peru mountains travel landscape" },
  { pattern: /\bbolivia\b/i, query: "Bolivia salt flats travel landscape" },
  { pattern: /\bcusco\b/i, query: "Cusco Peru travel landscape" },
  { pattern: /\bmachu picchu\b/i, query: "Machu Picchu Peru travel landscape" },
  { pattern: /\buyuni\b/i, query: "Uyuni salt flats Bolivia travel landscape" },
]

export function buildTripCoverQuery(tripName: string) {
  const trimmedName = tripName.trim()

  for (const override of queryOverrides) {
    if (override.pattern.test(trimmedName)) {
      return override.query
    }
  }

  const withoutYear = trimmedName.replace(/\b20\d{2}\b/g, "").replace(/[&/,+-]+/g, " ").replace(/\s+/g, " ").trim()
  return `${withoutYear || "travel"} landscape travel`
}

export async function fetchTripCoverImage(apiKey: string, tripName: string, queryOverride?: string): Promise<TripCoverResult | null> {
  const query = queryOverride?.trim() || buildTripCoverQuery(tripName)
  const page = Math.max(1, Math.floor(Math.random() * 5) + 1)
  const endpoint = new URL("https://api.pexels.com/v1/search")
  endpoint.searchParams.set("query", query)
  endpoint.searchParams.set("orientation", "landscape")
  endpoint.searchParams.set("size", "large")
  endpoint.searchParams.set("per_page", "10")
  endpoint.searchParams.set("page", String(page))

  const response = await fetch(endpoint, {
    headers: {
      Authorization: apiKey,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Pexels cover search failed with ${response.status}.`)
  }

  const data = (await response.json()) as {
    photos?: Array<{
      url: string
      photographer: string
      src: {
        landscape?: string
        large2x?: string
        large?: string
      }
    }>
  }

  const photos = data.photos ?? []
  if (photos.length === 0) {
    return null
  }

  const photo = photos[Math.floor(Math.random() * photos.length)]
  const imageUrl = photo.src.landscape ?? photo.src.large2x ?? photo.src.large

  if (!imageUrl) {
    return null
  }

  return {
    imageUrl,
    photographer: photo.photographer,
    sourceUrl: photo.url,
    query,
  }
}
