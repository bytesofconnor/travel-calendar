import { v } from "convex/values"

export const planTypeValidator = v.union(
  v.literal("stay"),
  v.literal("flight"),
  v.literal("place"),
  v.literal("note"),
)

export const geoPlaceValidator = v.object({
  name: v.string(),
  lat: v.number(),
  lng: v.number(),
  country: v.optional(v.string()),
  timeZone: v.optional(v.string()),
})
