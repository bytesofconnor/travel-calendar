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
  { id: "ideas", title: "Ideas" },
  { id: "planning", title: "Planning" },
  { id: "booked", title: "Booked" },
  { id: "completed", title: "Completed" },
]

const defaultCards: TravelCard[] = [
  {
    id: "1",
    title: "Tokyo Adventure",
    description: "Cherry blossom season in Japan. Visit temples, try authentic ramen, explore Shibuya.",
    color: "coral",
    links: [
      { id: "l1", label: "Japan Guide", url: "https://www.japan-guide.com" },
    ],
    columnId: "ideas",
  },
  {
    id: "2",
    title: "Iceland Road Trip",
    description: "Ring road adventure. Northern lights, waterfalls, hot springs.",
    color: "sky",
    links: [],
    columnId: "ideas",
  },
  {
    id: "3",
    title: "Paris Weekend",
    description: "Romantic getaway. Eiffel Tower, Louvre, croissants.",
    color: "lavender",
    links: [
      { id: "l2", label: "Hotel Booking", url: "https://www.booking.com" },
    ],
    columnId: "planning",
  },
  {
    id: "4",
    title: "Bali Retreat",
    description: "Wellness and relaxation. Yoga, rice terraces, beach sunsets.",
    color: "sage",
    links: [
      { id: "l3", label: "Flight Details", url: "https://www.google.com/flights" },
      { id: "l4", label: "Villa Rental", url: "https://www.airbnb.com" },
    ],
    columnId: "booked",
  },
  {
    id: "5",
    title: "New York City",
    description: "Broadway shows, Central Park, amazing food scene.",
    color: "sand",
    links: [],
    columnId: "completed",
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
      name: "travel-kanban-storage",
    }
  )
)
