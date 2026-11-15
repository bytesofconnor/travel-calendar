import { create, getBundle, join, listMine, update } from "../convex/trips.ts"
import { create as createItem, remove as removeItem, update as updateItem } from "../convex/items.ts"
import { save as saveNote } from "../convex/notes.ts"

import { createMemoryDb, type MemoryDb } from "./memory-db.ts"
import type { ItemInput, MemberView, SharedItem, SharedMember, SharedTrip } from "./shared-trip.ts"

type Handler = {
  _handler: (ctx: never, args: never) => Promise<unknown>
}

type Room = {
  db: MemoryDb
  ownerId: string
  partnerId: string
  tripId: string
}

const rooms = new Map<string, Room>()

function contextFor(db: MemoryDb, userId: string) {
  return {
    db,
    auth: {
      async getUserIdentity() {
        return { subject: userId, issuer: "trip-pair", tokenIdentifier: `trip-pair|${userId}` }
      },
    },
  }
}

function asHandler(fn: object): Handler {
  const record = fn as { _handler?: unknown }
  if (typeof record._handler !== "function") throw new Error("Convex function has no handler")
  return fn as Handler
}

export async function runAs(db: MemoryDb, userId: string, handler: Handler, args: object) {
  return handler._handler(contextFor(db, userId) as never, args as never)
}

function asRecord(value: unknown, label: string) {
  if (typeof value !== "object" || value === null) throw new Error(`${label} is missing`)
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value !== "string") throw new Error(`${key} is missing`)
  return value
}

function readRole(value: unknown): "owner" | "editor" {
  if (value === "owner" || value === "editor") return value
  throw new Error("Unexpected member role")
}

function optionalString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" ? value : null
}

export function toMemberView(bundle: unknown, userId: string): MemberView {
  const record = asRecord(bundle, "Trip bundle")
  const trip = asRecord(record.trip, "Trip")
  const members = Array.isArray(record.members) ? record.members : null
  const items = Array.isArray(record.items) ? record.items : null
  if (!members || !items) throw new Error("Trip bundle is missing members or plans")

  const memberRows = members.map((member) => {
    const row = asRecord(member, "Member")
    return { role: readRole(row.role), displayName: readString(row, "displayName"), userId: readString(row, "userId") }
  })
  const viewer = memberRows.find((member) => member.userId === userId)
  if (!viewer) throw new Error("Viewer is not on the trip")
  const sharedMembers: SharedMember[] = memberRows
    .map(({ role, displayName }) => ({ role, displayName }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))

  const sharedItems: SharedItem[] = items.map((item) => {
    const row = asRecord(item, "Plan")
    return {
      id: readString(row, "_id"),
      title: readString(row, "title"),
      notes: optionalString(row, "notes"),
      startDate: readString(row, "startDate"),
      endDate: readString(row, "endDate"),
      location: readString(row, "location"),
      locationTo: optionalString(row, "locationTo"),
    }
  })
  sharedItems.sort((left, right) => left.title.localeCompare(right.title) || left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id))

  const noteRecord = record.note
  const note = noteRecord === null || noteRecord === undefined ? "" : readString(asRecord(noteRecord, "Note"), "content")

  const shared: SharedTrip = {
    id: readString(trip, "_id"),
    name: readString(trip, "name"),
    inviteCode: readString(trip, "inviteCode"),
    startDate: readString(trip, "startDate"),
    endDate: readString(trip, "endDate"),
    members: sharedMembers,
    items: sharedItems,
    note,
  }
  return { viewerRole: viewer.role, trip: shared }
}

export async function readMember(db: MemoryDb, userId: string, tripId: string) {
  const bundle = await runAs(db, userId, asHandler(getBundle), { tripId })
  if (bundle === null) return null
  return toMemberView(bundle, userId)
}

export async function listTrips(db: MemoryDb, userId: string) {
  const rows = await runAs(db, userId, asHandler(listMine), {})
  if (!Array.isArray(rows)) throw new Error("Trip list is missing")
  return rows.map((row) => {
    const trip = asRecord(row, "Trip")
    return {
      name: readString(trip, "name"),
      startDate: readString(trip, "startDate"),
      endDate: readString(trip, "endDate"),
    }
  })
}

