import type { GeoPlace } from "./plan-types.ts"

export type PlaceKind = "flight" | "place"

type Airport = GeoPlace & { code: string; city: string }

const AIRPORTS: Airport[] = [
  { code: "HAN", name: "Hanoi (HAN)", city: "Hanoi", lat: 21.221, lng: 105.807, country: "VN", timeZone: "Asia/Ho_Chi_Minh" },
  { code: "DAD", name: "Da Nang (DAD)", city: "Da Nang", lat: 16.044, lng: 108.199, country: "VN", timeZone: "Asia/Ho_Chi_Minh" },
  { code: "SGN", name: "Ho Chi Minh City (SGN)", city: "Ho Chi Minh City", lat: 10.819, lng: 106.652, country: "VN", timeZone: "Asia/Ho_Chi_Minh" },
  { code: "IAD", name: "Washington Dulles (IAD)", city: "Washington", lat: 38.953, lng: -77.457, country: "US", timeZone: "America/New_York" },
  { code: "DCA", name: "Washington Reagan (DCA)", city: "Washington", lat: 38.852, lng: -77.038, country: "US", timeZone: "America/New_York" },
  { code: "MSP", name: "Minneapolis (MSP)", city: "Minneapolis", lat: 44.882, lng: -93.222, country: "US", timeZone: "America/Chicago" },
  { code: "SFO", name: "San Francisco (SFO)", city: "San Francisco", lat: 37.619, lng: -122.375, country: "US", timeZone: "America/Los_Angeles" },
  { code: "LIS", name: "Lisbon (LIS)", city: "Lisbon", lat: 38.774, lng: -9.134, country: "PT", timeZone: "Europe/Lisbon" },
  { code: "JFK", name: "New York Kennedy (JFK)", city: "New York", lat: 40.64, lng: -73.779, country: "US", timeZone: "America/New_York" },
  { code: "EWR", name: "Newark (EWR)", city: "Newark", lat: 40.69, lng: -74.174, country: "US", timeZone: "America/New_York" },
  { code: "LHR", name: "London Heathrow (LHR)", city: "London", lat: 51.47, lng: -0.454, country: "GB", timeZone: "Europe/London" },
  { code: "CDG", name: "Paris Charles de Gaulle (CDG)", city: "Paris", lat: 49.01, lng: 2.548, country: "FR", timeZone: "Europe/Paris" },
  { code: "LAX", name: "Los Angeles (LAX)", city: "Los Angeles", lat: 33.943, lng: -118.408, country: "US", timeZone: "America/Los_Angeles" },
  { code: "ORD", name: "Chicago O'Hare (ORD)", city: "Chicago", lat: 41.974, lng: -87.907, country: "US", timeZone: "America/Chicago" },
  { code: "SEA", name: "Seattle (SEA)", city: "Seattle", lat: 47.45, lng: -122.309, country: "US", timeZone: "America/Los_Angeles" },
  { code: "NRT", name: "Tokyo Narita (NRT)", city: "Tokyo", lat: 35.772, lng: 140.393, country: "JP", timeZone: "Asia/Tokyo" },
  { code: "HND", name: "Tokyo Haneda (HND)", city: "Tokyo", lat: 35.549, lng: 139.78, country: "JP", timeZone: "Asia/Tokyo" },
  { code: "BKK", name: "Bangkok (BKK)", city: "Bangkok", lat: 13.69, lng: 100.75, country: "TH", timeZone: "Asia/Bangkok" },
  { code: "SIN", name: "Singapore (SIN)", city: "Singapore", lat: 1.364, lng: 103.991, country: "SG", timeZone: "Asia/Singapore" },
  { code: "SYD", name: "Sydney (SYD)", city: "Sydney", lat: -33.946, lng: 151.177, country: "AU", timeZone: "Australia/Sydney" },
]

const UA = "TravelCalendar/1.0 (https://www.travelcalendar.space)"

export function matchAirports(query: string): GeoPlace[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return AIRPORTS.filter((airport) => {
    return (
      airport.code.toLowerCase() === q ||
      airport.city.toLowerCase().includes(q) ||
      airport.name.toLowerCase().includes(q)
    )
  })
    .slice(0, 4)
    .map((airport) => ({
      name: airport.name,
      lat: airport.lat,
      lng: airport.lng,
      country: airport.country,
      timeZone: airport.timeZone,
    }))
}

type MeteoResult = {
  name?: string
  latitude?: number
  longitude?: number
  country?: string
  country_code?: string
  timezone?: string
  admin1?: string
}

export function placesFromMeteo(payload: { results?: MeteoResult[] }): GeoPlace[] {
  const results = payload.results ?? []
  return results.flatMap((result) => {
    if (!result.name || typeof result.latitude !== "number" || typeof result.longitude !== "number") return []
    const locality = result.admin1 && result.admin1 !== result.name ? `${result.name}, ${result.admin1}` : result.name
    return [
      {
        name: locality,
        lat: result.latitude,
        lng: result.longitude,
        ...(result.country_code ? { country: result.country_code } : result.country ? { country: result.country } : {}),
        ...(result.timezone ? { timeZone: result.timezone } : {}),
      },
    ]
  })
}

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

export function placesFromPhoton(payload: { features?: PhotonFeature[] }): GeoPlace[] {
  return (payload.features ?? []).flatMap((feature) => {
    const coords = feature.geometry?.coordinates
    const props = feature.properties
    if (!props || !coords || coords.length < 2) return []
    const lng = coords[0]
    const lat = coords[1]
    if (typeof lat !== "number" || typeof lng !== "number") return []
    const street = [props.housenumber, props.street].filter(Boolean).join(" ")
    const parts = [props.name, street, props.city, props.state, props.country].filter(Boolean)
    const name = [...new Set(parts)].join(", ")
    if (!name) return []
    return [
      {
        name,
        lat,
        lng,
        ...(props.countrycode ? { country: props.countrycode } : {}),
      },
    ]
  })
}

export function dedupePlaces(places: GeoPlace[]): GeoPlace[] {
  const seen = new Set<string>()
  const list: GeoPlace[] = []
  for (const place of places) {
    const key = `${place.name.toLowerCase()}|${place.lat ?? ""}|${place.lng ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(place)
  }
  return list.slice(0, 6)
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  return response.json()
}

export async function searchPlaces(query: string, kind: PlaceKind): Promise<GeoPlace[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const airports = kind === "flight" ? matchAirports(q) : []
  const cityUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
  const addressUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`
  const [cities, addresses] = await Promise.all([
    readJson(cityUrl).catch(() => null),
    kind === "place" ? readJson(addressUrl).catch(() => null) : Promise.resolve(null),
  ])
  return dedupePlaces([
    ...airports,
    ...(cities && typeof cities === "object" ? placesFromMeteo(cities as { results?: MeteoResult[] }) : []),
    ...(addresses && typeof addresses === "object" ? placesFromPhoton(addresses as { features?: PhotonFeature[] }) : []),
  ])
}
