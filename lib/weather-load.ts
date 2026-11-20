import { averageSamples, conditionLabel, isForecastDate, type DayQuery, type DaySample, type WeatherReading, type WeatherUnits } from "./weather.ts"

const UA = "TravelCalendar/1.0 (https://www.travelcalendar.space)"
const archiveByPlace = new Map<string, { at: number; days: Map<string, DaySample[]> }>()
const DAY = 24 * 60 * 60 * 1000

type DailyPayload = {
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
    precipitation_sum?: number[]
  }
}

function unitName(units: WeatherUnits): string {
  return units === "f" ? "fahrenheit" : "celsius"
}

function roundKey(value: number): string {
  return value.toFixed(2)
}

async function readJson(url: string): Promise<DailyPayload | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) return null
  return (await response.json()) as DailyPayload
}

function samplesFrom(payload: DailyPayload | null, precip: "chance" | "amount"): Map<string, DaySample> {
  const daily = payload?.daily
  const times = daily?.time ?? []
  const map = new Map<string, DaySample>()
  times.forEach((time, index) => {
    const high = daily?.temperature_2m_max?.[index]
    const low = daily?.temperature_2m_min?.[index]
    const code = daily?.weather_code?.[index] ?? 0
    if (typeof high !== "number" || typeof low !== "number") return
    const rain =
      precip === "chance"
        ? (daily?.precipitation_probability_max?.[index] ?? 0)
        : (daily?.precipitation_sum?.[index] ?? 0) >= 1
          ? 100
          : 0
    map.set(time.slice(0, 10), { high, low, code, precip: rain })
  })
  return map
}

async function forecastMap(lat: number, lng: number, units: WeatherUnits): Promise<Map<string, DaySample>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=${unitName(units)}&timezone=auto&forecast_days=16`
  return samplesFrom(await readJson(url).catch(() => null), "chance")
}

async function typicalIndex(lat: number, lng: number, units: WeatherUnits): Promise<Map<string, DaySample[]>> {
  const key = `${roundKey(lat)}|${roundKey(lng)}|${units}`
  const hit = archiveByPlace.get(key)
  if (hit && Date.now() - hit.at < DAY) return hit.days
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=2017-01-01&end_date=2024-12-31` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&temperature_unit=${unitName(units)}`
  const payload = await readJson(url).catch(() => null)
  const byDate = samplesFrom(payload, "amount")
  const days = new Map<string, DaySample[]>()
  for (const [date, sample] of byDate) {
    const monthDay = date.slice(5)
    const list = days.get(monthDay) ?? []
    list.push(sample)
    days.set(monthDay, list)
  }
  archiveByPlace.set(key, { at: Date.now(), days })
  return days
}

export async function loadWeather(days: DayQuery[], units: WeatherUnits, today: string): Promise<WeatherReading[]> {
  const groups = new Map<string, DayQuery[]>()
  for (const day of days) {
    const key = `${roundKey(day.lat)}|${roundKey(day.lng)}`
    const list = groups.get(key) ?? []
    list.push(day)
    groups.set(key, list)
  }
  const readings: WeatherReading[] = []
  for (const group of groups.values()) {
    const first = group[0]
    if (!first) continue
    const needsForecast = group.some((day) => isForecastDate(day.date, today))
    const needsTypical = group.some((day) => !isForecastDate(day.date, today))
    const forecast = needsForecast ? await forecastMap(first.lat, first.lng, units) : new Map<string, DaySample>()
    const typical = needsTypical ? await typicalIndex(first.lat, first.lng, units) : new Map<string, DaySample[]>()
    for (const day of group) {
      if (isForecastDate(day.date, today)) {
        const sample = forecast.get(day.date)
        if (!sample) continue
        readings.push({
          date: day.date,
          name: day.name,
          high: Math.round(sample.high),
          low: Math.round(sample.low),
          precip: Math.max(0, Math.min(100, Math.round(sample.precip))),
          condition: conditionLabel(sample.code),
          typical: false,
          units,
        })
        continue
      }
      const samples = typical.get(day.date.slice(5)) ?? []
      const averaged = averageSamples(samples, true)
      if (!averaged) continue
      readings.push({ date: day.date, name: day.name, units, ...averaged })
    }
  }
  return readings
}