function grant(db: MemoryDb, userId: string) {
  db.insert("access", { userId, grantedAt: 1, method: "code" })
}

export async function seedSharedTrip() {
  const db = createMemoryDb()
  const ownerId = "owner"
  const partnerId = "partner"
  grant(db, ownerId)
  grant(db, partnerId)
  const created = asRecord(
    await runAs(db, ownerId, asHandler(create), {
      name: "Lisbon with you",
      startDate: "2026-05-01",
      endDate: "2026-05-20",
      displayName: "Avery",
    }),
    "Created trip",
  )
  const tripId = readString(created, "tripId")
  const ownerView = await readMember(db, ownerId, tripId)
  if (!ownerView) throw new Error("Owner cannot read the new trip")
  await runAs(db, partnerId, asHandler(join), {
    inviteCode: ownerView.trip.inviteCode,
    displayName: "Blair",
  })
  return { db, ownerId, partnerId, tripId }
}

export async function saveTripDates(
  db: MemoryDb,
  userId: string,
  tripId: string,
  name: string,
  startDate: string,
  endDate: string,
) {
  await runAs(db, userId, asHandler(update), { tripId, name, startDate, endDate })
}

export async function addItem(db: MemoryDb, userId: string, tripId: string, input: ItemInput) {
  await runAs(db, userId, asHandler(createItem), { tripId, ...input })
}

export async function editItem(db: MemoryDb, userId: string, itemId: string, input: ItemInput) {
  await runAs(db, userId, asHandler(updateItem), { itemId, ...input })
}

export async function deleteItem(db: MemoryDb, userId: string, itemId: string) {
  await runAs(db, userId, asHandler(removeItem), { itemId })
}

export async function saveSharedNote(db: MemoryDb, userId: string, tripId: string, content: string) {
  await runAs(db, userId, asHandler(saveNote), { tripId, content })
}

function userIdFor(room: Room, member: "owner" | "partner") {
  return member === "owner" ? room.ownerId : room.partnerId
}

function requireRoom(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) throw new Error("Trip room not found.")
  return room
}

export async function seedRoom() {
  const seeded = await seedSharedTrip()
  const roomId = crypto.randomUUID()
  rooms.set(roomId, {
    db: seeded.db,
    ownerId: seeded.ownerId,
    partnerId: seeded.partnerId,
    tripId: seeded.tripId,
  })
  return { roomId, tripId: seeded.tripId }
}

export async function readRoom(roomId: string, member: "owner" | "partner") {
  const room = rooms.get(roomId)
  if (!room) return null
  return readMember(room.db, userIdFor(room, member), room.tripId)
}

export async function changeTrip(
  roomId: string,
  member: "owner" | "partner",
  name: string,
  startDate: string,
  endDate: string,
) {
  const room = requireRoom(roomId)
  await saveTripDates(room.db, userIdFor(room, member), room.tripId, name, startDate, endDate)
  return readMember(room.db, userIdFor(room, member), room.tripId)
}

export async function createPlan(roomId: string, member: "owner" | "partner", input: ItemInput) {
  const room = requireRoom(roomId)
  await addItem(room.db, userIdFor(room, member), room.tripId, input)
  return readMember(room.db, userIdFor(room, member), room.tripId)
}

export async function updatePlan(roomId: string, member: "owner" | "partner", itemId: string, input: ItemInput) {
  const room = requireRoom(roomId)
  await editItem(room.db, userIdFor(room, member), itemId, input)
  return readMember(room.db, userIdFor(room, member), room.tripId)
}

export async function removePlan(roomId: string, member: "owner" | "partner", itemId: string) {
  const room = requireRoom(roomId)
  await deleteItem(room.db, userIdFor(room, member), itemId)
  return readMember(room.db, userIdFor(room, member), room.tripId)
}

export async function writeNote(roomId: string, member: "owner" | "partner", content: string) {
  const room = requireRoom(roomId)
  await saveSharedNote(room.db, userIdFor(room, member), room.tripId, content)
  return readMember(room.db, userIdFor(room, member), room.tripId)
}
