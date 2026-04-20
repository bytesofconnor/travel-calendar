import { create } from "zustand"

export type Location = string

export type ViewMode = "week" | "month"
export type TripSection = "calendar" | "notes" | "packing"

export interface Trip {
  id: string
  name: string
  inviteCode: string
  startDate: string
  endDate: string
  createdBy: string
  createdAt: string
  coverImageUrl?: string
  coverImagePhotographer?: string
  coverImageSourceUrl?: string
  coverImageQuery?: string
}

export interface TripMember {
  tripId: string
  userId: string
  role: "owner" | "editor"
  displayName: string
  email?: string | null
}

export interface TripItem {
  id: string
  tripId: string
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  location: Location
  locationTo?: Location
  createdBy: string
  createdAt: string
  updatedAt: string
  authorName?: string
}

export interface TripNote {
  tripId: string
  content: string
  updatedBy?: string | null
  updatedAt: string
  createdAt: string
  authorName?: string
}

export interface TripPackingItem {
  id: string
  tripId: string
  label: string
  isChecked: boolean
  sortOrder: number
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
  authorName?: string
}

export interface TripItemInput {
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  location: Location
  locationTo?: Location
}

export interface LocationDef {
  id: string
  name: string
  color: string
  bgClass: string
  borderClass: string
}

export interface CountryDef {
  id: string
  name: string
  flag: string
  locations: LocationDef[]
}

