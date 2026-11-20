"use client"

import { useEffect, useState } from "react"

import { preferredUnits, weatherQueries, type WeatherReading, type WeatherUnits } from "@/lib/weather"

type Dated = {
  title: string
  planType?: "stay" | "flight" | "place" | "note"
  startDate: string
  endDate: string
  startTime?: string
  place?: { name: string; lat?: number; lng?: number }
}

export function useDayWeather(
  items: readonly Dated[],
  range: { start: string; end: string },
  fixtures?: Record<string, WeatherReading>,
) {
  const [units, setUnits] = useState<WeatherUnits>("f")
  const [readings, setReadings] = useState<Record<string, WeatherReading>>(fixtures ?? {})
  const hasFixtures = Boolean(fixtures)
  const payload = hasFixtures ? "" : JSON.stringify(weatherQueries(items, range.start, range.end))

  useEffect(() => {
    setUnits(preferredUnits(navigator.language, window.localStorage.getItem("weather-units")))
  }, [])

  function choose(next: WeatherUnits) {
    setUnits(next)
    window.localStorage.setItem("weather-units", next)
  }

  useEffect(() => {
    if (hasFixtures) return
    if (!payload) {
      setReadings({})
      return
    }
    let cancel = false
    void fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        units,
        today: new Date().toISOString().slice(0, 10),
        days: JSON.parse(payload) as Array<{ date: string; name: string; lat: number; lng: number }>,
      }),
    })
      .then((response) => response.json())
      .then((body: { days?: WeatherReading[] }) => {
        if (cancel) return
        const next: Record<string, WeatherReading> = {}
        for (const day of body.days ?? []) next[day.date] = day
        setReadings(next)
      })
      .catch(() => {
        if (!cancel) setReadings({})
      })
    return () => {
      cancel = true
    }
  }, [hasFixtures, payload, units])

  return { readings, units, choose }
}
