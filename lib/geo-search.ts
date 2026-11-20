import type { GeoPlace, PlaceFeature } from "./plan-types.ts"

export type PlaceKind = "flight" | "place"
export type PlaceBias = { country?: string; localeCountry?: string }

type CatalogPlace = GeoPlace & { population: number }

const CATALOG: CatalogPlace[] = [
  country("Vietnam", "VN", 14.058, 108.277, "Asia/Ho_Chi_Minh", 100_000_000),
  city("Hanoi", "Hanoi", "VN", "Vietnam", 21.028, 105.834, "Asia/Ho_Chi_Minh", 8_000_000),
  city("Ho Chi Minh City", "Ho Chi Minh City", "VN", "Vietnam", 10.823, 106.63, "Asia/Ho_Chi_Minh", 9_000_000),
  city("Da Nang", "Da Nang", "VN", "Vietnam", 16.054, 108.202, "Asia/Ho_Chi_Minh", 1_200_000),
  country("United States", "US", 39.828, -98.58, "America/Chicago", 330_000_000),
  city("Washington, D.C.", "Washington", "US", "District of Columbia, United States", 38.907, -77.037, "America/New_York", 700_000),
  city("Minneapolis", "Minneapolis", "US", "Minnesota, United States", 44.978, -93.265, "America/Chicago", 430_000),
  city("New York", "New York", "US", "New York, United States", 40.713, -74.006, "America/New_York", 8_300_000),
  city("San Francisco", "San Francisco", "US", "California, United States", 37.775, -122.419, "America/Los_Angeles", 870_000),
  city("Chicago", "Chicago", "US", "Illinois, United States", 41.878, -87.63, "America/Chicago", 2_700_000),
  city("Los Angeles", "Los Angeles", "US", "California, United States", 34.052, -118.244, "America/Los_Angeles", 3_900_000),
  city("Seattle", "Seattle", "US", "Washington, United States", 47.606, -122.332, "America/Los_Angeles", 750_000),
  country("Portugal", "PT", 39.4, -8.224, "Europe/Lisbon", 10_000_000),
  city("Lisbon", "Lisbon", "PT", "Portugal", 38.722, -9.139, "Europe/Lisbon", 500_000),
  country("France", "FR", 46.228, 2.214, "Europe/Paris", 68_000_000),
  city("Paris", "Paris", "FR", "France", 48.857, 2.352, "Europe/Paris", 2_100_000),
  country("United Kingdom", "GB", 54.0, -2.5, "Europe/London", 67_000_000),
  city("London", "London", "GB", "United Kingdom", 51.507, -0.128, "Europe/London", 9_000_000),
  country("Japan", "JP", 36.205, 138.253, "Asia/Tokyo", 125_000_000),
  city("Tokyo", "Tokyo", "JP", "Japan", 35.682, 139.759, "Asia/Tokyo", 14_000_000),
  country("Thailand", "TH", 15.87, 100.993, "Asia/Bangkok", 70_000_000),
  city("Bangkok", "Bangkok", "TH", "Thailand", 13.756, 100.502, "Asia/Bangkok", 10_000_000),
  country("Singapore", "SG", 1.352, 103.82, "Asia/Singapore", 5_900_000),
  country("Australia", "AU", -25.274, 133.775, "Australia/Sydney", 26_000_000),
  city("Sydney", "Sydney", "AU", "Australia", -33.869, 151.209, "Australia/Sydney", 5_300_000),
  airport("HAN", "Noi Bai Airport", "Hanoi", "HAN · Hanoi", "Vietnam", "VN", 21.221, 105.807, "Asia/Ho_Chi_Minh"),
  airport("DAD", "Da Nang Airport", "Da Nang", "DAD · Da Nang", "Vietnam", "VN", 16.044, 108.199, "Asia/Ho_Chi_Minh"),
  airport("SGN", "Tan Son Nhat Airport", "Ho Chi Minh City", "SGN · Ho Chi Minh City", "Vietnam", "VN", 10.819, 106.652, "Asia/Ho_Chi_Minh"),
  airport("DCA", "Ronald Reagan Washington National Airport", "Washington", "DCA · Washington National", "District of Columbia, United States", "US", 38.852, -77.038, "America/New_York"),
  airport("IAD", "Washington Dulles International Airport", "Washington", "IAD · Washington Dulles", "Virginia, United States", "US", 38.953, -77.457, "America/New_York"),
  airport("MSP", "Minneapolis–Saint Paul International Airport", "Minneapolis", "MSP · Minneapolis–Saint Paul", "Minnesota, United States", "US", 44.882, -93.222, "America/Chicago"),
  airport("SFO", "San Francisco International Airport", "San Francisco", "SFO · San Francisco", "California, United States", "US", 37.619, -122.375, "America/Los_Angeles"),
  airport("LIS", "Lisbon Airport", "Lisbon", "LIS · Lisbon", "Portugal", "PT", 38.774, -9.134, "Europe/Lisbon"),
  airport("JFK", "John F. Kennedy International Airport", "New York", "JFK · New York", "New York, United States", "US", 40.64, -73.779, "America/New_York"),
  airport("EWR", "Newark Liberty International Airport", "Newark", "EWR · Newark", "New Jersey, United States", "US", 40.69, -74.174, "America/New_York"),
  airport("LHR", "London Heathrow Airport", "London", "LHR · London Heathrow", "United Kingdom", "GB", 51.47, -0.454, "Europe/London"),
  airport("CDG", "Paris Charles de Gaulle Airport", "Paris", "CDG · Paris", "France", "FR", 49.01, 2.548, "Europe/Paris"),
  airport("LAX", "Los Angeles International Airport", "Los Angeles", "LAX · Los Angeles", "California, United States", "US", 33.943, -118.408, "America/Los_Angeles"),
  airport("ORD", "Chicago O'Hare International Airport", "Chicago", "ORD · Chicago O'Hare", "Illinois, United States", "US", 41.974, -87.907, "America/Chicago"),
  airport("SEA", "Seattle–Tacoma International Airport", "Seattle", "SEA · Seattle", "Washington, United States", "US", 47.45, -122.309, "America/Los_Angeles"),
  airport("NRT", "Tokyo Narita Airport", "Tokyo", "NRT · Tokyo Narita", "Japan", "JP", 35.772, 140.393, "Asia/Tokyo"),
  airport("HND", "Tokyo Haneda Airport", "Tokyo", "HND · Tokyo Haneda", "Japan", "JP", 35.549, 139.78, "Asia/Tokyo"),
  airport("BKK", "Bangkok Suvarnabhumi Airport", "Bangkok", "BKK · Bangkok", "Thailand", "TH", 13.69, 100.75, "Asia/Bangkok"),
  airport("SIN", "Singapore Changi Airport", "Singapore", "SIN · Singapore", "Singapore", "SG", 1.364, 103.991, "Asia/Singapore"),
  airport("SYD", "Sydney Airport", "Sydney", "SYD · Sydney", "Australia", "AU", -33.946, 151.177, "Australia/Sydney"),
]

