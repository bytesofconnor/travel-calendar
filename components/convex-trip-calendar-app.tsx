"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Calendar,
  Ellipsis,
  Heart,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Pencil,
  Plane,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { SaveErrorBanner } from "@/components/save-error-banner"
import { Button } from "@/components/ui/button"
import { publicError } from "@/lib/client-error"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditTripDialog } from "./edit-trip-dialog"
import { PersonFilter } from "./person-filter"
import { StoryChrome } from "./story-chrome"
import {
  DEFAULT_TRIP_END,
  DEFAULT_TRIP_NAME,
  DEFAULT_TRIP_START,
  withAuthorNames,
  withPackingAuthorNames,
  type Trip,
  type TripItem,
  type TripItemInput,
  type TripMember,
  type TripPackingItem,
} from "@/lib/kanban-store"
import { buildTripHome, type GapAction } from "@/lib/trip-home/detect"
import {
  dayIndexInTrip,
  tripDayCount,
} from "@/lib/trip-kind"
import { formatTripDateRange } from "@/lib/format-dates"
import { goIdsForDay, openIdeas, plansWithoutNotes, type IdeaRecord } from "@/lib/ideas"
import { defaultPlanDate, guessPlanType, tripPlaceHint } from "@/lib/plan-form"
import type { PlanType } from "@/lib/plan-types"
import { filterItems, writeWho } from "@/lib/person-filter"
import { addedPlanMessage, firstName, travelerLabel } from "@/lib/travelers"
import { oauthRedirectTo } from "@/lib/oauth-redirect"
import { parseThemePack } from "@/lib/theme-packs"
import { StatusBanner } from "@/components/ds"
import { ThemePackPickerMenuItems } from "@/components/theme-pack-menu"
import { useTripThemePack } from "@/components/use-trip-theme-pack"
import { AddToCalendarSheet } from "./add-to-calendar-sheet"
import { AddTripButton, type CaptureKind } from "./capture-dock"
import { useDayWeather } from "./day-weather"
import { PageShell } from "./page-shell"
import { TemperatureMenuItems } from "./weather-chip"
import { TripWorkspace } from "./trip-workspace"
import { ConfirmQueue } from "./confirm-queue"
import { CreateJoinScreen } from "./create-join-screen"
import { ItemDialog } from "./item-dialog"
import { LoginScreen } from "./login-screen"
import { PaywallScreen } from "./paywall-screen"
import { PeekSheet } from "./peek-sheet"
import { ShareTripDialog } from "./share-trip-dialog"
import { IdeasLink, IdeasSheet } from "./ideas-sheet"
import { TripPackingView } from "./trip-packing-view"
import { TripHome } from "./trip-home"
import { TripMonthView } from "./trip-month-view"
import { TripListBody } from "./trip-list-body"
import { TripsSheet } from "./trips-sheet"

const LAST_TRIP_KEY = "travel-calendar:last-trip-id"

