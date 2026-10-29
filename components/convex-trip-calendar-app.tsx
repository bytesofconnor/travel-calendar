"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  Ellipsis,
  Heart,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Pencil,
  Plane,
  PlusCircle,
  Users,
  X,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_TRIP_END,
  DEFAULT_TRIP_NAME,
  DEFAULT_TRIP_START,
  withAuthorNames,
  withNoteAuthorName,
  withPackingAuthorNames,
  type Trip,
  type TripItem,
  type TripItemInput,
  type TripMember,
  type TripNote,
  type TripPackingItem,
} from "@/lib/kanban-store"
import {
  dayIndexInTrip,
  initial,
  isDateInTrip,
  tripDayCount,
} from "@/lib/trip-kind"
import { formatTripDateRange } from "@/lib/format-dates"
import { oauthRedirectTo } from "@/lib/oauth-redirect"
import { parseThemePack } from "@/lib/theme-packs"
import { SegmentedControl, StatusBanner } from "@/components/ds"
import { ThemePackPickerMenuItems } from "@/components/theme-pack-menu"
import { useTripThemePack } from "@/components/use-trip-theme-pack"
import { CaptureDock, type CaptureKind } from "./capture-dock"
import { CreateJoinScreen } from "./create-join-screen"
import { ItemDialog } from "./item-dialog"
import { LoginScreen } from "./login-screen"
import { PaywallScreen } from "./paywall-screen"
import { PeekSheet } from "./peek-sheet"
import { ShareTripDialog } from "./share-trip-dialog"
import { TripCopilot } from "./trip-copilot"
import { TripCover, SpectrumHairline } from "./trip-cover"
import { TripNotesView } from "./trip-notes-view"
import { TripPackingView } from "./trip-packing-view"
import { TripStoryView } from "./trip-story-view"
import { TripsSheet } from "./trips-sheet"

const LAST_TRIP_KEY = "travel-calendar:last-trip-id"

interface ConvexTripCalendarAppProps {
  joinCode?: string
}

type ConvexTripDoc = {
  _id: Id<"trips">
  name: string
  inviteCode: string
  startDate: string
  endDate: string
  createdBy: Id<"users">
  _creationTime: number
  coverImageUrl?: string
  coverImagePhotographer?: string
  coverImageSourceUrl?: string
  coverImageQuery?: string
  themePack: string | null
}

function toIso(ms: number) {
  return new Date(ms).toISOString()
}

function mapTrip(doc: ConvexTripDoc): Trip {
  return {
    id: doc._id,
    name: doc.name,
    inviteCode: doc.inviteCode,
    startDate: doc.startDate,
    endDate: doc.endDate,
    createdBy: doc.createdBy,
    createdAt: toIso(doc._creationTime),
    coverImageUrl: doc.coverImageUrl,
    coverImagePhotographer: doc.coverImagePhotographer,
    coverImageSourceUrl: doc.coverImageSourceUrl,
    coverImageQuery: doc.coverImageQuery,
    themePack: parseThemePack(doc.themePack),
  }
}

function guessDisplayName(user: { email: string | null; name: string | null } | null | undefined) {
  if (!user) return ""
  if (user.name?.trim()) return user.name.trim()
  const emailPrefix = user.email?.split("@")[0]
  return emailPrefix ? emailPrefix.replace(/[._-]+/g, " ") : ""
}

function authErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (/AUTH_RESEND_KEY|Missing AUTH_RESEND/i.test(message)) {
    return "Email OTP needs AUTH_RESEND_KEY set in your Convex deployment env (npx convex env set AUTH_RESEND_KEY …)."
  }
  return message
}

function LoadingJourney({ label = "Loading your trip", detail = "Pulling plans, notes, and packing lists together." }: { label?: string; detail?: string }) {
  return (
    <main id="main-content" className="relative flex h-dvh items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(96,165,250,0.08),_transparent_30%)]" />
      <div className="relative flex max-w-sm flex-col items-center text-center">
        <div className="loading-journey" aria-hidden="true">
          <div className="loading-journey__trail" />
          <div className="loading-journey__trail loading-journey__trail--glow" />
          <div className="loading-journey__destination">
            <Heart className="h-4 w-4 fill-current" />
          </div>
          <div className="loading-journey__plane">
            <Plane className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-6 text-base font-medium tracking-tight text-foreground">{label}</div>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </main>
  )
}