const ALIASES: Record<string, string> = {
  dc: "Washington, D.C.",
  "washington dc": "Washington, D.C.",
  "d c": "Washington, D.C.",
  mn: "Minneapolis",
}

const UA = "TravelCalendar/1.0 (https://www.travelcalendar.space)"

function country(name: string, code: string, lat: number, lng: number, timeZone: string, population: number): CatalogPlace {
  return { name, label: name, kind: "country", detail: "Country", city: name, lat, lng, country: code, timeZone, population }
}

function city(name: string, cityName: string, code: string, detail: string, lat: number, lng: number, timeZone: string, population: number): CatalogPlace {
  return { name, label: name, kind: "city", detail, city: cityName, lat, lng, country: code, timeZone, population }
}

function airport(
  code: string,
  name: string,
  cityName: string,
  label: string,
  detail: string,
  countryCode: string,
  lat: number,
  lng: number,
  timeZone: string,
): CatalogPlace {
  return { name, label, kind: "airport", code, detail, city: cityName, lat, lng, country: countryCode, timeZone, population: 0 }
}

export function normalizePlaceQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
}

export function countryFromHint(hint: string): string | undefined {
  const text = hint.toLowerCase()
  if (text.includes("vietnam")) return "VN"
  if (text.includes("lisbon") || text.includes("portugal")) return "PT"
  if (text.includes("paris") || text.includes("france")) return "FR"
  if (text.includes("london") || text.includes("britain") || text.includes("england")) return "GB"
  if (text.includes("tokyo") || text.includes("japan")) return "JP"
  if (text.includes("bangkok") || text.includes("thailand")) return "TH"
  if (text.includes("singapore")) return "SG"
  if (text.includes("sydney") || text.includes("australia")) return "AU"
  return undefined
}

