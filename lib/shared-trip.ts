export type SharedItem = {
  id: string
  title: string
  notes: string | null
  startDate: string
  endDate: string
  location: string
  locationTo: string | null
}

export type SharedMember = {
  role: "owner" | "editor"
  displayName: string
}

export type SharedTrip = {
  id: string
  name: string
  inviteCode: string
  startDate: string
  endDate: string
  members: SharedMember[]
  items: SharedItem[]
  note: string
}

export type MemberView = {
  viewerRole: "owner" | "editor"
  trip: SharedTrip
}

export type ItemInput = {
  title: string
  notes?: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
}
