"use client"

import { ArrowLeft, Loader2, LogOut } from "lucide-react"

import { SpectrumHairline } from "@/components/trip-cover"
import { Input } from "@/components/ui/input"

type CreateJoinMode = "create" | "join"

interface CreateJoinScreenProps {
  mode: CreateJoinMode
  onModeChange: (mode: CreateJoinMode) => void
  displayName: string
  onDisplayNameChange: (value: string) => void
  tripName: string
  onTripNameChange: (value: string) => void
  tripStart: string
  onTripStartChange: (value: string) => void
  tripEnd: string
  onTripEndChange: (value: string) => void
  joinInput: string
  onJoinInputChange: (value: string) => void
  isMutating: boolean
  errorMessage: string
  hasTrips: boolean
  onCreate: () => void
  onJoin: () => void
  onBackToTrips?: () => void
  onSignOut: () => void
}

export function CreateJoinScreen({
  mode,
  onModeChange,
  displayName,
  onDisplayNameChange,
  tripName,
  onTripNameChange,
  tripStart,
  onTripStartChange,
  tripEnd,
  onTripEndChange,
  joinInput,
  onJoinInputChange,
  isMutating,
  errorMessage,
  hasTrips,
  onCreate,
  onJoin,
  onBackToTrips,
  onSignOut,
}: CreateJoinScreenProps) {
  const canCreate = Boolean(displayName.trim() && tripName.trim() && tripStart && tripEnd)
  const canJoin = Boolean(displayName.trim() && joinInput.trim())

  return (
    <main id="main-content" className="together-story create-join flex min-h-dvh flex-col overflow-y-auto overscroll-contain">
      <div className="create-join__mast">
        <div className="create-join__mast-bar">
          {hasTrips && onBackToTrips ? (
            <button
              type="button"
              onClick={onBackToTrips}
              className="create-join__nav"
              aria-label="Back to trips"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Trips
            </button>
          ) : (
            <span className="create-join__brand">Travel Calendar</span>
          )}
          <button type="button" onClick={onSignOut} className="create-join__nav create-join__nav--quiet">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
        <div className="create-join__mast-copy">
          <p className="create-join__eyebrow">
            <span className="create-join__eyebrow-dot" aria-hidden="true" />
            Together
          </p>
          <h1 className="create-join__title">Start a trip together</h1>
          <p className="create-join__sub">
            Flights, stays, and the days between — shared the moment you add them.
          </p>
        </div>
        <SpectrumHairline />
      </div>

      <div className="create-join__body">
        <div
          role="group"
          aria-label="Create or join"
          className="create-join__tabs"
        >
          <button
            type="button"
            aria-pressed={mode === "create"}
            className="create-join__tab"
            onClick={() => onModeChange("create")}
          >
            Create
          </button>
          <button
            type="button"
            aria-pressed={mode === "join"}
            className="create-join__tab"
            onClick={() => onModeChange("join")}
          >
            Join
          </button>
        </div>

        <form
          className="mt-5 flex flex-1 flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault()
            if (mode === "create") {
              if (canCreate) onCreate()
              return
            }
            if (canJoin) onJoin()
          }}
        >
          <label className="block space-y-1.5">
            <span className="create-join__label">Your name</span>
            <Input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              autoComplete="name"
              placeholder="What your partner sees"
              className="create-join__field"
            />
          </label>

          {mode === "create" ? (
            <>
              <label className="block space-y-1.5">
                <span className="create-join__label">Trip name</span>
                <Input
                  value={tripName}
                  onChange={(event) => onTripNameChange(event.target.value)}
                  placeholder="Our trip"
                  className="create-join__field"
                />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1.5">
                  <span className="create-join__label">Start</span>
                  <Input
                    type="date"
                    value={tripStart}
                    onChange={(event) => onTripStartChange(event.target.value)}
                    className="create-join__field"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="create-join__label">End</span>
                  <Input
                    type="date"
                    value={tripEnd}
                    min={tripStart}
                    onChange={(event) => onTripEndChange(event.target.value)}
                    className="create-join__field"
                  />
                </label>
              </div>
            </>
          ) : (
            <label className="block space-y-1.5">
              <span className="create-join__label">Invite code</span>
              <Input
                value={joinInput}
                onChange={(event) => onJoinInputChange(event.target.value.toLowerCase())}
                placeholder="Paste code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="create-join__field create-join__field--code"
                aria-describedby="join-code-hint"
              />
              <span id="join-code-hint" className="block text-[0.75rem] leading-5 text-muted-foreground">
                From their Invite link or invite sheet.
              </span>
            </label>
          )}

          {errorMessage ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-auto pt-6">
            <button
              type="submit"
              className="create-join__submit"
              disabled={isMutating || (mode === "create" ? !canCreate : !canJoin)}
            >
              {isMutating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {mode === "create" ? "Creating…" : "Joining…"}
                </>
              ) : (
                <>
                  <span>{mode === "create" ? "Create trip" : "Join trip"}</span>
                  <span className="create-join__submit-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