interface ConvexTripCalendarAppProps {
  joinCode?: string
  confirmId?: string
  tripId?: string
  planId?: string
  who?: string
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

function storedPlace(place: TripItemInput["place"]) {
  if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") return null
  return {
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    ...(place.label ? { label: place.label } : {}),
    ...(place.kind ? { kind: place.kind } : {}),
    ...(place.code ? { code: place.code } : {}),
    ...(place.city ? { city: place.city } : {}),
    ...(place.country ? { country: place.country } : {}),
    ...(place.timeZone ? { timeZone: place.timeZone } : {}),
  }
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
  const message = error instanceof Error ? error.message : ""
  if (/AUTH_RESEND_KEY|Missing AUTH_RESEND/i.test(message)) {
    return "Email OTP needs AUTH_RESEND_KEY set in your Convex deployment env (npx convex env set AUTH_RESEND_KEY …)."
  }
  return publicError(error, fallback)
}

function LoadingJourney({ label = "Loading your trip", detail = "Pulling plans, notes, and packing lists together." }: { label?: string; detail?: string }) {
  return (
    <PageShell className="relative flex h-dvh items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(96,165,250,0.08),_transparent_30%)]" />
      <div className="page-inset page-inset--read relative flex flex-col items-center text-center">
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
        <p className="measure mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </PageShell>
  )
}

export function ConvexTripCalendarApp({ joinCode, confirmId, tripId, planId, who }: ConvexTripCalendarAppProps) {
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
  const pendingQuery = useQuery(
    api.proposals.pending,
    isAuthenticated && me ? (confirmId ? { confirmId } : {}) : "skip",
  )

  const createTrip = useMutation(api.trips.create)
  const joinTrip = useMutation(api.trips.join)
  const updateTrip = useMutation(api.trips.update)
  const updateCover = useMutation(api.trips.updateCover)
  const createItem = useMutation(api.items.create)
  const updateItem = useMutation(api.items.update)
  const removeItem = useMutation(api.items.remove)
  const confirmProposal = useMutation(api.proposals.confirm)
  const rejectProposal = useMutation(api.proposals.reject)
  const addIdea = useMutation(api.ideas.add)
  const toggleIdea = useMutation(api.ideas.toggleGo)
  const ensureIdea = useMutation(api.ideas.ensureFromNote)
  const placeIdea = useMutation(api.ideas.putOnDay)
  const ensureCalendar = useMutation(api.calendarFeeds.ensure)
  const resetCalendar = useMutation(api.calendarFeeds.reset)
  const addPacking = useMutation(api.packing.add)
  const togglePacking = useMutation(api.packing.toggle)
  const renamePacking = useMutation(api.packing.rename)
  const removePacking = useMutation(api.packing.remove)
  const setGapClaim = useMutation(api.gapClaims.set)

  const [tripName, setTripName] = useState(DEFAULT_TRIP_NAME)
  const [tripStart, setTripStart] = useState(DEFAULT_TRIP_START)
  const [tripEnd, setTripEnd] = useState(DEFAULT_TRIP_END)
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [joinInput, setJoinInput] = useState(joinCode ?? "")
  const [authMessage, setAuthMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const failedSave = useRef<{ input: TripItemInput; existing?: TripItem } | null>(null)
  const [canRetrySave, setCanRetrySave] = useState(false)
  const [isSendingAuth, setIsSendingAuth] = useState(false)
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false)
  const [hasPendingCode, setHasPendingCode] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [placingIdea, setPlacingIdea] = useState<IdeaRecord | null>(null)
  const ideasLinkRef = useRef<HTMLButtonElement>(null)
  const skipIdeasFocus = useRef(false)
  const [isEditingTripDetails, setIsEditingTripDetails] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [calendarError, setCalendarError] = useState("")
  const [isRefreshingCover, setIsRefreshingCover] = useState(false)
  const [storyMode, setStoryMode] = useState<"list" | "month">("list")
  const [storyModeReady, setStoryModeReady] = useState(false)
  const [peek, setPeek] = useState<"packing" | null>(null)
  const [tripsOpen, setTripsOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<TripItem | null>(null)
  const [defaultItemDate, setDefaultItemDate] = useState<string | null>(null)
  const [initialItemInput, setInitialItemInput] = useState<Partial<TripItemInput> | null>(null)
  const [initialType, setInitialType] = useState<PlanType | null>(null)
  const [emphasizeItemId, setEmphasizeItemId] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [homeNow] = useState(() => ({
    instant: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  }))
  const [claimDraft, setClaimDraft] = useState<Record<string, string | null>>({})
  const [personId, setPersonId] = useState<string | null>(who ?? null)

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
      image: member.image ?? null,
    }))
  }, [bundle, me])

  const items: TripItem[] = useMemo(() => {
    if (!bundle) return []
    return withAuthorNames(
      bundle.items.map((item) => {
        const proposed = item.proposedBy
          ? members.find((member) => member.userId === item.proposedBy)?.displayName
          : undefined
        const confirmed = item.confirmedBy
          ? members.find((member) => member.userId === item.confirmedBy)?.displayName
          : undefined
        return {
          id: item._id,
          tripId: item.tripId,
          title: item.title,
          notes: item.notes,
          link: item.linkUrl ? { label: item.linkLabel ?? "Link", url: item.linkUrl } : undefined,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location,
          locationTo: item.locationTo,
          planType: item.planType,
          travelMode: item.travelMode,
          place: item.place,
          placeTo: item.placeTo,
          confirmation: item.confirmation,
          flightCode: item.flightCode,
          address: item.address,
          startTime: item.startTime,
          endTime: item.endTime,
          startTimeZone: item.startTimeZone,
          endTimeZone: item.endTimeZone,
          createdBy: item.createdBy,
          createdAt: toIso(item._creationTime),
          updatedAt: toIso(item._creationTime),
          confirmLine:
            proposed && confirmed ? `${proposed} proposed · ${confirmed} confirmed` : undefined,
          ...(item.attendeeIds && item.attendeeIds.length > 0 ? { attendeeIds: item.attendeeIds } : {}),
        }
      }),
      members,
    )
  }, [bundle, members])

  const storedIdeas: IdeaRecord[] = useMemo(() => {
    if (!bundle) return []
    return bundle.ideas.map((idea) => ({
      id: idea._id,
      text: idea.text,
      ...(idea.linkUrl ? { linkUrl: idea.linkUrl } : {}),
      suggestedBy: idea.suggestedBy,
      goUserIds: idea.goUserIds,
      status: idea.status,
      ...(idea.suggestedDate ? { suggestedDate: idea.suggestedDate } : {}),
      ...(idea.sourceItemId ? { sourceItemId: idea.sourceItemId } : {}),
    }))
  }, [bundle])

  const ideaList = useMemo(
    () =>
      openIdeas(
        storedIdeas,
        items
          .filter((item) => item.planType === "note")
          .map((item) => ({
            id: item.id,
            title: item.title,
            linkUrl: item.link?.url,
            createdBy: item.createdBy,
            startDate: item.startDate,
            planType: item.planType,
          })),
      ),
    [items, storedIdeas],
  )

  const datedItems = useMemo(() => plansWithoutNotes(items), [items])

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
    if (planId) {
      setStoryMode("list")
      setEmphasizeItemId(planId)
    }
    setStoryModeReady(true)
  }, [planId, storyModeReady, trip])

  const homeModel = useMemo(() => {
    if (!trip) return null
    return buildTripHome({
      trip: { startDate: trip.startDate, endDate: trip.endDate },
      plans: datedItems.map((item) => ({
        id: item.id,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate,
        location: item.location ?? "",
        locationTo: item.locationTo,
        startTime: item.startTime,
        endTime: item.endTime,
        startTimeZone: item.startTimeZone,
        endTimeZone: item.endTimeZone,
        notes: item.notes,
        planType: item.planType,
        travelMode: item.travelMode,
      })),
      now: homeNow,
    })
  }, [datedItems, homeNow, trip])
  const weather = useDayWeather(datedItems, {
    start: trip?.startDate ?? today,
    end: trip?.endDate ?? today,
  })
  const homeClaims = useMemo(() => {
    const byGap = new Map<string, { gapId: string; userId: string; displayName: string }>()
    for (const claim of bundle?.gapClaims ?? []) {
      byGap.set(claim.gapId, {
        gapId: claim.gapId,
        userId: claim.userId,
        displayName: claim.displayName,
      })
    }
    for (const [gapId, holderId] of Object.entries(claimDraft)) {
      if (!holderId) {
        byGap.delete(gapId)
        continue
      }
      const member = members.find((entry) => entry.userId === holderId)
      byGap.set(gapId, {
        gapId,
        userId: holderId,
        displayName: member?.displayName ?? "You",
      })
    }
    return [...byGap.values()]
  }, [bundle?.gapClaims, claimDraft, members])

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
      if (tripId && tripsQuery.some((candidate) => candidate._id === tripId)) {
        return tripId as Id<"trips">
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
  }, [tripsQuery, joinCode, tripId])

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
        clearSaveRetry(); setErrorMessage(publicError(error, "Invite code not found."))
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

  async function handleContinueWithGoogle() {
    setIsSigningInWithGoogle(true)
    setAuthMessage("")
    setErrorMessage("")
    try {
      await signIn("google", { redirectTo: oauthRedirectTo(window.location.href) })
    } catch (error) {
      clearSaveRetry(); setErrorMessage(authErrorMessage(error, "Unable to sign in with Google."))
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
      clearSaveRetry(); setErrorMessage(authErrorMessage(error, "Unable to send email code."))
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
      clearSaveRetry(); setErrorMessage(authErrorMessage(error, "Invalid or expired code."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to create trip."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Invite code not found."))
    } finally {
      setIsMutating(false)
    }
  }

  function clearSaveRetry() {
    failedSave.current = null
    setCanRetrySave(false)
  }

  async function handleSaveItem(input: TripItemInput, existingItem?: TripItem) {
    if (!trip || !userId) return false

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
        planType: input.planType,
        ...(input.travelMode ? { travelMode: input.travelMode } : {}),
        place: storedPlace(input.place),
        placeTo: storedPlace(input.placeTo),
        confirmation: input.confirmation ?? "",
        flightCode: input.flightCode ?? "",
        address: input.address ?? "",
        startTime: input.startTime,
        endTime: input.endTime,
        startTimeZone: input.startTimeZone,
        endTimeZone: input.endTimeZone,
        ...(input.attendeeIds !== undefined
          ? { attendeeIds: input.attendeeIds as Id<"users">[] }
          : {}),
      }
      if (existingItem) {
        await updateItem({ itemId: existingItem.id as Id<"tripItems">, ...payload })
        setEmphasizeItemId(existingItem.id)
      } else if (placingIdea) {
        let ideaId = placingIdea.id as Id<"tripIdeas">
        if (placingIdea.derived && placingIdea.sourceItemId) {
          ideaId = await ensureIdea({
            tripId: trip.id as Id<"trips">,
            sourceItemId: placingIdea.sourceItemId as Id<"tripItems">,
          })
        }
        const placed = await placeIdea({
          ideaId,
          title: payload.title,
          notes: payload.notes,
          linkLabel: payload.linkLabel,
          linkUrl: payload.linkUrl,
          startDate: payload.startDate,
          endDate: payload.endDate,
          location: payload.location,
          locationTo: payload.locationTo,
          planType: payload.planType === "stay" || payload.planType === "flight" ? payload.planType : "place",
          ...(payload.travelMode ? { travelMode: payload.travelMode } : {}),
          place: payload.place,
          placeTo: payload.placeTo,
          startTime: payload.startTime,
          endTime: payload.endTime,
          startTimeZone: payload.startTimeZone,
          endTimeZone: payload.endTimeZone,
          confirmation: payload.confirmation,
          flightCode: payload.flightCode,
          address: payload.address,
          ...(payload.attendeeIds !== undefined ? { attendeeIds: payload.attendeeIds } : {}),
        })
        setEmphasizeItemId(placed.itemId)
        setPlacingIdea(null)
        setIdeasOpen(false)
        setShareMessage(addedPlanMessage(input.attendeeIds, members))
        window.setTimeout(() => setShareMessage(""), 2000)
      } else {
        const created = await createItem({ tripId: trip.id as Id<"trips">, ...payload })
        if (typeof created.itemId === "string") {
          setEmphasizeItemId(created.itemId)
        }
        setShareMessage(addedPlanMessage(input.attendeeIds, members))
        window.setTimeout(() => setShareMessage(""), 2000)
      }
      clearSaveRetry()
      return true
    } catch (error) {
      console.error("Couldn't save that plan.", error)
      failedSave.current = { input, existing: existingItem }
      setCanRetrySave(true)
      setErrorMessage("Couldn't save that plan. Try again.")
      return false
    } finally {
      setIsMutating(false)
    }
  }

  async function retrySave() {
    const pending = failedSave.current
    if (!pending) return
    await handleSaveItem(pending.input, pending.existing)
  }

  function openGap(action: GapAction) {
    setPlacingIdea(null)
    if (action.itemId) {
      const item = items.find((entry) => entry.id === action.itemId)
      if (item) {
        openEditItem(item)
        return
      }
    }
    setEditItem(null)
    setDefaultItemDate(action.startDate)
    setInitialType(action.flow === "stay" ? "stay" : action.flow === "place" ? "place" : "flight")
    setInitialItemInput({
      title: action.title,
      startDate: action.startDate,
      endDate: action.endDate,
      location: action.location,
      locationTo: action.locationTo,
    })
    setItemDialogOpen(true)
  }

  async function handleClaim(gapId: string, claimed: boolean) {
    if (!trip || !userId) return
    setClaimDraft((current) => ({ ...current, [gapId]: claimed ? userId : null }))
    try {
      await setGapClaim({ tripId: trip.id as Id<"trips">, gapId, claimed })
      setClaimDraft((current) => {
        if (!(gapId in current)) return current
        const next = { ...current }
        delete next[gapId]
        return next
      })
    } catch (error) {
      setClaimDraft((current) => {
        const next = { ...current }
        delete next[gapId]
        return next
      })
      clearSaveRetry(); setErrorMessage(publicError(error, "Couldn't update who's handling this."))
    }
  }

  function openCapture(kind?: CaptureKind, date?: string, text?: string) {
    const baseDate = defaultPlanDate({
      tapped: date,
      tripStart: trip?.startDate,
      tripEnd: trip?.endDate,
      plans: datedItems,
      today,
    })
    const typed = kind ?? (text?.trim() ? guessPlanType(text) : null)
    setPlacingIdea(null)
    setEditItem(null)
    setDefaultItemDate(baseDate)
    setInitialType(typed)
    setInitialItemInput({
      title: text?.trim() ?? "",
      startDate: baseDate,
      endDate: baseDate,
    })
    setItemDialogOpen(true)
  }

  function openEditItem(item: TripItem) {
    setPlacingIdea(null)
    setEditItem(item)
    setDefaultItemDate(item.startDate)
    setInitialItemInput(null)
    setInitialType(null)
    setItemDialogOpen(true)
  }

  async function handleDeleteItem(itemId: string) {
    if (!trip) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await removeItem({ itemId: itemId as Id<"tripItems"> })
    } catch (error) {
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to delete plan."))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleAddPackingItem(label: string) {
    if (!trip) return

    setIsMutating(true)
    setErrorMessage("")
    try {
      await addPacking({ tripId: trip.id as Id<"trips">, label: label.trim() })
    } catch (error) {
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to add packing item."))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleAddIdea(text: string, linkUrl?: string) {
    if (!trip) return
    setErrorMessage("")
    try {
      await addIdea({ tripId: trip.id as Id<"trips">, text, ...(linkUrl ? { linkUrl } : {}) })
    } catch (error) {
      clearSaveRetry()
      setErrorMessage(publicError(error, "Couldn't add that idea."))
    }
  }

  async function handleToggleIdea(idea: IdeaRecord) {
    if (!trip) return
    setErrorMessage("")
    try {
      const ideaId =
        idea.derived && idea.sourceItemId
          ? await ensureIdea({
              tripId: trip.id as Id<"trips">,
              sourceItemId: idea.sourceItemId as Id<"tripItems">,
            })
          : (idea.id as Id<"tripIdeas">)
      await toggleIdea({ ideaId })
    } catch (error) {
      clearSaveRetry()
      setErrorMessage(publicError(error, "Couldn't update who'd go."))
    }
  }

  function handlePlaceIdea(idea: IdeaRecord) {
    if (!trip || !userId) return
    const date =
      idea.suggestedDate ||
      defaultPlanDate({
        tripStart: trip.startDate,
        tripEnd: trip.endDate,
        plans: datedItems,
        today,
      })
    setPlacingIdea(idea)
    setEditItem(null)
    setInitialType("place")
    setDefaultItemDate(date)
    setInitialItemInput({
      title: idea.text,
      startDate: date,
      endDate: date,
      location: "",
      planType: "place",
      attendeeIds: goIdsForDay(
        idea.goUserIds,
        userId,
        members.map((member) => member.userId),
      ),
      ...(idea.linkUrl ? { link: { label: "Link", url: idea.linkUrl } } : {}),
    })
    setIdeasOpen(false)
    setItemDialogOpen(true)
  }

  async function handleTogglePackingItem(item: TripPackingItem, nextChecked: boolean) {
    setIsMutating(true)
    setErrorMessage("")
    try {
      await togglePacking({ itemId: item.id as Id<"tripPackingItems">, isChecked: nextChecked })
    } catch (error) {
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to update packing item."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to rename packing item."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to delete packing item."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to refresh cover."))
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
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to update trip."))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleConfirmProposal(proposalId: string) {
    const name = (displayName.trim() || currentMember?.displayName || guessDisplayName(me)).trim()
    setIsMutating(true)
    setErrorMessage("")
    try {
      const result = await confirmProposal({
        proposalId: proposalId as Id<"proposals">,
        ...(name ? { displayName: name } : {}),
      })
      if (result.status === "confirmed" && result.target === "trip" && result.op === "add" && result.tripId) {
        const tripId = String(result.tripId) as Id<"trips">
        setActiveTripId(tripId)
        setShowCreateJoin(false)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAST_TRIP_KEY, tripId)
        }
      }
      setShareMessage("Confirmed.")
      window.setTimeout(() => setShareMessage(""), 2000)
    } catch (error) {
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to confirm."))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleRejectProposal(proposalId: string) {
    setIsMutating(true)
    setErrorMessage("")
    try {
      await rejectProposal({ proposalId: proposalId as Id<"proposals"> })
      setShareMessage("Rejected.")
      window.setTimeout(() => setShareMessage(""), 2000)
    } catch (error) {
      clearSaveRetry(); setErrorMessage(publicError(error, "Unable to reject."))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    setActiveTripId(null)
    setShowCreateJoin(false)
    setAutoJoinAttempted(false)
    setErrorMessage("")
    setAuthMessage("")
  }

  function handleSwitchTrip(nextTripId: string) {
    setActiveTripId(nextTripId as Id<"trips">)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_TRIP_KEY, nextTripId)
    }
  }

  const confirmQueue = (
    <ConfirmQueue
      rows={(pendingQuery ?? []).map((row) => ({
        proposalId: row.proposalId,
        text: row.text,
        glanceUrl: row.glanceUrl,
      }))}
      highlightedId={confirmId}
      onConfirm={(proposalId) => void handleConfirmProposal(proposalId)}
      onReject={(proposalId) => void handleRejectProposal(proposalId)}
    />
  )

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
    return <LoadingJourney label="Loading your trips" detail="Opening your calendar…" />
  }

  if (access.required && !access.granted && me) {
    return (
      <PaywallScreen
        userId={me._id}
        paymentLink={access.paymentUrl}
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
        notice={confirmQueue}
      />
    )
  }

  if (bundle === undefined || !trip) {
    return <LoadingJourney />
  }

  if (bundle === null) {
    return (
      <PageShell className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">You don’t have access to this trip.</p>
        <Button
          onClick={() => {
            setActiveTripId(null)
            setShowCreateJoin(true)
          }}
        >
          Choose another trip
        </Button>
      </PageShell>
    )
  }

  const dayCount = tripDayCount(trip.startDate, trip.endDate)
  const tripProposer = bundle?.trip.proposedBy
    ? members.find((member) => member.userId === bundle.trip.proposedBy)?.displayName
    : undefined
  const tripConfirmer = bundle?.trip.confirmedBy
    ? members.find((member) => member.userId === bundle.trip.confirmedBy)?.displayName
    : undefined
  const tripAttribution =
    tripProposer && tripConfirmer ? `${tripProposer} proposed · ${tripConfirmer} confirmed` : null
  const coverMeta = [
    formatTripDateRange(trip.startDate, trip.endDate),
    `${dayCount} day${dayCount === 1 ? "" : "s"}`,
    travelerLabel(members, userId),
    tripAttribution,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ")
  const packingChecked = packingItems.filter((item) => item.isChecked).length
  const activePerson = members.find((member) => member.userId === personId) ?? null
  const visibleItems = filterItems(
    datedItems,
    activePerson?.userId ?? null,
    members.map((member) => member.userId),
  )
  function choosePerson(nextUserId: string) {
    setPersonId((current) => {
      const next = current === nextUserId ? null : nextUserId
      writeWho(next)
      return next
    })
  }

  return (
    <>
      <TripWorkspace
        mode={storyMode}
        tripName={trip.name}
        meta={coverMeta}
        coverImageUrl={trip.coverImageUrl}
        onOpenTrips={() => setTripsOpen(true)}
        tripsOpen={tripsOpen}
        toolbar={
                    <StoryChrome
                      mode={storyMode}
                      onModeChange={setStoryMode}
                      onInvite={() => setShareOpen(true)}
                      travelers={members}
                      currentUserId={userId}
                      onOpenMembers={() => setShareOpen(true)}
                      selectedUserId={activePerson?.userId ?? null}
                      onSelectPerson={choosePerson}
                      tools={<IdeasLink count={ideaList.length} onClick={() => setIdeasOpen(true)} />}
                      menu={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            className="story-chrome__hit text-muted-foreground hover:text-foreground"
                            aria-label="More actions"
                          >
                            <Ellipsis className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" collisionPadding={8} className="w-60">
                          <DropdownMenuItem
                            onSelect={() => {
                              setCalendarError("")
                              setCalendarOpen(true)
                              if (!trip) return
                              void ensureCalendar({ tripId: trip.id as Id<"trips"> })
                                .then((result) => setCalendarToken(result.token))
                                .catch((error: unknown) => {
                                  setCalendarError(publicError(error, "Couldn't make a calendar link."))
                                })
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                            Add to calendar
                          </DropdownMenuItem>
                          <ThemePackPickerMenuItems
                            tripId={trip.id as Id<"trips">}
                            themePack={trip.themePack}
                            onError={(message) => {
                              clearSaveRetry()
                              setErrorMessage(publicError(new Error(message), "Could not set the theme."))
                            }}
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
                          <DropdownMenuSeparator />
                          <TemperatureMenuItems units={weather.units} onChange={weather.choose} />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => void handleSignOut()}>
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      }
                    />
        }
        banners={
          <>
            {shareMessage ? <StatusBanner tone="success">{shareMessage}</StatusBanner> : null}
            {errorMessage && canRetrySave ? (
              <SaveErrorBanner onRetry={() => void retrySave()} pending={isMutating} />
            ) : errorMessage ? (
              <StatusBanner tone="error">{errorMessage}</StatusBanner>
            ) : null}
          </>
        }
        composer={<AddTripButton onAdd={() => openCapture()} />}
      >
        {confirmQueue}
        {activePerson ? (
          <PersonFilter
            name={firstName(activePerson.displayName)}
            count={visibleItems.length}
            total={datedItems.length}
            onClear={() => {
              setPersonId(null)
              writeWho(null)
            }}
          />
        ) : null}
        {storyMode === "month" ? (
          <TripMonthView
            items={visibleItems}
            tripStart={trip.startDate}
            tripEnd={trip.endDate}
            today={today}
            onEditItem={openEditItem}
            onAddItem={(date) => openCapture(undefined, date)}
            weather={weather}
          />
        ) : (
          <TripListBody
            className="trip-list__story"
            home={
              homeModel ? (
                <TripHome
                  className="trip-list__rail"
                  model={homeModel}
                  members={members}
                  claims={homeClaims}
                  currentUserId={userId}
                  onClaim={(gapId, claimed) => {
                    void handleClaim(gapId, claimed)
                  }}
                  onAction={openGap}
                  onOpenItem={(id) => {
                    const item = items.find((entry) => entry.id === id)
                    if (item) openEditItem(item)
                  }}
                  weather={weather}
                />
              ) : null
            }
            items={visibleItems}
            filterName={activePerson ? firstName(activePerson.displayName) : undefined}
            today={today}
            tripStart={trip.startDate}
            tripEnd={trip.endDate}
            dayNumber={dayIndexInTrip(today, trip.startDate)}
            currentUserId={userId}
            members={members}
            emphasizeItemId={emphasizeItemId}
            packingChecked={packingChecked}
            packingTotal={packingItems.length}
            onEditItem={openEditItem}
            onStartFlight={() => openCapture("flight")}
            onStartStay={() => openCapture("stay")}
            onStartPlace={() => openCapture("place")}
            onInvite={() => setShareOpen(true)}
            onOpenPacking={() => setPeek("packing")}
            weather={weather}
          />
        )}
      </TripWorkspace>

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

      <IdeasSheet
        open={ideasOpen}
        onOpenChange={setIdeasOpen}
        ideas={ideaList}
        members={members}
        currentUserId={userId ?? ""}
        onAdd={(text, linkUrl) => void handleAddIdea(text, linkUrl)}
        onToggle={(idea) => void handleToggleIdea(idea)}
        onPlace={handlePlaceIdea}
      />

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
        onOpenChange={(open) => {
          setItemDialogOpen(open)
          if (!open) setPlacingIdea(null)
        }}
        defaultDate={defaultItemDate}
        editItem={editItem}
        initialInput={initialItemInput}
        initialType={initialType}
        placeHint={tripPlaceHint(trip.name)}
        units={weather.units}
        currentUserName={currentMember?.displayName ?? guessDisplayName(me)}
        members={members}
        isSaving={isMutating}
        isDeleting={isMutating}
        onSave={async (input, existing) => {
          const saved = await handleSaveItem(input, existing)
          if (!saved) return
          setItemDialogOpen(false)
        }}
        onDelete={async (itemId) => {
          await handleDeleteItem(itemId)
          setItemDialogOpen(false)
        }}
      />

      <AddToCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        tripName={trip.name}
        token={calendarToken}
        error={calendarError}
        onReset={async () => {
          const result = await resetCalendar({ tripId: trip.id as Id<"trips"> })
          setCalendarToken(result.token)
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

      <EditTripDialog
        open={isEditingTripDetails}
        onOpenChange={setIsEditingTripDetails}
        tripName={tripName}
        onTripNameChange={setTripName}
        tripStart={tripStart}
        onTripStartChange={(value) => {
          setTripStart(value)
          if (!tripEnd || value > tripEnd) {
            setTripEnd(value)
          }
        }}
        tripEnd={tripEnd}
        onTripEndChange={setTripEnd}
        onCancel={() => {
          setTripName(trip.name)
          setTripStart(trip.startDate)
          setTripEnd(trip.endDate)
          setIsEditingTripDetails(false)
        }}
        onSave={() => void handleSaveTripDetails()}
        saveDisabled={
          !tripName.trim() ||
          !tripStart ||
          !tripEnd ||
          (tripName.trim() === trip.name && tripStart === trip.startDate && tripEnd === trip.endDate)
        }
        isSaving={isMutating}
      />
    </>
  )
}
