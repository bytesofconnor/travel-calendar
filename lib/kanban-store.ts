import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Author = "brenda" | "connor"
export type Priority = 1 | 2 | 3 | 4 | 5 | null

export interface Link {
  id: string
  label: string
  url: string
}

export interface PlannerCard {
  id: string
  title: string
  notes: string
  priority: Priority
  author: Author | null
  links: Link[]
  columnId: string
}

export interface Column {
  id: string
  title: string
  dateRange: string
}

interface KanbanState {
  columns: Column[]
  cards: PlannerCard[]
  addCard: (card: Omit<PlannerCard, "id">) => void
  updateCard: (id: string, updates: Partial<Omit<PlannerCard, "id">>) => void
  deleteCard: (id: string) => void
  moveCard: (cardId: string, targetColumnId: string, targetIndex: number) => void
}

const defaultColumns: Column[] = [
  { id: "apr-27", title: "Apr 27 - May 3", dateRange: "Week 1" },
  { id: "may-4", title: "May 4 - 10", dateRange: "Week 2" },
  { id: "may-11", title: "May 11 - 17", dateRange: "Week 3" },
  { id: "may-18", title: "May 18 - 24", dateRange: "Week 4" },
  { id: "may-25", title: "May 25 - 31", dateRange: "Week 5" },
  { id: "jun-1", title: "Jun 1 - 7", dateRange: "Week 6" },
  { id: "jun-8", title: "Jun 8 - 14", dateRange: "Week 7" },
  { id: "jun-15", title: "Jun 15 - 21", dateRange: "Week 8" },
  { id: "jun-22", title: "Jun 22 - 28", dateRange: "Week 9" },
  { id: "jun-29", title: "Jun 29 - 30", dateRange: "Final" },
]

const defaultCards: PlannerCard[] = [
  {
    id: "1",
    title: "Book flights",
    notes: "Look at LATAM and Avianca for Lima-Cusco leg",
    priority: 1,
    author: "connor",
    links: [{ id: "l1", label: "Google Flights", url: "https://www.google.com/flights" }],
    columnId: "apr-27",
  },
  {
    id: "2",
    title: "Get travel insurance",
    notes: "Must cover high altitude trekking",
    priority: 2,
    author: "brenda",
    links: [],
    columnId: "apr-27",
  },
  {
    id: "3",
    title: "Machu Picchu tickets",
    notes: "Book for sunrise slot if possible",
    priority: 1,
    author: null,
    links: [{ id: "l2", label: "Official Site", url: "https://www.machupicchu.gob.pe" }],
    columnId: "may-4",
  },
]

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      columns: defaultColumns,
      cards: defaultCards,
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
    }),
    {
      name: "peru-weekly-planner-v1",
    }
  )
)
