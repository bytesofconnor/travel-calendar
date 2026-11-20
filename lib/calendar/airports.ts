const AIRPORTS: Record<string, string> = {
  AMS: "Europe/Amsterdam",
  ARN: "Europe/Stockholm",
  ATH: "Europe/Athens",
  ATL: "America/New_York",
  AUS: "America/Chicago",
  BCN: "Europe/Madrid",
  BKK: "Asia/Bangkok",
  BNA: "America/Chicago",
  BOG: "America/Bogota",
  BOS: "America/New_York",
  CDG: "Europe/Paris",
  CLT: "America/New_York",
  CPH: "Europe/Copenhagen",
  CUN: "America/Cancun",
  DEN: "America/Denver",
  DFW: "America/Chicago",
  DUB: "Europe/Dublin",
  DXB: "Asia/Dubai",
  EWR: "America/New_York",
  FCO: "Europe/Rome",
  FRA: "Europe/Berlin",
  GRU: "America/Sao_Paulo",
  HKG: "Asia/Hong_Kong",
  HND: "Asia/Tokyo",
  HNL: "Pacific/Honolulu",
  IAD: "America/New_York",
  IAH: "America/Chicago",
  ICN: "Asia/Seoul",
  JFK: "America/New_York",
  LAS: "America/Los_Angeles",
  LAX: "America/Los_Angeles",
  LHR: "Europe/London",
  LIS: "Europe/Lisbon",
  MAD: "Europe/Madrid",
  MCO: "America/New_York",
  MEX: "America/Mexico_City",
  MIA: "America/New_York",
  MSP: "America/Chicago",
  MUC: "Europe/Berlin",
  NRT: "Asia/Tokyo",
  OAK: "America/Los_Angeles",
  ORD: "America/Chicago",
  PDX: "America/Los_Angeles",
  PHX: "America/Phoenix",
  SAN: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  SIN: "Asia/Singapore",
  SJC: "America/Los_Angeles",
  SLC: "America/Denver",
  SYD: "Australia/Sydney",
  YVR: "America/Vancouver",
  YYZ: "America/Toronto",
  ZRH: "Europe/Zurich",
}

const ZONE_LABELS: Record<string, string> = {
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/New_York": "Eastern Time",
  "America/Phoenix": "Arizona Time",
  "Asia/Tokyo": "Japan time",
  "Australia/Sydney": "Sydney time",
  "Europe/Berlin": "Central Europe",
  "Europe/Lisbon": "Portugal time",
  "Europe/London": "UK time",
  "Europe/Paris": "Central Europe",
  "Pacific/Honolulu": "Hawaii time",
  UTC: "UTC",
}

export const TIME_ZONE_CHOICES = [
  ["America/Los_Angeles", "Pacific Time"],
  ["America/Denver", "Mountain Time"],
  ["America/Chicago", "Central Time"],
  ["America/New_York", "Eastern Time"],
  ["Europe/London", "UK time"],
  ["Europe/Lisbon", "Portugal time"],
  ["Europe/Paris", "Central Europe"],
  ["Asia/Tokyo", "Japan time"],
  ["Australia/Sydney", "Sydney time"],
  ["UTC", "UTC"],
] as const

export function airportTimeZone(place: string | undefined): string | undefined {
  const code = place?.trim().toUpperCase() ?? ""
  if (!/^[A-Z]{3}$/.test(code)) return undefined
  return AIRPORTS[code]
}

export function timeZoneLabel(timeZone: string): string {
  return ZONE_LABELS[timeZone] ?? timeZone.replaceAll("_", " ")
}

const CLOCK_NAMES: Record<string, string> = {
  "America/Chicago": "Central",
  "America/Denver": "Mountain",
  "America/Los_Angeles": "Pacific",
  "America/New_York": "Eastern",
  "America/Phoenix": "Arizona",
  "Asia/Bangkok": "Indochina",
  "Asia/Ho_Chi_Minh": "Vietnam",
  "Asia/Tokyo": "Japan",
  "Australia/Sydney": "Sydney",
  "Europe/Lisbon": "Portugal",
  "Europe/London": "UK",
  "Europe/Paris": "Central Europe",
  "Pacific/Honolulu": "Hawaii",
  UTC: "UTC",
}

export function zoneClockName(timeZone: string): string {
  return CLOCK_NAMES[timeZone] ?? timeZoneLabel(timeZone).replace(/ time$/i, "")
}

export function isIanaTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}
