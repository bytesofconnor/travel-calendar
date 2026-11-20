import { NextResponse } from "next/server"

import { cachedJson } from "@/lib/server-cache"
import { loadWeather } from "@/lib/weather-load"
import type { DayQuery, WeatherReading, WeatherUnits } from "@/lib/weather"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function unitsOf(value: unknown): WeatherUnits {
  return value === "c" ? "c" : "f"
}

function daysOf(value: unknown): DayQuery[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const day = entry as Record<string, unknown>
    const date = typeof day.date === "string" ? day.date : ""
    const name = typeof day.name === "string" ? day.name.trim() : ""
    const lat = typeof day.lat === "number" ? day.lat : Number.NaN
    const lng = typeof day.lng === "number" ? day.lng : Number.NaN
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return []
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return []
    return [{ date, name: name.slice(0, 80), lat, lng }]
  }).slice(0, 60)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { units?: unknown; days?: unknown; today?: unknown } | null
  const units = unitsOf(body?.units)
  const days = daysOf(body?.days)
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10)
  if (days.length === 0) return NextResponse.json({ days: [] })
  const readings: WeatherReading[] = []
  for (const day of days) {
    const key = `weather|${day.lat.toFixed(2)}|${day.lng.toFixed(2)}|${day.date}|${units}`
    const [reading] = await cachedJson(key, () => loadWeather([day], units, today))
    if (reading) readings.push(reading)
  }
  return NextResponse.json({ days: readings })
}
