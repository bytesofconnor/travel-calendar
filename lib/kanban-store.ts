import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Author = "brenda" | "connor"

export interface TripItem {
  id: string
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  author?: Author
  color: "violet" | "blue" | "emerald" | "amber" | "rose"
}

interface TripStore {
  items: TripItem[]
  currentWeekStart: string
  addItem: (item: Omit<TripItem, "id">) => void
  updateItem: (id: string, updates: Partial<TripItem>) => void
  deleteItem: (id: string) => void
  setCurrentWeek: (date: string) => void
  nextWeek: () => void
  prevWeek: () => void
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

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00")
  date.setDate(date.getDate() + days)
  return date.toISOString().split("T")[0]
}

const defaultItems: TripItem[] = [
  {
    id: "1",
    title: "Flight to Lima",
    notes: "LATAM Airlines, arrives 11pm",
    startDate: "2026-05-01",
    endDate: "2026-05-01",
    author: "connor",
    color: "blue",
    link: { label: "Booking", url: "https://www.latam.com" }
  },
  {
    id: "2",
    title: "Lima Airbnb",
    notes: "Miraflores district",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    author: "brenda",
    color: "violet",
    link: { label: "Airbnb", url: "https://www.airbnb.com" }
  },
  {
    id: "3",
    title: "Cusco Acclimatization",
    notes: "Take it easy, drink coca tea",
    startDate: "2026-05-04",
    endDate: "2026-05-05",
    author: "connor",
    color: "emerald",
  },
  {
    id: "4",
    title: "Inca Trail Trek",
    notes: "4 days to Machu Picchu",
    startDate: "2026-05-06",
    endDate: "2026-05-09",
    author: "brenda",
    color: "amber",
    link: { label: "Tour", url: "https://www.incatrailpermits.com" }
  },
]

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      items: defaultItems,
      currentWeekStart: getWeekStart(TRIP_START),

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
    }),
    {
      name: "peru-trip-v5",
    }
  )
)

export function getWeeksInRange(): { start: string; label: string }[] {
  const weeks: { start: string; label: string }[] = []
  let current = getWeekStart(TRIP_START)
  const endWeek = getWeekStart(TRIP_END)
  
  while (current <= endWeek) {
    const end = addDays(current, 6)
    const startDate = new Date(current + "T12:00:00")
    const endDate = new Date(end + "T12:00:00")
    
    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" })
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" })
    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    
    const label = startMonth === endMonth 
      ? `${startMonth} ${startDay}-${endDay}`
      : `${startMonth} ${startDay} - ${endMonth} ${endDay}`
    
    weeks.push({ start: current, label })
    current = addDays(current, 7)
  }
  
  return weeks
}

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

export function getItemsForWeek(items: TripItem[], weekStart: string): TripItem[] {
  const weekEnd = addDays(weekStart, 6)
  return items.filter(item => {
    return item.startDate <= weekEnd && item.endDate >= weekStart
  })
}

export { addDays }
