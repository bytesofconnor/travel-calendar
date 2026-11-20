"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react"

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import type { GeoPlace } from "@/lib/plan-types"
import { convertReading, preferredUnits, weatherName, weatherText, type WeatherReading, type WeatherUnits } from "@/lib/weather"

function Icon({ condition }: { condition: string }) {
  const className = "size-4 shrink-0"
  if (condition === "Clear") return <Sun className={className} aria-hidden="true" />
  if (condition === "Fog") return <CloudFog className={className} aria-hidden="true" />
  if (condition === "Snow") return <CloudSnow className={className} aria-hidden="true" />
  if (condition === "Thunder") return <CloudLightning className={className} aria-hidden="true" />
  if (condition === "Rain" || condition === "Showers" || condition === "Drizzle") {
    return <CloudRain className={className} aria-hidden="true" />
  }
  return <Cloud className={className} aria-hidden="true" />
}

export function WeatherChip({ reading }: { reading: WeatherReading }) {
  const text = weatherText(reading)
  return (
    <span className="weather-chip" role="img" aria-label={`${weatherName(reading)}. ${text}`}>
      <Icon condition={reading.condition} />
      <span>{text}</span>
    </span>
  )
}

export function TemperatureMenuItems({
  units,
  onChange,
}: {
  units: WeatherUnits
  onChange: (units: WeatherUnits) => void
}) {
  return (
    <>
      <DropdownMenuLabel>Temperature: °F / °C</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label="Temperature: °F / °C"
        value={units}
        onValueChange={(value) => {
          if (value === "f" || value === "c") onChange(value)
        }}
      >
        <DropdownMenuRadioItem value="f">°F</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="c">°C</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  )
}

export type DayWeatherState = {
  readings: Record<string, WeatherReading>
  units: WeatherUnits
  choose: (units: WeatherUnits) => void
}

export function DayWeather({
  date,
  readings,
  units,
}: {
  date: string
  readings: Record<string, WeatherReading>
  units: WeatherUnits
}) {
  const reading = readings[date] ? convertReading(readings[date], units) : null
  if (!reading) return null
  return (
    <div className="weather-row">
      <WeatherChip reading={reading} />
    </div>
  )
}

export function DraftWeather({
  place,
  date,
  units,
}: {
  place?: GeoPlace | null
  date: string
  units: WeatherUnits
}) {
  const [reading, setReading] = useState<WeatherReading | null>(null)
  const lat = place?.lat
  const lng = place?.lng
  const name = place?.name ?? ""

  useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number" || !date) {
      setReading(null)
      return
    }
    let cancel = false
    const timer = window.setTimeout(() => {
      void fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units,
          today: new Date().toISOString().slice(0, 10),
          days: [{ date, name, lat, lng }],
        }),
      })
        .then((response) => response.json())
        .then((body: { days?: WeatherReading[] }) => {
          if (!cancel) setReading(body.days?.[0] ?? null)
        })
        .catch(() => {
          if (!cancel) setReading(null)
        })
    }, 250)
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [date, lat, lng, name, units])

  if (!reading) return null
  return <WeatherChip reading={convertReading(reading, units)} />
}

export function useWeatherUnits(controlled?: WeatherUnits) {
  const [units, setUnits] = useState<WeatherUnits>(controlled ?? "f")
  useEffect(() => {
    if (controlled) {
      setUnits(controlled)
      return
    }
    setUnits(preferredUnits(navigator.language, window.localStorage.getItem("weather-units")))
  }, [controlled])
  function choose(next: WeatherUnits) {
    setUnits(next)
    window.localStorage.setItem("weather-units", next)
  }
  return { units: controlled ?? units, choose }
}
