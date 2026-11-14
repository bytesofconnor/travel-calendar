"use client"

import { useState, type ReactNode } from "react"
import { Ellipsis } from "lucide-react"

import type { Id } from "@/convex/_generated/dataModel"
import { CaptureDock } from "@/components/capture-dock"
import { ConfirmQueue } from "@/components/confirm-queue"
import { CreateJoinScreen } from "@/components/create-join-screen"
import { EditTripDialog } from "@/components/edit-trip-dialog"
import { ItemDialog } from "@/components/item-dialog"
import { PaywallScreen } from "@/components/paywall-screen"
import { ShareTripDialog } from "@/components/share-trip-dialog"
import { ThemePackPickerMenuItems } from "@/components/theme-pack-menu"
import { TripCover, SpectrumHairline } from "@/components/trip-cover"
import { TripStoryView } from "@/components/trip-story-view"
import { TripsSheet } from "@/components/trips-sheet"
import { useTripThemePack } from "@/components/use-trip-theme-pack"
import { Button } from "@/components/ui/button"
import { StoryChrome } from "@/components/story-chrome"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Trip, TripItem, TripMember } from "@/lib/kanban-store"
import { parseThemePack, type ThemePackId } from "@/lib/theme-packs"

const TRIP_ID = "trip_lisbon"
const USER_ID = "user_connor"
const REVIEW_TRIP_ID = "trips_review" as Id<"trips">

const members: TripMember[] = [
  { tripId: TRIP_ID, userId: USER_ID, role: "owner", displayName: "Connor" },
  { tripId: TRIP_ID, userId: "user_alex", role: "editor", displayName: "Alex" },
]

const trips: Trip[] = [
  {
    id: TRIP_ID,
    name: "Lisbon with you",
    inviteCode: "ab12cd34ef56",
    startDate: "2026-11-18",
    endDate: "2026-11-24",
    createdBy: USER_ID,
    createdAt: "2026-11-01T12:00:00.000Z",
    themePack: null,
  },
  {
    id: "trip_kyoto",
    name: "Kyoto in spring",
    inviteCode: "ky0t0spring1",
    startDate: "2027-03-28",
    endDate: "2027-04-04",
    createdBy: USER_ID,
    createdAt: "2026-10-02T12:00:00.000Z",
    themePack: "dusk-rose",
  },
]

const items: TripItem[] = [
  {
    id: "item_flight",
    tripId: TRIP_ID,
    title: "TAP to Lisbon",
    notes: "Aisle seats together",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    location: "SFO",
    locationTo: "LIS",
    createdBy: USER_ID,
    createdAt: "2026-11-02T12:00:00.000Z",
    updatedAt: "2026-11-02T12:00:00.000Z",
    authorName: "Connor",
    confirmLine: "Connor proposed · Alex confirmed",
  },
  {
    id: "item_stay",
    tripId: TRIP_ID,
    title: "Alfama apartment",
    notes: "Keys in the lockbox",
    startDate: "2026-11-18",
    endDate: "2026-11-24",
    location: "Alfama, Lisbon",
    createdBy: "user_alex",
    createdAt: "2026-11-02T13:00:00.000Z",
    updatedAt: "2026-11-02T13:00:00.000Z",
    authorName: "Alex",
    confirmLine: "Alex proposed · Connor confirmed",
  },
  {
    id: "item_place",
    tripId: TRIP_ID,
    title: "Time Out Market",
    startDate: "2026-11-19",
    endDate: "2026-11-19",
    location: "Cais do Sodré",
    createdBy: "user_alex",
    createdAt: "2026-11-03T12:00:00.000Z",
    updatedAt: "2026-11-03T12:00:00.000Z",
    authorName: "Alex",
    confirmLine: "Alex proposed · waiting on Connor",
  },
]

const editItem = items[2]