export const COUNTRIES: CountryDef[] = [
  {
    id: "argentina",
    name: "Argentina",
    flag: "🇦🇷",
    locations: [
      { id: "buenos-aires", name: "Buenos Aires", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "patagonia", name: "Patagonia", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
      { id: "mendoza", name: "Mendoza", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "bariloche", name: "Bariloche", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "salta", name: "Salta", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "iguazu-falls", name: "Iguazu Falls", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "cordoba", name: "Córdoba", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "ushuaia", name: "Ushuaia", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "el-calafate", name: "El Calafate", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "cafayate", name: "Cafayate", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
    ],
  },
  {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    locations: [
      { id: "sydney", name: "Sydney", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "melbourne", name: "Melbourne", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "brisbane", name: "Brisbane", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "cairns", name: "Cairns", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "perth", name: "Perth", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "adelaide", name: "Adelaide", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "gold-coast", name: "Gold Coast", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "great-barrier-reef", name: "Great Barrier Reef", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "uluru", name: "Uluru", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "byron-bay", name: "Byron Bay", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
    ],
  },
  {
    id: "bolivia",
    name: "Bolivia",
    flag: "🇧🇴",
    locations: [
      { id: "la-paz", name: "La Paz", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "uyuni", name: "Uyuni Salt Flats", color: "#f5f5f4", bgClass: "bg-stone-200", borderClass: "border-stone-400/40" },
      { id: "sucre", name: "Sucre", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "copacabana", name: "Copacabana", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "santa-cruz", name: "Santa Cruz", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
      { id: "cochabamba", name: "Cochabamba", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
      { id: "potosi", name: "Potosi", color: "#b45309", bgClass: "bg-amber-700", borderClass: "border-amber-700/40" },
      { id: "rurrenabaque", name: "Rurrenabaque", color: "#15803d", bgClass: "bg-green-700", borderClass: "border-green-700/40" },
      { id: "tiwanaku", name: "Tiwanaku", color: "#1d4ed8", bgClass: "bg-blue-700", borderClass: "border-blue-700/40" },
      { id: "oruro", name: "Oruro", color: "#be185d", bgClass: "bg-pink-700", borderClass: "border-pink-700/40" },
      { id: "coroico", name: "Coroico", color: "#4d7c0f", bgClass: "bg-lime-700", borderClass: "border-lime-700/40" },
      { id: "tupiza", name: "Tupiza", color: "#b91c1c", bgClass: "bg-red-700", borderClass: "border-red-700/40" },
      { id: "tarija", name: "Tarija", color: "#a16207", bgClass: "bg-yellow-700", borderClass: "border-yellow-700/40" },
      { id: "samaipata", name: "Samaipata", color: "#0f766e", bgClass: "bg-teal-700", borderClass: "border-teal-700/40" },
      { id: "trinidad", name: "Trinidad", color: "#c2410c", bgClass: "bg-orange-700", borderClass: "border-orange-700/40" },
    ],
  },
  {
    id: "brazil",
    name: "Brazil",
    flag: "🇧🇷",
    locations: [
      { id: "rio-de-janeiro", name: "Rio de Janeiro", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "sao-paulo", name: "São Paulo", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
      { id: "salvador", name: "Salvador", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "florianopolis", name: "Florianópolis", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "manaus", name: "Manaus", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
      { id: "fortaleza", name: "Fortaleza", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "recife", name: "Recife", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "fernando-de-noronha", name: "Fernando de Noronha", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "pantanal", name: "Pantanal", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
      { id: "brasilia", name: "Brasília", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
    ],
  },
  {
    id: "canada",
    name: "Canada",
    flag: "🇨🇦",
    locations: [
      { id: "toronto", name: "Toronto", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "vancouver", name: "Vancouver", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "montreal", name: "Montréal", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "quebec-city", name: "Québec City", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "banff", name: "Banff", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "jasper", name: "Jasper", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "victoria", name: "Victoria", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "calgary", name: "Calgary", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "ottawa", name: "Ottawa", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "niagara-falls", name: "Niagara Falls", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
    ],
  },
  {
    id: "colombia",
    name: "Colombia",
    flag: "🇨🇴",
    locations: [
      { id: "bogota", name: "Bogotá", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "medellin", name: "Medellín", color: "#7c3aed", bgClass: "bg-violet-600", borderClass: "border-violet-600/40" },
      { id: "cartagena", name: "Cartagena", color: "#db2777", bgClass: "bg-pink-600", borderClass: "border-pink-600/40" },
      { id: "santa-marta", name: "Santa Marta", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "cali", name: "Cali", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "san-andres", name: "San Andrés", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "coffee-region", name: "Coffee Region", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
      { id: "tayrona", name: "Tayrona", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "villa-de-leyva", name: "Villa de Leyva", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "popayan", name: "Popayán", color: "#f5f5f4", bgClass: "bg-stone-200", borderClass: "border-stone-400/40" },
    ],
  },
  {
    id: "france",
    name: "France",
    flag: "🇫🇷",
    locations: [
      { id: "paris", name: "Paris", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "nice", name: "Nice", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "lyon", name: "Lyon", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "bordeaux", name: "Bordeaux", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "strasbourg", name: "Strasbourg", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "marseille", name: "Marseille", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "normandy", name: "Normandy", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "loire-valley", name: "Loire Valley", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "mont-saint-michel", name: "Mont Saint-Michel", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "versailles", name: "Versailles", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
    ],
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    locations: [
      { id: "berlin", name: "Berlin", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
      { id: "munich", name: "Munich", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "hamburg", name: "Hamburg", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "cologne", name: "Cologne", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "frankfurt", name: "Frankfurt", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "heidelberg", name: "Heidelberg", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "dresden", name: "Dresden", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "neuschwanstein", name: "Neuschwanstein", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "black-forest", name: "Black Forest", color: "#15803d", bgClass: "bg-green-700", borderClass: "border-green-700/40" },
      { id: "nuremberg", name: "Nuremberg", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
    ],
  },
  {
    id: "greece",
    name: "Greece",
    flag: "🇬🇷",
    locations: [
      { id: "athens", name: "Athens", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "santorini", name: "Santorini", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "mykonos", name: "Mykonos", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "crete", name: "Crete", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "rhodes", name: "Rhodes", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "corfu", name: "Corfu", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "thessaloniki", name: "Thessaloniki", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "meteora", name: "Meteora", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "zakynthos", name: "Zakynthos", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "delphi", name: "Delphi", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
    ],
  },
  {
    id: "iceland",
    name: "Iceland",
    flag: "🇮🇸",
    locations: [
      { id: "reykjavik", name: "Reykjavik", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "golden-circle", name: "Golden Circle", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "blue-lagoon", name: "Blue Lagoon", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "south-coast", name: "South Coast", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
      { id: "akureyri", name: "Akureyri", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "westfjords", name: "Westfjords", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "snaefellsnes", name: "Snæfellsnes", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "vatnajokull", name: "Vatnajökull", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "vik", name: "Vík", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "husavik", name: "Húsavík", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
    ],
  },
  {
    id: "india",
    name: "India",
    flag: "🇮🇳",
    locations: [
      { id: "delhi", name: "Delhi", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "mumbai", name: "Mumbai", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "agra", name: "Agra", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "jaipur", name: "Jaipur", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "goa", name: "Goa", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "varanasi", name: "Varanasi", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "kerala", name: "Kerala", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
      { id: "bangalore", name: "Bangalore", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "udaipur", name: "Udaipur", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "amritsar", name: "Amritsar", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
    ],
  },
  {
    id: "italy",
    name: "Italy",
    flag: "🇮🇹",
    locations: [
      { id: "rome", name: "Rome", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "florence", name: "Florence", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "venice", name: "Venice", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "milan", name: "Milan", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "naples", name: "Naples", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "amalfi-coast", name: "Amalfi Coast", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "cinque-terre", name: "Cinque Terre", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "sicily", name: "Sicily", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "turin", name: "Turin", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "bologna", name: "Bologna", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
    ],
  },
  {
    id: "japan",
    name: "Japan",
    flag: "🇯🇵",
    locations: [
      { id: "tokyo", name: "Tokyo", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "kyoto", name: "Kyoto", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "osaka", name: "Osaka", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "nara", name: "Nara", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "hiroshima", name: "Hiroshima", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "hakone", name: "Hakone", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "sapporo", name: "Sapporo", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "okinawa", name: "Okinawa", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "nikko", name: "Nikkō", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "kanazawa", name: "Kanazawa", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
    ],
  },
  {
    id: "mexico",
    name: "Mexico",
    flag: "🇲🇽",
    locations: [
      { id: "mexico-city", name: "Mexico City", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "cancun", name: "Cancún", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "tulum", name: "Tulum", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "playa-del-carmen", name: "Playa del Carmen", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "oaxaca", name: "Oaxaca", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "guadalajara", name: "Guadalajara", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "san-miguel-de-allende", name: "San Miguel de Allende", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "merida", name: "Mérida", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "cabo-san-lucas", name: "Cabo San Lucas", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "puerto-vallarta", name: "Puerto Vallarta", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
    ],
  },
  {
    id: "morocco",
    name: "Morocco",
    flag: "🇲🇦",
    locations: [
      { id: "marrakech", name: "Marrakech", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "fes", name: "Fès", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "casablanca", name: "Casablanca", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "chefchaouen", name: "Chefchaouen", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "essaouira", name: "Essaouira", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "sahara-desert", name: "Sahara Desert", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
      { id: "rabat", name: "Rabat", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "meknes", name: "Meknès", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "tangier", name: "Tangier", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "agadir", name: "Agadir", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
    ],
  },
  {
    id: "netherlands",
    name: "Netherlands",
    flag: "🇳🇱",
    locations: [
      { id: "amsterdam", name: "Amsterdam", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "rotterdam", name: "Rotterdam", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "the-hague", name: "The Hague", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "utrecht", name: "Utrecht", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "delft", name: "Delft", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "haarlem", name: "Haarlem", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "eindhoven", name: "Eindhoven", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "maastricht", name: "Maastricht", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "zaanse-schans", name: "Zaanse Schans", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "keukenhof", name: "Keukenhof", color: "#f43f5e", bgClass: "bg-rose-500", borderClass: "border-rose-500/40" },
    ],
  },
  {
    id: "new-zealand",
    name: "New Zealand",
    flag: "🇳🇿",
    locations: [
      { id: "auckland", name: "Auckland", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "queenstown", name: "Queenstown", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "christchurch", name: "Christchurch", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "wellington", name: "Wellington", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "rotorua", name: "Rotorua", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "milford-sound", name: "Milford Sound", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "bay-of-islands", name: "Bay of Islands", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "wanaka", name: "Wānaka", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "taupo", name: "Taupō", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "abel-tasman", name: "Abel Tasman", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
    ],
  },
  {
    id: "peru",
    name: "Peru",
    flag: "🇵🇪",
    locations: [
      { id: "lima", name: "Lima", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "cusco", name: "Cusco", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "sacred-valley", name: "Sacred Valley", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "machu-picchu", name: "Machu Picchu", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "arequipa", name: "Arequipa", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "colca-canyon", name: "Colca Canyon", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "huacachina", name: "Huacachina", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "puno", name: "Puno", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "lake-titicaca", name: "Lake Titicaca", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "nazca", name: "Nazca", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "iquitos", name: "Iquitos", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
      { id: "trujillo", name: "Trujillo", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "paracas", name: "Paracas", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "huaraz", name: "Huaraz", color: "#7c3aed", bgClass: "bg-violet-600", borderClass: "border-violet-600/40" },
      { id: "mancora", name: "Máncora", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
    ],
  },
  {
    id: "portugal",
    name: "Portugal",
    flag: "🇵🇹",
    locations: [
      { id: "lisbon", name: "Lisbon", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "porto", name: "Porto", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "algarve", name: "Algarve", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "sintra", name: "Sintra", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "funchal", name: "Funchal", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "evora", name: "Évora", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "douro-valley", name: "Douro Valley", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "cascais", name: "Cascais", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "braga", name: "Braga", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "obidos", name: "Óbidos", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
    ],
  },
  {
    id: "spain",
    name: "Spain",
    flag: "🇪🇸",
    locations: [
      { id: "barcelona", name: "Barcelona", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "madrid", name: "Madrid", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "seville", name: "Seville", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "granada", name: "Granada", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "valencia", name: "Valencia", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "bilbao", name: "Bilbao", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "mallorca", name: "Mallorca", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "san-sebastian", name: "San Sebastián", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "ibiza", name: "Ibiza", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
      { id: "toledo", name: "Toledo", color: "#a16207", bgClass: "bg-yellow-700", borderClass: "border-yellow-700/40" },
    ],
  },
  {
    id: "thailand",
    name: "Thailand",
    flag: "🇹🇭",
    locations: [
      { id: "bangkok", name: "Bangkok", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "chiang-mai", name: "Chiang Mai", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "phuket", name: "Phuket", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "koh-samui", name: "Koh Samui", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "ayutthaya", name: "Ayutthaya", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "krabi", name: "Krabi", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "pattaya", name: "Pattaya", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "pai", name: "Pai", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "koh-phi-phi", name: "Koh Phi Phi", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "chiang-rai", name: "Chiang Rai", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
    ],
  },
  {
    id: "turkey",
    name: "Turkey",
    flag: "🇹🇷",
    locations: [
      { id: "istanbul", name: "Istanbul", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "cappadocia", name: "Cappadocia", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "antalya", name: "Antalya", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "bodrum", name: "Bodrum", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "pamukkale", name: "Pamukkale", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "ephesus", name: "Ephesus", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "izmir", name: "İzmir", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "konya", name: "Konya", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "ankara", name: "Ankara", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "trabzon", name: "Trabzon", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
    ],
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    locations: [
      { id: "london", name: "London", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "edinburgh", name: "Edinburgh", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "manchester", name: "Manchester", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "liverpool", name: "Liverpool", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
      { id: "bath", name: "Bath", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "oxford", name: "Oxford", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "cambridge", name: "Cambridge", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "lake-district", name: "Lake District", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
      { id: "york", name: "York", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "brighton", name: "Brighton", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
    ],
  },
  {
    id: "usa",
    name: "United States",
    flag: "🇺🇸",
    locations: [
      { id: "new-york", name: "New York", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
      { id: "los-angeles", name: "Los Angeles", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "san-francisco", name: "San Francisco", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "las-vegas", name: "Las Vegas", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "miami", name: "Miami", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "chicago", name: "Chicago", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "new-orleans", name: "New Orleans", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "hawaii", name: "Hawaii", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "washington-dc", name: "Washington DC", color: "#dc2626", bgClass: "bg-red-600", borderClass: "border-red-600/40" },
      { id: "grand-canyon", name: "Grand Canyon", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
      { id: "minnesota", name: "Minneapolis / Minnesota", color: "#7c3aed", bgClass: "bg-violet-700", borderClass: "border-violet-700/40" },
    ],
  },
  {
    id: "vietnam",
    name: "Vietnam",
    flag: "🇻🇳",
    locations: [
      { id: "hanoi", name: "Hanoi", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
      { id: "ho-chi-minh-city", name: "Ho Chi Minh City", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
      { id: "hoi-an", name: "Hội An", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
      { id: "ha-long-bay", name: "Hạ Long Bay", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
      { id: "da-nang", name: "Đà Nẵng", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
      { id: "hue", name: "Huế", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
      { id: "sapa", name: "Sapa", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
      { id: "phu-quoc", name: "Phú Quốc", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
      { id: "ninh-binh", name: "Ninh Bình", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
      { id: "dalat", name: "Đà Lạt", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
    ],
  },
]

// Flat list of all locations + travel sentinel, for backward-compat lookup
export const LOCATIONS: LocationDef[] = [
  ...COUNTRIES.flatMap((c) => c.locations),
  { id: "travel", name: "Travel/Transit", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
]

export const DEFAULT_TRIP_NAME = "Peru & Bolivia 2026"
export const DEFAULT_TRIP_START = "2026-04-27"
export const DEFAULT_TRIP_END = "2026-06-30"

interface CalendarUiStore {
  currentWeekStart: string
  currentMonth: string
  viewMode: ViewMode
  tripStart: string
  tripEnd: string
  initializeForTrip: (startDate: string, endDate: string) => void
  setCurrentWeek: (date: string) => void
  setCurrentMonth: (month: string) => void
  setViewMode: (mode: ViewMode) => void
  nextWeek: () => void
  prevWeek: () => void
  nextMonth: () => void
  prevMonth: () => void
}

export function getLocationById(id: Location): LocationDef {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0]
}

export function getCountryForLocation(locationId: string): CountryDef | undefined {
  return COUNTRIES.find((country) => country.locations.some((loc) => loc.id === locationId))
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTodayString() {
  return formatDate(new Date())
}

export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  const day = date.getDay()
  const diff = date.getDate() - day
  const weekStart = new Date(date)
  weekStart.setDate(diff)
  return formatDate(weekStart)
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00")
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

export function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function getDaysInWeek(weekStart: string): { date: string; dayName: string; dayNum: number; month: string }[] {
  const days: { date: string; dayName: string; dayNum: number; month: string }[] = []
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index)
    const day = new Date(date + "T12:00:00")
    days.push({
      date,
      dayName: dayNames[day.getDay()],
      dayNum: day.getDate(),
      month: day.toLocaleDateString("en-US", { month: "short" }),
    })
  }

  return days
}

export function getDaysInMonth(monthStr: string): { date: string; dayNum: number; isCurrentMonth: boolean }[] {
  const [year, month] = monthStr.split("-").map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPadding = firstDay.getDay()
  const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = []

  for (let index = startPadding - 1; index >= 0; index -= 1) {
    const day = new Date(year, month - 1, -index)
    days.push({
      date: formatDate(day),
      dayNum: day.getDate(),
      isCurrentMonth: false,
    })
  }

  for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum += 1) {
    const day = new Date(year, month - 1, dayNum)
    days.push({
      date: formatDate(day),
      dayNum,
      isCurrentMonth: true,
    })
  }

  const remaining = 42 - days.length
  for (let dayNum = 1; dayNum <= remaining; dayNum += 1) {
    const day = new Date(year, month, dayNum)
    days.push({
      date: formatDate(day),
      dayNum,
      isCurrentMonth: false,
    })
  }

  return days
}

export function getItemsForWeek(items: TripItem[], weekStart: string): TripItem[] {
  const weekEnd = addDays(weekStart, 6)
  return items.filter((item) => item.startDate <= weekEnd && item.endDate >= weekStart)
}

export function getItemsForDate(items: TripItem[], date: string): TripItem[] {
  return items.filter((item) => item.startDate <= date && item.endDate >= date)
}

export function generateICS(items: TripItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const item of items) {
    const startDate = item.startDate.replace(/-/g, "")
    const endDate = addDays(item.endDate, 1).replace(/-/g, "")
    const location = getLocationById(item.location)
    const locationName = item.locationTo
      ? `${location.name} to ${getLocationById(item.locationTo).name}`
      : location.name

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@shared-trip-calendar`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${item.title}`,
      `LOCATION:${locationName}`,
      item.notes ? `DESCRIPTION:${item.notes.replace(/\n/g, "\\n")}` : "",
      item.link ? `URL:${item.link.url}` : "",
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")
  return lines.filter(Boolean).join("\r\n")
}

export function formatRelativeTime(value: string) {
  const targetTime = new Date(value).getTime()
  const diffMs = targetTime - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const absMinutes = Math.abs(diffMinutes)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, "minute")
  }

  const diffHours = Math.round(diffMinutes / 60)
  const absHours = Math.abs(diffHours)
  if (absHours < 24) {
    return rtf.format(diffHours, "hour")
  }

  const diffDays = Math.round(diffHours / 24)
  const absDays = Math.abs(diffDays)
  if (absDays < 7) {
    return rtf.format(diffDays, "day")
  }

  const diffWeeks = Math.round(diffDays / 7)
  if (Math.abs(diffWeeks) < 5) {
    return rtf.format(diffWeeks, "week")
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month")
  }

  const diffYears = Math.round(diffDays / 365)
  return rtf.format(diffYears, "year")
}

export function mapMembersByUserId(members: TripMember[]) {
  return new Map(members.map((member) => [member.userId, member]))
}

export function withAuthorNames(items: TripItem[], members: TripMember[]) {
  const membersById = mapMembersByUserId(members)
  return items.map((item) => ({
    ...item,
    authorName: membersById.get(item.createdBy)?.displayName ?? item.authorName,
  }))
}

export function withNoteAuthorName(note: TripNote, members: TripMember[]) {
  const membersById = mapMembersByUserId(members)
  return {
    ...note,
    authorName: note.updatedBy ? membersById.get(note.updatedBy)?.displayName ?? note.authorName : note.authorName,
  }
}

export function withPackingAuthorNames(items: TripPackingItem[], members: TripMember[]) {
  const membersById = mapMembersByUserId(members)
  return items.map((item) => ({
    ...item,
    authorName: item.updatedBy ? membersById.get(item.updatedBy)?.displayName ?? item.authorName : item.authorName,
  }))
}

export const useCalendarStore = create<CalendarUiStore>()((set, get) => ({
  currentWeekStart: getWeekStart(DEFAULT_TRIP_START),
  currentMonth: getMonthStart(DEFAULT_TRIP_START),
  viewMode: "week",
  tripStart: DEFAULT_TRIP_START,
  tripEnd: DEFAULT_TRIP_END,

  initializeForTrip: (startDate, endDate) =>
    set((state) => {
      const normalizedWeek = getWeekStart(startDate)
      const nextState: Partial<CalendarUiStore> = {
        tripStart: startDate,
        tripEnd: endDate,
      }

      if (state.currentWeekStart < getWeekStart(startDate) || state.currentWeekStart > getWeekStart(endDate)) {
        nextState.currentWeekStart = normalizedWeek
      }

      if (state.currentMonth < getMonthStart(startDate) || state.currentMonth > getMonthStart(endDate)) {
        nextState.currentMonth = getMonthStart(startDate)
      }

      return nextState as CalendarUiStore
    }),

  setCurrentWeek: (date) =>
    set({
      currentWeekStart: getWeekStart(date),
      currentMonth: getMonthStart(date),
    }),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setViewMode: (mode) => set({ viewMode: mode }),

  nextWeek: () => {
    const current = get().currentWeekStart
    const next = addDays(current, 7)
    const tripEndWeek = getWeekStart(get().tripEnd)
    if (next <= tripEndWeek) {
      set({
        currentWeekStart: next,
        currentMonth: getMonthStart(next),
      })
    }
  },

  prevWeek: () => {
    const current = get().currentWeekStart
    const previous = addDays(current, -7)
    const tripStartWeek = getWeekStart(get().tripStart)
    if (previous >= tripStartWeek) {
      set({
        currentWeekStart: previous,
        currentMonth: getMonthStart(previous),
      })
    }
  },

  nextMonth: () => {
    const [year, month] = get().currentMonth.split("-").map(Number)
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`
    const maxMonth = getMonthStart(get().tripEnd)
    if (nextMonth <= maxMonth) {
      set({ currentMonth: nextMonth })
    }
  },

  prevMonth: () => {
    const [year, month] = get().currentMonth.split("-").map(Number)
    const previousMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`
    const minMonth = getMonthStart(get().tripStart)
    if (previousMonth >= minMonth) {
      set({ currentMonth: previousMonth })
    }
  },
}))
