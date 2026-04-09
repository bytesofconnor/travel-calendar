import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Author = "brenda" | "connor"

export type Location = 
  | "lima"
  | "cusco" 
  | "sacred-valley"
  | "machu-picchu"
  | "arequipa"
  | "colca-canyon"
  | "huacachina"
  | "puno"
  | "lake-titicaca"
  | "la-paz"
  | "uyuni"
  | "sucre"
  | "copacabana"
  | "santa-cruz"
  | "cochabamba"
  | "potosi"
  | "oruro"
  | "rurrenabaque"
  | "tupiza"
  | "tarija"
  | "samaipata"
  | "tiwanaku"
  | "coroico"
  | "trinidad"
  | "medellin"
  | "cartagena"
  | "washington-dc"
  | "minnesota"
  | "travel"

export const LOCATIONS: { id: Location; name: string; color: string; bgClass: string; borderClass: string }[] = [
  { id: "lima", name: "Lima", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
  { id: "cusco", name: "Cusco", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
  { id: "sacred-valley", name: "Sacred Valley", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
  { id: "machu-picchu", name: "Machu Picchu", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
  { id: "arequipa", name: "Arequipa", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
  { id: "colca-canyon", name: "Colca Canyon", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
  { id: "huacachina", name: "Huacachina", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
  { id: "puno", name: "Puno", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
  { id: "lake-titicaca", name: "Lake Titicaca", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
  { id: "la-paz", name: "La Paz", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
  { id: "uyuni", name: "Uyuni Salt Flats", color: "#f5f5f4", bgClass: "bg-stone-200", borderClass: "border-stone-400/40" },
  { id: "sucre", name: "Sucre", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
  { id: "copacabana", name: "Copacabana", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
  { id: "santa-cruz", name: "Santa Cruz", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
  { id: "cochabamba", name: "Cochabamba", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
  { id: "potosi", name: "Potosí", color: "#b45309", bgClass: "bg-amber-700", borderClass: "border-amber-700/40" },
  { id: "oruro", name: "Oruro", color: "#be185d", bgClass: "bg-pink-700", borderClass: "border-pink-700/40" },
  { id: "rurrenabaque", name: "Rurrenabaque", color: "#15803d", bgClass: "bg-green-700", borderClass: "border-green-700/40" },
  { id: "tupiza", name: "Tupiza", color: "#b91c1c", bgClass: "bg-red-700", borderClass: "border-red-700/40" },
  { id: "tarija", name: "Tarija", color: "#a16207", bgClass: "bg-yellow-700", borderClass: "border-yellow-700/40" },
  { id: "samaipata", name: "Samaipata", color: "#0f766e", bgClass: "bg-teal-700", borderClass: "border-teal-700/40" },
  { id: "tiwanaku", name: "Tiwanaku", color: "#1d4ed8", bgClass: "bg-blue-700", borderClass: "border-blue-700/40" },
  { id: "coroico", name: "Coroico", color: "#4d7c0f", bgClass: "bg-lime-700", borderClass: "border-lime-700/40" },
  { id: "trinidad", name: "Trinidad", color: "#c2410c", bgClass: "bg-orange-700", borderClass: "border-orange-700/40" },
  { id: "medellin", name: "Medellín", color: "#7c3aed", bgClass: "bg-violet-600", borderClass: "border-violet-600/40" },
  { id: "cartagena", name: "Cartagena", color: "#db2777", bgClass: "bg-pink-600", borderClass: "border-pink-600/40" },
  { id: "washington-dc", name: "Washington DC", color: "#dc2626", bgClass: "bg-red-600", borderClass: "border-red-600/40" },
  { id: "minnesota", name: "Minnesota", color: "#7c3aed", bgClass: "bg-violet-700", borderClass: "border-violet-700/40" },
  { id: "travel", name: "Travel/Transit", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
]

export function getLocationById(id: Location) {
  return LOCATIONS.find(l => l.id === id) || LOCATIONS[0]
}

export interface TripItem {
  id: string
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  author?: Author
  location: Location
  locationTo?: Location // For travel between places
}

export type ViewMode = "week" | "month"

interface TripStore {
  items: TripItem[]
  currentWeekStart: string
  currentMonth: string
  viewMode: ViewMode
  addItem: (item: Omit<TripItem, "id">) => void
  updateItem: (id: string, updates: Partial<TripItem>) => void
  deleteItem: (id: string) => void
  setCurrentWeek: (date: string) => void
  setCurrentMonth: (month: string) => void
  setViewMode: (mode: ViewMode) => void
  nextWeek: () => void
  prevWeek: () => void
  nextMonth: () => void
  prevMonth: () => void
}

const TRIP_START = "2026-04-27"
const TRIP_END = "2026-06-30"

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  const day = date.getDay()
  const diff = date.getDate() - day
  const weekStart = new Date(date)
  weekStart.setDate(diff)
  return weekStart.toISOString().split("T")[0]
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00")
  date.setDate(date.getDate() + days)
  return date.toISOString().split("T")[0]
}

function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

const defaultItems: TripItem[] = [
  {
    id: "1",
    title: "Fly to Lima",
    notes: "LATAM Airlines, arrives 11pm",
    startDate: "2026-05-01",
    endDate: "2026-05-01",
    author: "connor",
    location: "lima",
    link: { label: "Booking", url: "https://www.latam.com" }
  },
  {
    id: "2",
    title: "Lima Airbnb",
    notes: "Miraflores district",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    author: "brenda",
    location: "lima",
    link: { label: "Airbnb", url: "https://www.airbnb.com" }
  },
  {
    id: "3",
    title: "Lima to Cusco",
    notes: "Morning flight",
    startDate: "2026-05-04",
    endDate: "2026-05-04",
    author: "connor",
    location: "lima",
    locationTo: "cusco",
  },
  {
    id: "4",
    title: "Cusco Acclimatization",
    notes: "Take it easy, drink coca tea",
    startDate: "2026-05-04",
    endDate: "2026-05-05",
    author: "connor",
    location: "cusco",
  },
  {
    id: "5",
    title: "Inca Trail Trek",
    notes: "4 days to Machu Picchu",
    startDate: "2026-05-06",
    endDate: "2026-05-09",
    author: "brenda",
    location: "machu-picchu",
    link: { label: "Tour", url: "https://www.incatrailpermits.com" }
  },
]

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      items: defaultItems,
      currentWeekStart: getWeekStart(TRIP_START),
      currentMonth: getMonthStart(TRIP_START),
      viewMode: "week",

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: crypto.randomUUID() }],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      setCurrentWeek: (date) =>
        set({ currentWeekStart: getWeekStart(date) }),

      setCurrentMonth: (month) =>
        set({ currentMonth: month }),

      setViewMode: (mode) =>
        set({ viewMode: mode }),

      nextWeek: () => {
        const current = get().currentWeekStart
        const next = addDays(current, 7)
        const tripEndWeek = getWeekStart(TRIP_END)
        if (next <= tripEndWeek) {
          set({ currentWeekStart: next })
        }
      },

      prevWeek: () => {
        const current = get().currentWeekStart
        const prev = addDays(current, -7)
        const tripStartWeek = getWeekStart(TRIP_START)
        if (prev >= tripStartWeek) {
          set({ currentWeekStart: prev })
        }
      },

      nextMonth: () => {
        const [year, month] = get().currentMonth.split("-").map(Number)
        if (month === 12) {
          set({ currentMonth: `${year + 1}-01` })
        } else {
          set({ currentMonth: `${year}-${String(month + 1).padStart(2, "0")}` })
        }
      },

      prevMonth: () => {
        const [year, month] = get().currentMonth.split("-").map(Number)
        if (month === 1) {
          set({ currentMonth: `${year - 1}-12` })
        } else {
          set({ currentMonth: `${year}-${String(month - 1).padStart(2, "0")}` })
        }
      },
    }),
    {
      name: "peru-bolivia-trip-v1",
    }
  )
)

export function getDaysInWeek(weekStart: string): { date: string; dayName: string; dayNum: number; month: string }[] {
  const days: { date: string; dayName: string; dayNum: number; month: string }[] = []
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    const d = new Date(date + "T12:00:00")
    days.push({
      date,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" })
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
  
  // Add previous month days
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i)
    days.push({
      date: d.toISOString().split("T")[0],
      dayNum: d.getDate(),
      isCurrentMonth: false
    })
  }
  
  // Add current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month - 1, i)
    days.push({
      date: d.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: true
    })
  }
  
  // Add next month days to complete the grid
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i)
    days.push({
      date: d.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: false
    })
  }
  
  return days
}

export function getItemsForWeek(items: TripItem[], weekStart: string): TripItem[] {
  const weekEnd = addDays(weekStart, 6)
  return items.filter(item => {
    return item.startDate <= weekEnd && item.endDate >= weekStart
  })
}

export function getItemsForDate(items: TripItem[], date: string): TripItem[] {
  return items.filter(item => {
    return item.startDate <= date && item.endDate >= date
  })
}

export function generateICS(items: TripItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peru Bolivia 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const item of items) {
    const startDate = item.startDate.replace(/-/g, "")
    const endDate = addDays(item.endDate, 1).replace(/-/g, "") // ICS end dates are exclusive
    const location = getLocationById(item.location)
    const locationName = item.locationTo 
      ? `${location.name} to ${getLocationById(item.locationTo).name}`
      : location.name

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@peru-bolivia-2026`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${item.title}`,
      `LOCATION:${locationName}`,
      item.notes ? `DESCRIPTION:${item.notes.replace(/\n/g, "\\n")}` : "",
      item.link ? `URL:${item.link.url}` : "",
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR")
  return lines.filter(Boolean).join("\r\n")
}

export { TRIP_START, TRIP_END }
