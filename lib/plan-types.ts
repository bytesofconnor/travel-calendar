export type PlanType = "stay" | "flight" | "place" | "note"

export type GeoPlace = {
  name: string
  lat?: number
  lng?: number
  country?: string
  timeZone?: string
}
