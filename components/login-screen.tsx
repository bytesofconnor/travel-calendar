"use client"

import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Curated Unsplash travel & couples photos — stable CDN URLs, no API key needed
const PHOTOS = [
  { id: "1476514525535-07fb3b4ae5f1", alt: "Mountain lake" },
  { id: "1469854523086-cc02fe5d8800", alt: "Road trip" },
  { id: "1436491865332-7a61a109cc05", alt: "Airplane at sunset" },
  { id: "1506905925346-21bda4d32df4", alt: "Mountain summit" },
  { id: "1772722086029-81b509bfd1df", alt: "Salar de Uyuni" },
  { id: "1506197603052-3cc9c3a201bd", alt: "Santorini" },
  { id: "1488646953014-85cb44e25828", alt: "Tropical coast" },
  { id: "1519677100203-a0e668c92439", alt: "Venice canal" },
  { id: "1543771917-91f5f479e04b", alt: "Salar de Uyuni 2" },
  { id: "1547981609-4b6bfe67ca0b", alt: "Amalfi coast" },
  { id: "1499696010180-025ef6e1a8f9", alt: "Beach couple" },
  { id: "1533105079780-92b9be482077", alt: "Resort pool" },
  { id: "1507525428034-b723cf961d3e", alt: "Tropical beach" },
  { id: "1528360983277-13d401cdc186", alt: "Travel adventure" },
  { id: "1519681393784-d120267933ba", alt: "Mountain night sky" },
  { id: "1554080353-a576cf803bda", alt: "Scenic landscape" },
]

function photoUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=480&h=320&q=70`
}

interface LoginScreenProps {
  email: string
  joinInput: string
  isSendingAuth: boolean
  authMessage: string
  errorMessage: string
  onEmailChange: (value: string) => void
  onJoinInputChange: (value: string) => void
  onSendMagicLink: () => void
}

export function LoginScreen({
  email,
  joinInput,
  isSendingAuth,
  authMessage,
  errorMessage,
  onEmailChange,
  onJoinInputChange,
  onSendMagicLink,
}: LoginScreenProps) {
  return (
    <div className="relative flex h-svh w-full items-center justify-center overflow-hidden">
      {/* Photo mosaic background */}
      <div className="absolute inset-0 z-0">
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gridAutoRows: "1fr",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "3px",
          }}
        >
          {PHOTOS.map((photo) => (
            <div key={photo.id} className="overflow-hidden">
              <img
                src={photoUrl(photo.id)}
                alt={photo.alt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Dark + desaturate overlay — gives the "faded memories" feel */}
        <div
          className="absolute inset-0"
          style={{
            background: "hsl(var(--background) / 0.88)",
            backdropFilter: "saturate(0.15) brightness(0.5)",
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-3xl border border-border bg-card/70 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Our Calendar
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Make every trip unforgettable.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The shared trip planner built for couples. Plan every flight, hotel, and adventure together — in one beautiful calendar.
          </p>

          <div className="mt-7 space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) onSendMagicLink() }}
              className="h-12 rounded-xl border-border/60 bg-background/60 text-base backdrop-blur"
            />
            <Input
              placeholder="Have an invite code? Enter it here"
              value={joinInput}
              onChange={(e) => onJoinInputChange(e.target.value.toLowerCase())}
              className="h-12 rounded-xl border-border/60 bg-background/60 text-base backdrop-blur"
            />
            <Button
              className="h-12 w-full rounded-xl text-base"
              onClick={onSendMagicLink}
              disabled={isSendingAuth || !email.trim()}
            >
              {isSendingAuth ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send me a magic link
                </>
              )}
            </Button>
          </div>

          {authMessage && (
            <p className="mt-4 text-sm text-emerald-400">{authMessage}</p>
          )}
          {errorMessage && (
            <p className="mt-4 text-sm text-rose-400">{errorMessage}</p>
          )}

          <p className="mt-6 text-xs text-muted-foreground/50">
            No password needed. We&apos;ll email you a secure sign-in link.
          </p>
        </div>

        {/* Byline */}
        <p className="mt-5 text-center text-xs text-muted-foreground/70">
          built by{" "}
          <a
            href="https://x.com/flowconnor"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            @flowconnor
          </a>
        </p>
      </div>
    </div>
  )
}
