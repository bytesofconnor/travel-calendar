import type { GeoPlace, PlanType } from "./plan-types.ts"

export type WeatherUnits = "f" | "c"

export type WeatherReading = {
  date: string
  name: string
  high: number
  low: number
  precip: number
  condition: string
  typical: boolean
  units: WeatherUnits
}

export type LocatedPlan = {
  title: string
  planType?: PlanType
  location: string
  locationTo?: string
  startDate: string
  endDate: string
  startTime?: string
  place?: GeoPlace
}

export function conditionLabel(code: number): string {
  if (code === 0) return "Clear"
  if (code <= 3) return "Cloudy"
  if (code === 45 || code === 48) return "Fog"
  if (code <= 57) return "Drizzle"
  if (code <= 67) return "Rain"
  if (code <= 77) return "Snow"
  if (code <= 82) return "Showers"
  if (code <= 86) return "Snow"
  if (code >= 95) return "Thunder"
  return "Weather"
}

export function isForecastDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false
  const start = Date.parse(`${today}T00:00:00Z`)
  const target = Date.parse(`${date}T00:00:00Z`)
  const diff = Math.round((target - start) / 86_400_000)
  return diff >= 0 && diff <= 15
}

export function weatherWhen(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  const stamp = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(stamp)
}

export function weatherText(reading: WeatherReading): string {
  const temps = `${reading.high}°/${reading.low}°`
  const detail = reading.precip >= 30 ? `${reading.precip}% rain` : reading.condition
  const line = `${temps} · ${detail}`
  return reading.typical ? `Typical ${line}` : line
}

export function weatherName(reading: WeatherReading): string {
  const kind = reading.typical ? "typical high" : "high"
  return `${reading.name}, ${weatherWhen(reading.date)}: ${kind} ${reading.high}, low ${reading.low}, ${reading.precip} percent chance of rain`
}

export function convertReading(reading: WeatherReading, units: WeatherUnits): WeatherReading {
  if (reading.units === units) return reading
  const high = units === "c" ? toC(reading.high) : toF(reading.high)
  const low = units === "c" ? toC(reading.low) : toF(reading.low)
  return { ...reading, high, low, units }
}

function toC(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9)
}

function toF(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32)
}

export function preferredUnits(locale: string, stored?: string | null): WeatherUnits {
  if (stored === "f" || stored === "c") return stored
  if (/-(US|LR|MM)\b/i.test(locale) || locale.toLowerCase() === "en-us") return "f"
  return "c"
}

type Dated = { startDate: string; endDate: string; planType?: PlanType; place?: GeoPlace; startTime?: string; title: string }

function isStay(item: Dated): boolean {
  if (item.planType === "stay") return true
  if (item.planType) return false
  return item.startDate !== item.endDate
}

export function placeForDay(items: readonly Dated[], date: string): GeoPlace | null {
  const stay = items.find(
    (item) => isStay(item) && item.place && typeof item.place.lat === "number" && date >= item.startDate && date < item.endDate,
  )
  if (stay?.place) return stay.place
  const onDay = items
    .filter((item) => item.place && typeof item.place.lat === "number" && date >= item.startDate && date <= item.endDate)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title))
  return onDay[0]?.place ?? null
}

export function eachDate(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return []
  const dates: string[] = []
  let cursor = start
  while (cursor <= end && dates.length < 60) {
    dates.push(cursor)
    cursor = addDay(cursor)
  }
  return dates
}

function addDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1))
  return date.toISOString().slice(0, 10)
}

export type DayQuery = { date: string; name: string; lat: number; lng: number }

export function weatherQueries(items: readonly Dated[], start: string, end: string): DayQuery[] {
  return eachDate(start, end).flatMap((date) => {
    const place = placeForDay(items, date)
    if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") return []
    return [{ date, name: place.name, lat: place.lat, lng: place.lng }]
  })
}

export type DaySample = { high: number; low: number; code: number; precip: number }

export function averageSamples(samples: DaySample[], typical: boolean): Omit<WeatherReading, "date" | "name" | "units"> | null {
  const usable = samples.filter((sample) => Number.isFinite(sample.high) && Number.isFinite(sample.low))
  if (usable.length === 0) return null
  const high = Math.round(usable.reduce((sum, sample) => sum + sample.high, 0) / usable.length)
  const low = Math.round(usable.reduce((sum, sample) => sum + sample.low, 0) / usable.length)
  const precip = Math.round(usable.reduce((sum, sample) => sum + sample.precip, 0) / usable.length)
  const codes = usable.map((sample) => sample.code)
  const code = codes.sort((a, b) => codes.filter((item) => item === a).length - codes.filter((item) => item === b).length).at(-1) ?? 0
  return {
    high,
    low,
    precip: Math.max(0, Math.min(100, precip)),
    condition: conditionLabel(code),
    typical,
  }
}