function TripFrame({
  screen,
  mode,
  themePack,
  children,
}: {
  screen: string
  mode: "trip" | "today"
  themePack: ThemePackId | null
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(screen === "theme")

  return (
    <main
      id="main-content"
      data-review-ready="true"
      data-screen={screen}
      className="together-story relative z-10 flex h-dvh flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          <div className="story-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {mode === "trip" ? (
              <TripCover
                tripName="Lisbon with you"
                meta="Nov 18 – 24 · 7 days · you & Alex · Connor proposed · Alex confirmed"
                showHairline={false}
              />
            ) : null}
            <div className="story-chrome-sticky sticky z-20">
              <SpectrumHairline />
              <header className="border-b border-border/80 bg-background">
                <div className="story-shell">
                  <StoryChrome
                    mode={mode}
                    onModeChange={() => {}}
                    onOpenTrips={() => {}}
                    onInvite={() => {}}
                    youInitial="C"
                    partnerInitial="A"
                    partnerName="Alex"
                    menu={
                      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
                          <DropdownMenuItem>All trips</DropdownMenuItem>
                          <DropdownMenuItem>New or join</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ThemePackPickerMenuItems
                            tripId={REVIEW_TRIP_ID}
                            themePack={themePack}
                            onError={() => {}}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Edit trip</DropdownMenuItem>
                          <DropdownMenuItem>Sign out</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                </div>
              </header>
            </div>
            {screen === "confirm" ? (
              <ConfirmQueue
                rows={[
                  {
                    proposalId: "prop_market",
                    text: "Alex proposed Time Out Market on Nov 19.",
                    glanceUrl: "https://www.travelcalendar.space/?confirm=prop_market",
                  },
                  {
                    proposalId: "prop_checkin",
                    text: "Move the Alfama check-in to the afternoon so the flight lands first.",
                    glanceUrl: "https://www.travelcalendar.space/?confirm=prop_checkin",
                  },
                ]}
                highlightedId="prop_market"
                onConfirm={() => {}}
                onReject={() => {}}
              />
            ) : null}
            {children}
          </div>
          <CaptureDock hint={mode === "today" ? "What’s happening today?" : "Add to the trip…"} onCapture={() => {}} />
        </div>
      </div>
    </main>
  )
}

export function ReviewGallery({ screen, theme }: { screen: string; theme: string | null }) {
  const themePack = parseThemePack(theme)
  useTripThemePack(themePack)
  const [tripName, setTripName] = useState("Lisbon with you")
  const [tripStart, setTripStart] = useState("2026-11-18")
  const [tripEnd, setTripEnd] = useState("2026-11-24")
  const [displayName, setDisplayName] = useState("Alex")
  const [joinInput, setJoinInput] = useState("ab12cd34ef56")
  const [createName, setCreateName] = useState("")

  if (screen === "join" || screen === "create") {
    const mode = screen === "join" ? "join" : "create"
    return (
      <div data-review-ready="true" data-screen={screen}>
        <CreateJoinScreen
          mode={mode}
          onModeChange={() => {}}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          tripName={mode === "create" ? createName : "Lisbon with you"}
          onTripNameChange={setCreateName}
          tripStart={tripStart}
          onTripStartChange={setTripStart}
          tripEnd={tripEnd}
          onTripEndChange={setTripEnd}
          joinInput={joinInput}
          onJoinInputChange={setJoinInput}
          isMutating={false}
          errorMessage=""
          hasTrips
          onCreate={() => {}}
          onJoin={() => {}}
          onBackToTrips={() => {}}
          onSignOut={() => {}}
        />
      </div>
    )
  }

  if (screen === "paywall") {
    return (
      <div data-review-ready="true" data-screen={screen}>
        <PaywallScreen userId={USER_ID} paymentLink={null} onAccessGranted={() => {}} />
      </div>
    )
  }

  const mode = screen === "today" ? "today" : "trip"

  return (
    <>
      <TripFrame screen={screen} mode={mode} themePack={themePack}>
        <TripStoryView
          className="story-shell"
          mode={mode}
          items={items}
          today="2026-11-18"
          tripStart="2026-11-18"
          tripEnd="2026-11-24"
          dayNumber={1}
          currentUserId={USER_ID}
          packingChecked={2}
          packingTotal={6}
          notesCount={1}
          onEditItem={() => {}}
          onStartFlight={() => {}}
          onStartStay={() => {}}
          onStartPlace={() => {}}
          onInvite={() => {}}
          onOpenPacking={() => {}}
          onOpenNotes={() => {}}
          onOpenAsk={() => {}}
        />
      </TripFrame>
      <TripsSheet
        open={screen === "trips"}
        onOpenChange={() => {}}
        trips={trips}
        activeTripId={TRIP_ID}
        onSelectTrip={() => {}}
        onCreateTrip={() => {}}
        onJoinTrip={() => {}}
      />
      <ItemDialog
        open={screen === "add" || screen === "edit"}
        onOpenChange={() => {}}
        defaultDate="2026-11-19"
        editItem={screen === "edit" ? editItem : null}
        currentUserName="Connor"
        onSave={() => {}}
        onDelete={() => {}}
      />
      <ShareTripDialog
        open={screen === "invite"}
        onOpenChange={() => {}}
        tripName="Lisbon with you"
        inviteCode="ab12cd34ef56"
        inviteUrl="https://www.travelcalendar.space/?join=ab12cd34ef56"
        members={members}
        currentUserId={USER_ID}
      />
      <EditTripDialog
        open={screen === "edit-trip"}
        onOpenChange={() => {}}
        tripName={tripName}
        onTripNameChange={setTripName}
        tripStart={tripStart}
        onTripStartChange={(value) => {
          setTripStart(value)
          if (!tripEnd || value > tripEnd) setTripEnd(value)
        }}
        tripEnd={tripEnd}
        onTripEndChange={setTripEnd}
        onCancel={() => {}}
        onSave={() => {}}
        saveDisabled={false}
        isSaving={false}
      />
    </>
  )
}