export function localeCountry(header: string): string | undefined {
  const match = header.match(/[a-z]{2}-([A-Za-z]{2})/)
  return match?.[1]?.toUpperCase()
}

function textNames(place: GeoPlace): string[] {
  return [place.name, place.label, place.city]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizePlaceQuery(value))
}

function codeMatches(place: GeoPlace, query: string): boolean {
  const code = place.code?.toLowerCase() ?? ""
  if (!code) return false
  if (code === query) return true
  return query.length >= 3 && code.startsWith(query)
}

function matchesQuery(place: GeoPlace, query: string): boolean {
  if (codeMatches(place, query)) return true
  return textNames(place).some((name) => name === query || name.startsWith(query) || name.includes(query))
}

export function localSuggestions(query: string, kind: PlaceKind): GeoPlace[] {
  const q = normalizePlaceQuery(query)
  if (q.length < 2) return []
  const aliasName = ALIASES[q]
  const alias = aliasName ? CATALOG.find((place) => place.name === aliasName) : undefined
  const direct = CATALOG.filter((place) => (kind === "flight" ? place.kind !== "address" : true) && matchesQuery(place, q))
  const countryHit = direct.find((place) => place.kind === "country") ?? (alias?.kind === "country" ? alias : undefined)
  const related = countryHit
    ? CATALOG.filter((place) => place.country === countryHit.country && place.kind === "city" && place.population >= 500_000)
    : []
  const aliasAirports =
    alias?.city
      ? CATALOG.filter((place) => place.kind === "airport" && place.city?.toLowerCase() === alias.city?.toLowerCase())
      : []
  return dedupePlaces([...(alias ? [alias] : []), ...aliasAirports, ...direct, ...related])
}

export function matchAirports(query: string): GeoPlace[] {
  return localSuggestions(query, "flight").filter((place) => place.kind === "airport")
}

type MeteoResult = {
  name?: string
  latitude?: number
  longitude?: number
  country?: string
  country_code?: string
  timezone?: string
  admin1?: string
  population?: number
  feature_code?: string
}

function featureKind(code: string | undefined): PlaceFeature {
  if (code === "PCLI" || code === "PCLD" || code === "PCLIX") return "country"
  if (code === "ADM1" || code === "ADM2") return "region"
  if (code === "AIRP") return "airport"
  return "city"
}

