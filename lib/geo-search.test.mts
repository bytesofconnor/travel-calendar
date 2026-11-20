import assert from "node:assert/strict"
import test from "node:test"

import { dedupePlaces, matchAirports, placesFromMeteo, placesFromPhoton } from "./geo-search.ts"

test("a city or code matches an airport", () => {
  assert.equal(matchAirports("han")[0]?.name, "Hanoi (HAN)")
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

test("duplicate places collapse", () => {
  const place = { name: "Hanoi", lat: 21, lng: 105 }
  assert.equal(dedupePlaces([place, place]).length, 1)
})
