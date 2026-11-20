import assert from "node:assert/strict"
import test from "node:test"

import {
  averageSamples,
  isForecastDate,
  placeForDay,
  preferredUnits,
  weatherName,
  weatherText,
  type WeatherReading,
} from "./weather.ts"

const hanoi: WeatherReading = {
  date: "2027-06-14",
  name: "Hanoi",
  high: 91,
  low: 79,
  precip: 60,
  condition: "Rain",
  typical: true,
  units: "f",
}

test("a date inside 16 days is a forecast and a later date is typical", () => {
  assert.equal(isForecastDate("2026-11-20", "2026-11-20"), true)
  assert.equal(isForecastDate("2026-12-05", "2026-11-20"), true)
  assert.equal(isForecastDate("2026-12-06", "2026-11-20"), false)
  assert.equal(isForecastDate("2026-11-19", "2026-11-20"), false)
})

test("the weather name says the place, the date, and that a later reading is typical", () => {
  assert.equal(weatherName(hanoi), "Hanoi, Jun 14: typical high 91, low 79, 60 percent chance of rain")
  assert.equal(weatherText(hanoi), "Typical 91°/79° · 60% rain")
})

test("a stay night wins over another plan that day", () => {
  const stay = {
    title: "Airbnb",
    planType: "stay" as const,
    startDate: "2027-06-14",
    endDate: "2027-06-16",
    place: { name: "Hanoi", lat: 21.02, lng: 105.85 },
  }
  const dinner = {
    title: "Dinner",
    planType: "place" as const,
    startDate: "2027-06-14",
    endDate: "2027-06-14",
    startTime: "19:00",
    place: { name: "Old Quarter", lat: 21.03, lng: 105.85 },
  }
  assert.equal(placeForDay([dinner, stay], "2027-06-14")?.name, "Hanoi")
  assert.equal(placeForDay([dinner], "2027-06-14")?.name, "Old Quarter")
  assert.equal(placeForDay([stay], "2027-06-16")?.name, "Hanoi")
  assert.equal(placeForDay([stay], "2027-06-17"), null)
})

test("units follow a saved choice, then the locale", () => {
  assert.equal(preferredUnits("en-GB", "f"), "f")
  assert.equal(preferredUnits("en-US", null), "f")
  assert.equal(preferredUnits("vi-VN", null), "c")
})

test("typical weather averages the samples", () => {
  const reading = averageSamples(
    [
      { high: 30, low: 24, code: 61, precip: 100 },
      { high: 32, low: 26, code: 61, precip: 0 },
    ],
    true,
  )
  assert.equal(reading?.high, 31)
  assert.equal(reading?.low, 25)
  assert.equal(reading?.precip, 50)
  assert.equal(reading?.typical, true)
  assert.equal(reading?.condition, "Rain")
})