export function placesFromMeteo(payload: { results?: MeteoResult[] }): GeoPlace[] {
  const results = payload.results ?? []
  return results.flatMap((result) => {
    if (!result.name || typeof result.latitude !== "number" || typeof result.longitude !== "number") return []
    const kind = featureKind(result.feature_code)
    const detail = [result.admin1, result.country].filter((part) => part && part !== result.name).join(", ")
    const detailText = detail || (kind === "country" ? "Country" : "")
    return [
      {
        name: result.name,
        label: result.name,
        kind,
        ...(detailText ? { detail: detailText } : {}),
        city: kind === "country" ? result.name : result.admin1 && result.admin1 !== result.name ? result.admin1 : result.name,
        lat: result.latitude,
        lng: result.longitude,
        ...(typeof result.population === "number" ? { population: result.population } : {}),
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
    const label = props.name || street || props.city || name
    const detail = [props.city, props.state, props.country].filter((part) => part && part !== label).join(", ")
    return [
      {
        name,
        label,
        kind: "address" as const,
        ...(detail ? { detail } : {}),
        ...(props.city ? { city: props.city } : {}),
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
    const key = `${(place.code ?? place.label ?? place.name).toLowerCase()}|${place.country ?? ""}|${place.kind ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(place)
  }
  return list
}

function exactName(place: GeoPlace, query: string): boolean {
  return textNames(place).some((name) => name === query)
}

export function rankPlaces(query: string, places: GeoPlace[], bias?: PlaceBias): GeoPlace[] {
  const q = normalizePlaceQuery(query)
  const countryHit = places.find((place) => place.kind === "country" && exactName(place, q))
  const ranked = places.map((place) => {
    const pop = place.population ?? 0
    const tiny = pop > 0 && pop < 100_000
    const alias = ALIASES[q]
    let score = Math.min(2200, Math.log10(pop + 1) * 280)
    if (place.code && place.code.toLowerCase() === q) score += 12000
    else if (alias && place.name === alias) score += 8000
    else if (place.code && q.length >= 3 && place.code.toLowerCase().startsWith(q)) score += 4000
    else if (place.kind === "country" && exactName(place, q)) score += 9000
    else if (place.kind === "region" && exactName(place, q)) score += 6500
    else if (exactName(place, q) && !tiny) score += 5200
    else if (exactName(place, q)) score += 700
    else if (textNames(place).some((name) => name.startsWith(q))) score += 2600
    else if (textNames(place).some((name) => name.includes(q))) score += 900
    if (bias?.country && place.country === bias.country) score += 1800
    if (bias?.localeCountry && place.country === bias.localeCountry) score += 700
    if (countryHit && place.country === countryHit.country && place.kind !== "country") score += 4000
    if (countryHit && place !== countryHit && place.country && place.country !== countryHit.country && exactName(place, q)) score -= 3500
    if (place.kind === "address" && !looksLikeAddress(q)) score -= 3000
    if (place.kind === "airport") score += 200
    return { place, score }
  })
  ranked.sort((a, b) => b.score - a.score || (b.place.population ?? 0) - (a.place.population ?? 0))
  return dedupePlaces(ranked.map((entry) => entry.place)).slice(0, 6)
}

export function looksLikeAddress(query: string): boolean {
  return /\d/.test(query) || /\b(st|street|ave|avenue|rd|road|blvd|boulevard|lane|ln|drive|dr)\b/i.test(query)
}

export function suggestPlaces(query: string, kind: PlaceKind, remote: GeoPlace[] = [], bias?: PlaceBias): GeoPlace[] {
  const local = localSuggestions(query, kind)
  const filtered = kind === "flight" ? remote.filter((place) => place.kind !== "address") : remote
  return rankPlaces(query, [...local, ...filtered], bias)
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(1200),
  })
  if (!response.ok) return null
  return response.json()
}

export async function searchPlaces(query: string, kind: PlaceKind, bias?: PlaceBias): Promise<GeoPlace[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const cityUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
  const addressUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`
  const [cities, addresses] = await Promise.all([
    readJson(cityUrl).catch(() => null),
    kind === "place" && looksLikeAddress(q) ? readJson(addressUrl).catch(() => null) : Promise.resolve(null),
  ])
  const remote = [
    ...(cities && typeof cities === "object" ? placesFromMeteo(cities as { results?: MeteoResult[] }) : []),
    ...(addresses && typeof addresses === "object" ? placesFromPhoton(addresses as { features?: PhotonFeature[] }) : []),
  ]
  return suggestPlaces(q, kind, remote, bias)
}
