import { v } from "convex/values"

export const planTypeValidator = v.union(
  v.literal("stay"),
  v.literal("flight"),
  v.literal("place"),
  v.literal("note"),
)

export const travelModeValidator = v.union(
  v.literal("flight"),
  v.literal("train"),
  v.literal("bus"),
  v.literal("shuttle"),
  v.literal("taxi"),
  v.literal("walk"),
)

export const geoPlaceValidator = v.object({
  name: v.string(),
  lat: v.number(),
  lng: v.number(),
  label: v.optional(v.string()),
  kind: v.optional(
    v.union(v.literal("city"), v.literal("airport"), v.literal("address"), v.literal("country"), v.literal("region")),
  ),
  code: v.optional(v.string()),
  city: v.optional(v.string()),
  country: v.optional(v.string()),
  timeZone: v.optional(v.string()),
})
