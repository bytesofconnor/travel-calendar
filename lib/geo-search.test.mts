import assert from "node:assert/strict"
import test from "node:test"

import { dedupePlaces, matchAirports, placesFromMeteo, placesFromPhoton, suggestPlaces } from "./geo-search.ts"

test("a city or code matches an airport", () => {
  assert.equal(matchAirports("han")[0]?.name, "Noi Bai Airport")
  assert.equal(matchAirports("han")[0]?.label, "HAN · Hanoi")
  assert.equal(matchAirports("Hanoi")[0]?.timeZone, "Asia/Ho_Chi_Minh")
  assert.equal(matchAirports("a").length, 0)
})

test("Open-Meteo cities become places", () => {
  const places = placesFromMeteo({
    results: [
      {
        name: "Hanoi",
        latitude: 21.0245,
        longitude: 105.8412,
        country_code: "VN",
        timezone: "Asia/Bangkok",
        admin1: "Hanoi",
      },
    ],
  })
  assert.deepEqual(places[0], {
    name: "Hanoi",
    label: "Hanoi",
    kind: "city",
    city: "Hanoi",
    lat: 21.0245,
    lng: 105.8412,
    country: "VN",
    timeZone: "Asia/Bangkok",
  })
})

test("Photon addresses keep a street", () => {
  const places = placesFromPhoton({
    features: [
      {
        geometry: { coordinates: [105.85, 21.03] },
        properties: {
          name: "Cafe",
          housenumber: "12",
          street: "Hang Gai",
          city: "Hanoi",
          countrycode: "VN",
        },
      },
    ],
  })
  assert.equal(places[0]?.name, "Cafe, 12 Hang Gai, Hanoi")
  assert.equal(places[0]?.lat, 21.03)
  assert.equal(places[0]?.country, "VN")
})

test("DC, Vietnam, and HAN rank ahead of small names", () => {
  const dc = suggestPlaces("DC", "flight")
  assert.equal(dc[0]?.name, "Washington, D.C.")
  assert.equal(dc[0]?.timeZone, "America/New_York")
  const vietnam = suggestPlaces("vietnam", "place", [
    { name: "Vietnam", label: "Vietnam", kind: "city", lat: 18.4, lng: -66.1, country: "PR", population: 90_000, city: "Guaynabo" },
    { name: "Douar Sfari", label: "Douar Sfari", kind: "city", lat: 33, lng: -7, country: "MA", population: 1000 },
  ])
  assert.equal(vietnam[0]?.kind, "country")
  assert.equal(vietnam[0]?.name, "Vietnam")
  assert.equal(vietnam[1]?.country, "VN")
  const han = suggestPlaces("HAN", "flight")
  assert.equal(han[0]?.kind, "airport")
  assert.equal(han[0]?.label, "HAN · Hanoi")
  assert.equal(han[0]?.timeZone, "Asia/Ho_Chi_Minh")
})

test("duplicate places collapse", () => {
  const place = { name: "Hanoi", lat: 21, lng: 105 }
  assert.equal(dedupePlaces([place, place]).length, 1)
})
