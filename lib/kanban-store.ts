import { create } from "zustand"
import { persist } from "zustand/middleware"

export type CardColor = "coral" | "sand" | "sage" | "sky" | "lavender"

export interface Link {
  id: string
  label: string
  url: string
}

export interface TravelCard {
  id: string
  title: string
  description: string
  color: CardColor
  links: Link[]
  columnId: string
}

export interface Column {
  id: string
  title: string
}

interface KanbanState {
  columns: Column[]
  cards: TravelCard[]
  addColumn: (title: string) => void
  updateColumn: (id: string, title: string) => void
  deleteColumn: (id: string) => void
  addCard: (card: Omit<TravelCard, "id">) => void
  updateCard: (id: string, updates: Partial<Omit<TravelCard, "id">>) => void
  deleteCard: (id: string) => void
  moveCard: (cardId: string, targetColumnId: string, targetIndex: number) => void
  reorderColumns: (activeId: string, overId: string) => void
}

const defaultColumns: Column[] = [
  { id: "research", title: "Research" },
  { id: "to-book", title: "To Book" },
  { id: "booked", title: "Booked" },
  { id: "packing", title: "Packing" },
]

const defaultCards: TravelCard[] = [
  {
    id: "1",
    title: "Machu Picchu Tickets",
    description: "Book entry tickets in advance. Consider sunrise slot for fewer crowds.",
    color: "coral",
    links: [
      { id: "l1", label: "Official Tickets", url: "https://www.machupicchu.gob.pe" },
    ],
    columnId: "research",
  },
  {
    id: "2",
    title: "Inca Trail Permits",
    description: "4-day trek to Machu Picchu. Permits sell out months in advance - book early!",
    color: "sage",
    links: [
      { id: "l2", label: "Permit Info", url: "https://www.incatrailpermits.com" },
    ],
    columnId: "research",
  },
  {
    id: "3",
    title: "Lima to Cusco Flight",
    description: "Arrive in Lima, fly to Cusco. LATAM or Avianca recommended.",
    color: "sky",
    links: [
      { id: "l3", label: "Google Flights", url: "https://www.google.com/flights" },
    ],
    columnId: "to-book",
  },
  {
    id: "4",
    title: "Cusco Accommodation",
    description: "Stay in San Blas neighborhood. Great for acclimatization before trekking.",
    color: "lavender",
    links: [
      { id: "l4", label: "Booking.com", url: "https://www.booking.com" },
    ],
    columnId: "to-book",
  },
  {
    id: "5",
    title: "Rainbow Mountain Day Trip",
    description: "Vinicunca - starts very early, high altitude (5,200m). Book a tour.",
    color: "coral",
    links: [],
    columnId: "research",
  },
  {
    id: "6",
    title: "Sacred Valley Tour",
    description: "Ollantaytambo, Pisac, Moray. Can do as day trip from Cusco.",
    color: "sand",
    links: [],
    columnId: "research",
  },
  {
    id: "7",
    title: "Altitude Sickness Meds",
    description: "Get acetazolamide prescription. Also bring coca tea/candy.",
    color: "sage",
    links: [],
    columnId: "packing",
  },
  {
    id: "8",
    title: "Travel Insurance",
    description: "Make sure it covers high altitude trekking and emergency evacuation.",
    color: "sky",
    links: [
      { id: "l5", label: "World Nomads", url: "https://www.worldnomads.com" },
    ],
    columnId: "to-book",
  },
]

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      columns: defaultColumns,
      cards: defaultCards,
      addColumn: (title) =>
        set((state) => ({
          columns: [...state.columns, { id: crypto.randomUUID(), title }],
        })),
      updateColumn: (id, title) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, title } : col
          ),
        })),
      deleteColumn: (id) =>
        set((state) => ({
          columns: state.columns.filter((col) => col.id !== id),
          cards: state.cards.filter((card) => card.columnId !== id),
        })),
      addCard: (card) =>
        set((state) => ({
          cards: [...state.cards, { ...card, id: crypto.randomUUID() }],
        })),
      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          ),
        })),
      deleteCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
        })),
      moveCard: (cardId, targetColumnId, targetIndex) =>
        set((state) => {
          const cardIndex = state.cards.findIndex((c) => c.id === cardId)
          if (cardIndex === -1) return state

          const card = state.cards[cardIndex]
          const newCards = state.cards.filter((c) => c.id !== cardId)
          const updatedCard = { ...card, columnId: targetColumnId }

          const cardsInTargetColumn = newCards.filter(
            (c) => c.columnId === targetColumnId
          )
          const cardsNotInTargetColumn = newCards.filter(
            (c) => c.columnId !== targetColumnId
          )

          cardsInTargetColumn.splice(targetIndex, 0, updatedCard)

          return {
            cards: [
              ...cardsNotInTargetColumn,
              ...cardsInTargetColumn,
              ...state.cards.filter(
                (c) => c.columnId !== targetColumnId && c.id !== cardId
              ),
            ].filter(
              (card, index, self) =>
                index === self.findIndex((c) => c.id === card.id)
            ),
          }
        }),
      reorderColumns: (activeId, overId) =>
        set((state) => {
          const activeIndex = state.columns.findIndex((c) => c.id === activeId)
          const overIndex = state.columns.findIndex((c) => c.id === overId)
          if (activeIndex === -1 || overIndex === -1) return state

          const newColumns = [...state.columns]
          const [removed] = newColumns.splice(activeIndex, 1)
          newColumns.splice(overIndex, 0, removed)

          return { columns: newColumns }
        }),
    }),
    {
      name: "peru-trip-planner-v2",
    }
  )
)