export function ConvexTripCalendarApp({ joinCode }: ConvexTripCalendarAppProps) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  // Calendar store no longer drives primary workspace chrome (Together Story).

  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip")
  const access = useQuery(api.access.hasAccess, isAuthenticated ? {} : "skip")
  const tripsQuery = useQuery(
    api.trips.listMine,
    isAuthenticated && access && (!access.required || access.granted) ? {} : "skip",
  )

  const [activeTripId, setActiveTripId] = useState<Id<"trips"> | null>(null)
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [createJoinMode, setCreateJoinMode] = useState<"create" | "join">("create")
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false)

  const bundle = useQuery(api.trips.getBundle, activeTripId ? { tripId: activeTripId } : "skip")

  const createTrip = useMutation(api.trips.create)
  const joinTrip = useMutation(api.trips.join)
  const updateTrip = useMutation(api.trips.update)
  const updateCover = useMutation(api.trips.updateCover)
  const createItem = useMutation(api.items.create)
  const updateItem = useMutation(api.items.update)
  const removeItem = useMutation(api.items.remove)
  const saveNote = useMutation(api.notes.save)
  const addPacking = useMutation(api.packing.add)
  const addManyPacking = useMutation(api.packing.addMany)
  const togglePacking = useMutation(api.packing.toggle)
  const renamePacking = useMutation(api.packing.rename)
  const removePacking = useMutation(api.packing.remove)

  const [tripName, setTripName] = useState(DEFAULT_TRIP_NAME)
  const [tripStart, setTripStart] = useState(DEFAULT_TRIP_START)
  const [tripEnd, setTripEnd] = useState(DEFAULT_TRIP_END)
  const [noteDraft, setNoteDraft] = useState("")
  const [noteDirty, setNoteDirty] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isOrganizingNote, setIsOrganizingNote] = useState(false)
  const [organizeUndoContent, setOrganizeUndoContent] = useState<string | null>(null)
  const [organizeUndoExpiresAt, setOrganizeUndoExpiresAt] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [joinInput, setJoinInput] = useState(joinCode ?? "")
  const [authMessage, setAuthMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSendingAuth, setIsSendingAuth] = useState(false)
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false)
  const [hasPendingCode, setHasPendingCode] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [desktopAiOpen, setDesktopAiOpen] = useState(false)
  const [isEditingTripDetails, setIsEditingTripDetails] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [isRefreshingCover, setIsRefreshingCover] = useState(false)
  const [storyMode, setStoryMode] = useState<"trip" | "today">("trip")
  const [storyModeReady, setStoryModeReady] = useState(false)
  const [peek, setPeek] = useState<"notes" | "packing" | null>(null)
  const [tripsOpen, setTripsOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<TripItem | null>(null)
  const [defaultItemDate, setDefaultItemDate] = useState<string | null>(null)
  const [initialItemInput, setInitialItemInput] = useState<Partial<TripItemInput> | null>(null)
  const [initialTravel, setInitialTravel] = useState(false)
  const [emphasizeItemId, setEmphasizeItemId] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const noteDirtyRef = useRef(noteDirty)
  const noteDraftRef = useRef(noteDraft)
  const organizeUndoTimeoutRef = useRef<number | null>(null)
  const syncedNoteTripIdRef = useRef<string | null>(null)

  const allTrips = useMemo(() => (tripsQuery ?? []).map(mapTrip), [tripsQuery])
  const paywalled = Boolean(access && access.required && !access.granted)
  const workspacePack =
    isAuthenticated && !paywalled && !showCreateJoin && activeTripId
      ? (allTrips.find((candidate) => candidate.id === activeTripId)?.themePack ?? null)
      : null
  useTripThemePack(workspacePack)

  const trip = useMemo(() => (bundle?.trip ? mapTrip(bundle.trip) : null), [bundle?.trip])

  const members: TripMember[] = useMemo(() => {
    if (!bundle) return []
    return bundle.members.map((member) => ({
      tripId: member.tripId,
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
      email: me && member.userId === me._id ? me.email : null,
    }))
  }, [bundle, me])

  const items: TripItem[] = useMemo(() => {
    if (!bundle) return []
    return withAuthorNames(
      bundle.items.map((item) => ({
        id: item._id,
        tripId: item.tripId,
        title: item.title,
        notes: item.notes,
        link: item.linkUrl ? { label: item.linkLabel ?? "Link", url: item.linkUrl } : undefined,
        startDate: item.startDate,
        endDate: item.endDate,
        location: item.location,
        locationTo: item.locationTo,
        createdBy: item.createdBy,
        createdAt: toIso(item._creationTime),
        updatedAt: toIso(item._creationTime),
      })),
      members,
    )
  }, [bundle, members])

  const note: TripNote | null = useMemo(() => {
    if (!bundle?.note) return null
    return withNoteAuthorName(
      {
        tripId: bundle.note.tripId,
        content: bundle.note.content,
        updatedBy: bundle.note.updatedBy ?? null,
        createdAt: toIso(bundle.note._creationTime),
        updatedAt: toIso(bundle.note._creationTime),
      },
      members,
    )
  }, [bundle?.note, members])

  const packingItems: TripPackingItem[] = useMemo(() => {
    if (!bundle) return []
    return withPackingAuthorNames(
      bundle.packingItems.map((item) => ({
        id: item._id,
        tripId: item.tripId,
        label: item.label,
        isChecked: item.isChecked,
        sortOrder: item.sortOrder,
        createdBy: item.createdBy ?? null,
        updatedBy: item.updatedBy ?? null,
        createdAt: toIso(item._creationTime),
        updatedAt: toIso(item._creationTime),
      })),
      members,
    )
  }, [bundle, members])

  const currentMember = members.find((member) => member.userId === me?._id)
  const userId = me?._id

  useEffect(() => {
    if (!trip || storyModeReady) return
    if (isDateInTrip(today, trip.startDate, trip.endDate)) {
      setStoryMode("today")
    }
    setStoryModeReady(true)
  }, [storyModeReady, today, trip])

  useEffect(() => {
    noteDirtyRef.current = noteDirty
  }, [noteDirty])

  useEffect(() => {
    noteDraftRef.current = noteDraft
  }, [noteDraft])

  useEffect(() => {
    return () => {
      if (organizeUndoTimeoutRef.current) {
        window.clearTimeout(organizeUndoTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (me && !displayName.trim()) {
      setDisplayName(guessDisplayName(me))
    }
  }, [displayName, me])

  // Pick active trip when trip list loads
  useEffect(() => {
    if (!tripsQuery) return

    if (tripsQuery.length === 0) {
      setActiveTripId(null)
      setShowCreateJoin(true)
      return
    }

    const preferredJoin = (joinCode ?? "").trim().toLowerCase()
    const savedTripId = typeof window !== "undefined" ? window.localStorage.getItem(LAST_TRIP_KEY) : null

    setActiveTripId((current) => {
      if (preferredJoin) {
        const byInvite = tripsQuery.find((candidate) => candidate.inviteCode === preferredJoin)
        if (byInvite) return byInvite._id
      }
      if (current && tripsQuery.some((candidate) => candidate._id === current)) {
        return current
      }
      if (savedTripId) {
        const saved = tripsQuery.find((candidate) => candidate._id === savedTripId)
        if (saved) return saved._id
      }
      return tripsQuery[0]._id
    })
  }, [tripsQuery, joinCode])

  // Auto-join when authenticated with zero trips and a join code
  useEffect(() => {
    if (!isAuthenticated || !tripsQuery || autoJoinAttempted) return
    if (tripsQuery.length > 0) return

    const pendingJoin = (joinInput.trim() || joinCode?.trim() || "").toLowerCase()
    if (!pendingJoin) return

    const name = displayName.trim() || guessDisplayName(me)
    if (!name) return

    setAutoJoinAttempted(true)
    void (async () => {
      setIsMutating(true)
      setErrorMessage("")
      try {
        const tripId = await joinTrip({ inviteCode: pendingJoin, displayName: name })
        setActiveTripId(tripId)
        setShowCreateJoin(false)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAST_TRIP_KEY, tripId)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Invite code not found.")
        setShowCreateJoin(true)
      } finally {
        setIsMutating(false)
      }
    })()
  }, [autoJoinAttempted, displayName, isAuthenticated, joinCode, joinInput, joinTrip, me, tripsQuery])

  useEffect(() => {
    if (!trip) return
    setTripName(trip.name)
    setTripStart(trip.startDate)
    setTripEnd(trip.endDate)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_TRIP_KEY, trip.id)
    }
  }, [trip])

  useEffect(() => {
    if (currentMember?.displayName) {
      setDisplayName(currentMember.displayName)
    }
  }, [currentMember?.displayName])

  // Sync note draft from reactive bundle when not dirty / on trip change
  useEffect(() => {
    if (!trip) {
      syncedNoteTripIdRef.current = null
      return
    }

    const tripChanged = syncedNoteTripIdRef.current !== trip.id
    if (tripChanged) {
      syncedNoteTripIdRef.current = trip.id
      setNoteDraft(note?.content ?? "")
      setNoteDirty(false)
      noteDraftRef.current = note?.content ?? ""
      noteDirtyRef.current = false
      return
    }

    if (!noteDirtyRef.current) {
      setNoteDraft(note?.content ?? "")
      noteDraftRef.current = note?.content ?? ""
    }
  }, [note?.content, trip])

  // Autosave notes
  useEffect(() => {
    if (!trip || !userId || !noteDirty) return

    const timeout = window.setTimeout(async () => {
      try {
        await persistNoteDraft(noteDraftRef.current)
      } catch {
        return
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [noteDirty, noteDraft, trip, userId])

  async function persistNoteDraft(contentToSave: string) {
    if (!trip || !userId) {
      throw new Error("Unable to save brainstorm notes right now.")
    }

    setIsSavingNote(true)
    setErrorMessage("")
    try {
      await saveNote({ tripId: trip.id as Id<"trips">, content: contentToSave })
      if (noteDraftRef.current === contentToSave) {
        setNoteDirty(false)
        noteDirtyRef.current = false
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save notes.")
      throw error
    } finally {
      setIsSavingNote(false)
    }
  }

  async function handleContinueWithGoogle() {
    setIsSigningInWithGoogle(true)
    setAuthMessage("")
    setErrorMessage("")
    try {
      await signIn("google", { redirectTo: oauthRedirectTo(window.location.href) })
    } catch (error) {
      setErrorMessage(authErrorMessage(error, "Unable to sign in with Google."))
      setIsSigningInWithGoogle(false)
    }
  }

  async function handleSendEmailCode() {
    if (!email.trim()) return

    setIsSendingEmailCode(true)
    setAuthMessage("")
    setErrorMessage("")
    try {
      await signIn("resend-otp", { email: email.trim() })
      setHasPendingCode(true)
      setAuthMessage(`Code sent to ${email.trim()}.`)
    } catch (error) {
      setErrorMessage(authErrorMessage(error, "Unable to send email code."))
    } finally {
      setIsSendingEmailCode(false)
    }
  }

  async function handleVerifyEmailCode() {
    if (!email.trim() || verificationCode.trim().length < 6) return

    setIsVerifyingCode(true)
    setAuthMessage("")
    setErrorMessage("")
    try {
      await signIn("resend-otp", { email: email.trim(), code: verificationCode.trim() })
      setHasPendingCode(false)
      setVerificationCode("")
      setAuthMessage("You’re signed in. Loading your trip…")
    } catch (error) {
      setErrorMessage(authErrorMessage(error, "Invalid or expired code."))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  function handleSendMagicLink() {
    setIsSendingAuth(false)
    setAuthMessage("Magic links aren’t enabled yet — use the email code instead.")
  }

  async function applyCoverForTrip(tripId: Id<"trips">, name: string) {
    try {
      const response = await fetch("/api/covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripName: name }),
      })
      if (!response.ok) return
      const cover = (await response.json()) as {
        imageUrl: string
        photographer: string
        sourceUrl: string
        query: string
      }
      await updateCover({
        tripId,
        coverImageUrl: cover.imageUrl,
        coverImagePhotographer: cover.photographer,
        coverImageSourceUrl: cover.sourceUrl,
        coverImageQuery: cover.query,
      })
    } catch {
      // Cover is best-effort; trip still works without it.
    }
  }

  async function handleCreateTrip() {
    if (!displayName.trim() || !tripName.trim()) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      const created = await createTrip({
        name: tripName.trim(),
        startDate: tripStart,
        endDate: tripEnd,
        displayName: displayName.trim(),
      })
      const tripId = created.tripId
      setActiveTripId(tripId)
      setShowCreateJoin(false)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_TRIP_KEY, tripId)
      }
      void applyCoverForTrip(tripId, tripName.trim())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create trip.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleJoinTrip(inviteCode: string, nextDisplayName: string) {
    if (!inviteCode.trim() || !nextDisplayName.trim()) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      const tripId = await joinTrip({
        inviteCode: inviteCode.trim().toLowerCase(),
        displayName: nextDisplayName.trim(),
      })
      setActiveTripId(tripId)
      setShowCreateJoin(false)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_TRIP_KEY, tripId)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invite code not found.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleSaveItem(input: TripItemInput, existingItem?: TripItem) {
    if (!trip || !userId) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      const payload = {
        title: input.title,
        notes: input.notes,
        linkLabel: input.link?.label,
        linkUrl: input.link?.url,
        startDate: input.startDate,
        endDate: input.endDate,
        location: input.location,
        locationTo: input.locationTo,
      }
      if (existingItem) {
        await updateItem({ itemId: existingItem.id as Id<"tripItems">, ...payload })
        setEmphasizeItemId(existingItem.id)
      } else {
        const created = await createItem({ tripId: trip.id as Id<"trips">, ...payload })
        if (typeof created.itemId === "string") {
          setEmphasizeItemId(created.itemId)
        }
        setShareMessage("Added for both of you.")
        window.setTimeout(() => setShareMessage(""), 2000)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save plan.")
    } finally {
      setIsMutating(false)
    }
  }

  function openCapture(kind?: CaptureKind, date?: string) {
    const baseDate = date ?? (storyMode === "today" ? today : trip?.startDate ?? today)
    setEditItem(null)
    setDefaultItemDate(baseDate)
    setInitialTravel(kind === "flight")
    if (kind === "flight") {
      setInitialItemInput({ title: "Flight", startDate: baseDate, endDate: baseDate })
    } else if (kind === "stay") {
      setInitialItemInput({ title: "Stay", startDate: baseDate, endDate: baseDate })
    } else if (kind === "place") {
      setInitialItemInput({ title: "", startDate: baseDate, endDate: baseDate })
    } else {
      setInitialItemInput(null)
    }
    setItemDialogOpen(true)
  }

  function openEditItem(item: TripItem) {
    setEditItem(item)
    setDefaultItemDate(item.startDate)
    setInitialItemInput(null)
    setInitialTravel(Boolean(item.locationTo))
    setItemDialogOpen(true)
  }

  async function handleDeleteItem(itemId: string) {
    if (!trip) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await removeItem({ itemId: itemId as Id<"tripItems"> })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete plan.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleSaveBrainstormContent(content: string) {
    const contentToSave = content.trim() ? content : noteDraftRef.current
    setNoteDraft(contentToSave)
    noteDraftRef.current = contentToSave
    setNoteDirty(true)
    noteDirtyRef.current = true
    setErrorMessage("")
    await persistNoteDraft(contentToSave)
    setShareMessage("Added to brainstorm.")
    window.setTimeout(() => setShareMessage(""), 2000)
  }

  function startOrganizeUndoWindow(previousContent: string) {
    if (organizeUndoTimeoutRef.current) {
      window.clearTimeout(organizeUndoTimeoutRef.current)
    }
    const expiresAt = Date.now() + 10_000
    setOrganizeUndoContent(previousContent)
    setOrganizeUndoExpiresAt(expiresAt)
    organizeUndoTimeoutRef.current = window.setTimeout(() => {
      setOrganizeUndoContent(null)
      setOrganizeUndoExpiresAt(null)
      organizeUndoTimeoutRef.current = null
    }, 10_000)
  }

  async function handleOrganizeNotes() {
    if (!trip || !noteDraftRef.current.trim()) return

    setIsOrganizingNote(true)
    setErrorMessage("")
    try {
      const response = await fetch("/api/brainstorm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "organize_notes",
          trip: {
            name: trip.name,
            startDate: trip.startDate,
            endDate: trip.endDate,
          },
          noteDraft: noteDraftRef.current,
          items: items.map((item) => ({
            title: item.title,
            startDate: item.startDate,
            endDate: item.endDate,
            location: item.location,
            locationTo: item.locationTo,
          })),
          packingItems: packingItems.map((item) => ({
            label: item.label,
            isChecked: item.isChecked,
          })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { organizedNote?: string; caution?: string | null; error?: string }
        | null

      const organizedNote = typeof payload?.organizedNote === "string" ? payload.organizedNote.trim() : ""
      if (!response.ok || !organizedNote) {
        throw new Error(payload?.error ?? "Couldn’t organize the notes yet.")
      }

      const previousContent = noteDraftRef.current
      setNoteDraft(organizedNote)
      noteDraftRef.current = organizedNote
      setNoteDirty(true)
      noteDirtyRef.current = true
      await persistNoteDraft(organizedNote)
      startOrganizeUndoWindow(previousContent)
      setShareMessage(payload?.caution ? `Notes organized. ${payload.caution}` : "Notes organized.")
      window.setTimeout(() => setShareMessage(""), 2500)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn’t organize the notes yet.")
    } finally {
      setIsOrganizingNote(false)
    }
  }

  async function handleUndoOrganizeNotes() {
    if (!organizeUndoContent) return

    const previousContent = organizeUndoContent
    if (organizeUndoTimeoutRef.current) {
      window.clearTimeout(organizeUndoTimeoutRef.current)
      organizeUndoTimeoutRef.current = null
    }

    setOrganizeUndoContent(null)
    setOrganizeUndoExpiresAt(null)
    setNoteDraft(previousContent)
    noteDraftRef.current = previousContent
    setNoteDirty(true)
    noteDirtyRef.current = true
    setErrorMessage("")

    try {
      await persistNoteDraft(previousContent)
      setShareMessage("Restored previous notes.")
      window.setTimeout(() => setShareMessage(""), 2000)
    } catch {
      return
    }
  }

  async function handleAddPackingItem(label: string) {
    if (!trip) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await addPacking({ tripId: trip.id as Id<"trips">, label: label.trim() })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add packing item.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleAddPackingIdeas(labels: string[]) {
    if (!trip) return

    const normalizedExisting = new Set(packingItems.map((item) => item.label.trim().toLowerCase()))
    const nextLabels = labels
      .map((label) => label.trim())
      .filter(Boolean)
      .filter((label, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === label.toLowerCase()) === index)
      .filter((label) => !normalizedExisting.has(label.toLowerCase()))

    if (nextLabels.length === 0) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await addManyPacking({ tripId: trip.id as Id<"trips">, labels: nextLabels })
      setShareMessage(`${nextLabels.length} packing idea${nextLabels.length === 1 ? "" : "s"} added.`)
      window.setTimeout(() => setShareMessage(""), 2000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add packing ideas.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleTogglePackingItem(item: TripPackingItem, nextChecked: boolean) {
    setIsMutating(true)
    setErrorMessage("")
    try {
      await togglePacking({ itemId: item.id as Id<"tripPackingItems">, isChecked: nextChecked })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update packing item.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleRenamePackingItem(item: TripPackingItem, label: string) {
    setIsMutating(true)
    setErrorMessage("")
    try {
      await renamePacking({ itemId: item.id as Id<"tripPackingItems">, label })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to rename packing item.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDeletePackingItem(item: TripPackingItem) {
    setIsMutating(true)
    setErrorMessage("")
    try {
      await removePacking({ itemId: item.id as Id<"tripPackingItems"> })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete packing item.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleRefreshCover() {
    if (!trip || currentMember?.role !== "owner") return
    setIsRefreshingCover(true)
    setErrorMessage("")
    try {
      const response = await fetch("/api/covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripName: trip.name }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Unable to refresh cover.")
      }
      const cover = (await response.json()) as {
        imageUrl: string
        photographer: string
        sourceUrl: string
        query: string
      }
      await updateCover({
        tripId: trip.id as Id<"trips">,
        coverImageUrl: cover.imageUrl,
        coverImagePhotographer: cover.photographer,
        coverImageSourceUrl: cover.sourceUrl,
        coverImageQuery: cover.query,
      })
      setShareMessage("Cover updated.")
      window.setTimeout(() => setShareMessage(""), 2000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh cover.")
    } finally {
      setIsRefreshingCover(false)
    }
  }

  async function handleSaveTripDetails() {
    if (!trip || currentMember?.role !== "owner" || !tripName.trim() || !tripStart || !tripEnd) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await updateTrip({
        tripId: trip.id as Id<"trips">,
        name: tripName.trim(),
        startDate: tripStart,
        endDate: tripEnd,
      })
      setIsEditingTripDetails(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update trip.")
    } finally {
      setIsMutating(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    setActiveTripId(null)
    setShowCreateJoin(false)
    setAutoJoinAttempted(false)
    setNoteDraft("")
    setNoteDirty(false)
    setErrorMessage("")
    setAuthMessage("")
  }

  function handleSwitchTrip(nextTripId: string) {
    setActiveTripId(nextTripId as Id<"trips">)
    setNoteDirty(false)
    noteDirtyRef.current = false
    syncedNoteTripIdRef.current = null
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_TRIP_KEY, nextTripId)
    }
  }

  if (authLoading) {
    return <LoadingJourney label="Checking sign-in" detail="Connecting to Convex Auth…" />
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        email={email}
        verificationCode={verificationCode}
        joinInput={joinInput}
        isSendingAuth={isSendingAuth}
        isSendingEmailCode={isSendingEmailCode}
        isVerifyingCode={isVerifyingCode}
        isSigningInWithGoogle={isSigningInWithGoogle}
        hasPendingCode={hasPendingCode}
        authMessage={authMessage}
        errorMessage={errorMessage}
        onEmailChange={setEmail}
        onVerificationCodeChange={setVerificationCode}
        onJoinInputChange={(value) => setJoinInput(value.toLowerCase())}
        onSendEmailCode={() => void handleSendEmailCode()}
        onSendMagicLink={handleSendMagicLink}
        onVerifyEmailCode={() => void handleVerifyEmailCode()}
        onContinueWithGoogle={() => void handleContinueWithGoogle()}
        emailAuthEnabled={false}
      />
    )
  }

  if (me === undefined || access === undefined) {
    return <LoadingJourney label="Checking access" detail="Looking up your lifetime pass…" />
  }

  if (access.required && !access.granted && me) {
    return (
      <PaywallScreen
        userId={me._id}
        paymentLink={
          process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ??
          (access.paymentUrl
            ? access.paymentUrl.replace(/[?&]client_reference_id=[^&]+/, "").replace(/\?$/, "")
            : null)
        }
        onAccessGranted={() => window.location.reload()}
      />
    )
  }

  if (tripsQuery === undefined) {
    return <LoadingJourney />
  }

  // Wait for trip selection effect before showing create/join flash
  if (tripsQuery.length > 0 && !activeTripId && !showCreateJoin) {
    return <LoadingJourney />
  }

  if (showCreateJoin || !activeTripId) {
    return (
      <CreateJoinScreen
        mode={createJoinMode}
        onModeChange={setCreateJoinMode}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        tripName={tripName}
        onTripNameChange={setTripName}
        tripStart={tripStart}
        onTripStartChange={setTripStart}
        tripEnd={tripEnd}
        onTripEndChange={setTripEnd}
        joinInput={joinInput}
        onJoinInputChange={setJoinInput}
        isMutating={isMutating}
        errorMessage={errorMessage}
        hasTrips={allTrips.length > 0}
        onCreate={() => void handleCreateTrip()}
        onJoin={() => void handleJoinTrip(joinInput, displayName)}
        onBackToTrips={
          allTrips.length > 0
            ? () => {
                setShowCreateJoin(false)
                setErrorMessage("")
              }
            : undefined
        }
        onSignOut={() => void handleSignOut()}
      />
    )
  }

  if (bundle === undefined || !trip) {
    return <LoadingJourney />
  }

  if (bundle === null) {
    return (
      <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">You don’t have access to this trip.</p>
        <Button
          onClick={() => {
            setActiveTripId(null)
            setShowCreateJoin(true)
          }}
        >
          Choose another trip
        </Button>
      </main>
    )
  }

  const dayCount = tripDayCount(trip.startDate, trip.endDate)
  const coverMeta = [
    formatTripDateRange(trip.startDate, trip.endDate),
    `${dayCount} day${dayCount === 1 ? "" : "s"}`,
    members.length > 1
      ? `you & ${members.find((m) => m.userId !== userId)?.displayName?.split(" ")[0] || "partner"}`
      : "you",
  ].join(" · ")
  const packingChecked = packingItems.filter((item) => item.isChecked).length
  const notesCount = noteDraft.trim() ? 1 : 0
  const captureHint = storyMode === "today" ? "What’s happening today?" : "Add to the trip…"
  const partner = members.find((member) => member.userId !== userId)
  const youInitial = initial(currentMember?.displayName ?? guessDisplayName(me) ?? "Y")
  const partnerInitial = partner ? initial(partner.displayName) : null

  return (
    <>
      <main id="main-content" className="together-story relative z-10 flex h-dvh flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
            <div className="story-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {storyMode === "trip" ? (
                <TripCover
                  tripName={trip.name}
                  meta={coverMeta}
                  coverImageUrl={trip.coverImageUrl}
                  showHairline={false}
                  onBrandClick={() => setTripsOpen(true)}
                />
              ) : null}

              <div className="story-chrome-sticky sticky top-0 z-20">
                <SpectrumHairline />
                <header className="border-b border-border/80 bg-background">
                  <div className="story-shell">
                    <div className="story-chrome">
                    <SegmentedControl
                      label="Trip view"
                      value={storyMode}
                      onChange={setStoryMode}
                      className="story-segment"
                      options={[
                        { value: "trip", label: "Trip" },
                        { value: "today", label: "Today" },
                      ]}
                    />

                    <button
                      type="button"
                      className="story-chrome__hit rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="All trips"
                      onClick={() => setTripsOpen(true)}
                    >
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>

                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <div className="flex items-center pl-1" role="group" aria-label="Travelers">
                        <span
                          className="avatar-you flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                          aria-label="You"
                        >
                          {youInitial}
                        </span>
                        {partnerInitial ? (
                          <span
                            className="avatar-partner -ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-[12px] font-bold"
                            aria-label={partner?.displayName ?? "Partner"}
                          >
                            {partnerInitial}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="btn-together inline-flex h-11 min-w-[4.75rem] items-center justify-center rounded-full px-4 text-[13px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
                        onClick={() => setShareOpen(true)}
                        aria-label="Invite your partner"
                      >
                        Invite
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="story-chrome__hit text-muted-foreground hover:text-foreground"
                            aria-label="More actions"
                          >
                            <Ellipsis className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onSelect={() => setTripsOpen(true)}>
                            All trips
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setCreateJoinMode("create")
                              setShowCreateJoin(true)
                            }}
                          >
                            <PlusCircle className="h-4 w-4" />
                            New or join
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ThemePackPickerMenuItems
                            tripId={trip.id as Id<"trips">}
                            themePack={trip.themePack}
                            onError={setErrorMessage}
                          />
                          {currentMember?.role === "owner" ? (
                            <DropdownMenuItem onSelect={() => setIsEditingTripDetails(true)}>
                              <Pencil className="h-4 w-4" />
                              Edit trip
                            </DropdownMenuItem>
                          ) : null}
                          {currentMember?.role === "owner" ? (
                            <DropdownMenuItem onSelect={() => void handleRefreshCover()} disabled={isRefreshingCover}>
                              {isRefreshingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                              Refresh cover
                            </DropdownMenuItem>
                          ) : null}
                          {(currentMember?.role === "owner") ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuItem onSelect={() => void handleSignOut()}>
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </div>
                  </div>
                </header>
                {shareMessage ? <StatusBanner tone="success">{shareMessage}</StatusBanner> : null}
                {errorMessage ? <StatusBanner tone="error">{errorMessage}</StatusBanner> : null}
              </div>

              <TripStoryView
                className="story-shell"
                mode={storyMode}
                items={items}
                today={today}
                tripStart={trip.startDate}
                tripEnd={trip.endDate}
                dayNumber={dayIndexInTrip(today, trip.startDate)}
                currentUserId={userId}
                emphasizeItemId={emphasizeItemId}
                packingChecked={packingChecked}
                packingTotal={packingItems.length}
                notesCount={notesCount}
                onEditItem={openEditItem}
                onStartFlight={() => openCapture("flight")}
                onStartStay={() => openCapture("stay")}
                onStartPlace={() => openCapture("place")}
                onInvite={() => setShareOpen(true)}
                onOpenPacking={() => setPeek("packing")}
                onOpenNotes={() => setPeek("notes")}
                onOpenAsk={() => setDesktopAiOpen(true)}
              />
            </div>
            <CaptureDock
              hint={captureHint}
              onCapture={(kind) => openCapture(kind)}
              onOpenNotes={() => setPeek("notes")}
            />
          </div>

          <aside
            className={`hidden min-h-0 shrink-0 overflow-hidden border-l border-border bg-card transition-[width,opacity] duration-300 ease-out xl:flex ${
              desktopAiOpen ? "w-[31rem] opacity-100" : "w-0 opacity-0"
            }`}
          >
            <div className="flex min-h-0 w-[31rem] flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kind-ask)]">
                  Ask · about this trip
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => setDesktopAiOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close ask</span>
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <TripCopilot
                  mode="panel"
                  tripName={trip.name}
                  tripStart={trip.startDate}
                  tripEnd={trip.endDate}
                  noteDraft={noteDraft}
                  items={items}
                  packingItems={packingItems}
                  onDraftChange={(value) => {
                    setNoteDraft(value)
                    setNoteDirty(true)
                  }}
                  onSaveToBrainstorm={handleSaveBrainstormContent}
                  onAddPackingIdeas={handleAddPackingIdeas}
                  onAddCalendarItem={async (input) => {
                    await handleSaveItem(input)
                  }}
                  currentUserName={currentMember?.displayName ?? guessDisplayName(me)}
                  isMutating={isMutating}
                  docked
                  panelClassName="rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
                />
              </div>
            </div>
          </aside>
        </div>

        <div className="xl:hidden">
          <TripCopilot
            mode="drawer-trigger"
            tripName={trip.name}
            tripStart={trip.startDate}
            tripEnd={trip.endDate}
            noteDraft={noteDraft}
            items={items}
            packingItems={packingItems}
            onDraftChange={(value) => {
              setNoteDraft(value)
              setNoteDirty(true)
            }}
            onSaveToBrainstorm={handleSaveBrainstormContent}
            onAddPackingIdeas={handleAddPackingIdeas}
            onAddCalendarItem={async (input) => {
              await handleSaveItem(input)
            }}
            currentUserName={currentMember?.displayName ?? guessDisplayName(me)}
            isMutating={isMutating}
            triggerIconOnly
            triggerClassName="hidden"
            open={desktopAiOpen}
            onOpenChange={setDesktopAiOpen}
          />
        </div>
      </main>

      <PeekSheet
        open={peek === "packing"}
        onOpenChange={(open) => setPeek(open ? "packing" : null)}
        title="Packing"
        meta={`${packingChecked} of ${packingItems.length} · shared`}
      >
        <TripPackingView
          items={packingItems}
          isMutating={isMutating}
          onAddItem={handleAddPackingItem}
          onToggleItem={handleTogglePackingItem}
          onRenameItem={handleRenamePackingItem}
          onDeleteItem={handleDeletePackingItem}
        />
      </PeekSheet>

      <PeekSheet
        open={peek === "notes"}
        onOpenChange={(open) => setPeek(open ? "notes" : null)}
        title="Notes"
        meta="Shared with everyone on this trip"
      >
        <TripNotesView
          note={note}
          draft={noteDraft}
          isDirty={noteDirty}
          isSaving={isSavingNote}
          isOrganizing={isOrganizingNote}
          organizeUndoExpiresAt={organizeUndoExpiresAt}
          onDraftChange={(value) => {
            setNoteDraft(value)
            setNoteDirty(true)
          }}
          onOrganizeNotes={handleOrganizeNotes}
          onUndoOrganize={handleUndoOrganizeNotes}
        />
      </PeekSheet>

      <TripsSheet
        open={tripsOpen}
        onOpenChange={setTripsOpen}
        trips={allTrips}
        activeTripId={trip.id}
        onSelectTrip={handleSwitchTrip}
        onCreateTrip={() => {
          setCreateJoinMode("create")
          setShowCreateJoin(true)
        }}
        onJoinTrip={() => {
          setCreateJoinMode("join")
          setShowCreateJoin(true)
        }}
      />

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        defaultDate={defaultItemDate}
        editItem={editItem}
        initialInput={initialItemInput}
        initialTravel={initialTravel}
        currentUserName={currentMember?.displayName ?? guessDisplayName(me)}
        isSaving={isMutating}
        isDeleting={isMutating}
        onSave={async (input, existing) => {
          await handleSaveItem(input, existing)
          setItemDialogOpen(false)
        }}
        onDelete={async (itemId) => {
          await handleDeleteItem(itemId)
          setItemDialogOpen(false)
        }}
      />

      <ShareTripDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tripName={trip.name}
        inviteCode={trip.inviteCode}
        inviteUrl={typeof window !== "undefined" ? `${window.location.origin}/?join=${trip.inviteCode}` : `/?join=${trip.inviteCode}`}
        members={members}
        currentUserId={userId}
      />

      <Dialog open={isEditingTripDetails} onOpenChange={setIsEditingTripDetails}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md overflow-hidden rounded-3xl p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-base font-medium">Edit trip details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trip name</label>
              <Input
                value={tripName}
                onChange={(event) => setTripName(event.target.value)}
                placeholder="Trip name"
                className="h-11 border-0 bg-secondary/50 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start date</label>
                <Input
                  type="date"
                  value={tripStart}
                  onChange={(event) => {
                    setTripStart(event.target.value)
                    if (!tripEnd || event.target.value > tripEnd) {
                      setTripEnd(event.target.value)
                    }
                  }}
                  className="h-11 border-0 bg-secondary/50 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">End date</label>
                <Input
                  type="date"
                  value={tripEnd}
                  min={tripStart}
                  onChange={(event) => setTripEnd(event.target.value)}
                  className="h-11 border-0 bg-secondary/50 text-base"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border bg-background/96 px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => {
                setTripName(trip.name)
                setTripStart(trip.startDate)
                setTripEnd(trip.endDate)
                setIsEditingTripDetails(false)
              }}
              disabled={isMutating}
              className="h-11 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveTripDetails()}
              disabled={
                isMutating ||
                !tripName.trim() ||
                !tripStart ||
                !tripEnd ||
                (tripName.trim() === trip.name && tripStart === trip.startDate && tripEnd === trip.endDate)
              }
              className="h-11 rounded-xl"
            >
              {isMutating ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
