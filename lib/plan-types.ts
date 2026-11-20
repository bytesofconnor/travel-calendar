export type PlanType = "stay" | "flight" | "place" | "note"

export type PlaceFeature = "city" | "airport" | "address" | "country" | "region"

export type GeoPlace = {
  name: string
  label?: string
  detail?: string
  kind?: PlaceFeature
  code?: string
  city?: string
  lat?: number
  lng?: number
  country?: string
  timeZone?: string
  population?: number
}
