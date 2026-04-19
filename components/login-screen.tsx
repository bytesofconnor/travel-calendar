"use client"

import { KeyRound, Loader2, Mail } from "lucide-react"
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
  verificationCode: string
  joinInput: string
  isSendingAuth: boolean
  isSendingEmailCode: boolean
  isVerifyingCode: boolean
  isSigningInWithGoogle: boolean
  isStartingDevBypass?: boolean
  hasPendingCode: boolean
  authMessage: string
  errorMessage: string
  onEmailChange: (value: string) => void
  onVerificationCodeChange: (value: string) => void
  onJoinInputChange: (value: string) => void
  onSendEmailCode: () => void
  onSendMagicLink: () => void
  onVerifyEmailCode: () => void
  onContinueWithGoogle: () => void
  onStartDevBypass?: () => void
}

export function LoginScreen({
  email,
  verificationCode,
  joinInput,
  isSendingAuth,
  isSendingEmailCode,
  isVerifyingCode,
  isSigningInWithGoogle,
  isStartingDevBypass = false,
  hasPendingCode,
  authMessage,
  errorMessage,
  onEmailChange,
  onVerificationCodeChange,
  onJoinInputChange,
  onSendEmailCode,
  onSendMagicLink,
  onVerifyEmailCode,
  onContinueWithGoogle,
  onStartDevBypass,
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
            HeyMara
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Make every trip unforgettable.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The shared trip planner for couples and travel partners. Plan every flight, stay, and adventure together in one beautiful place.
          </p>

          <div className="mt-7 space-y-3">
            <Button
              variant="secondary"
              className="h-12 w-full rounded-xl border border-border/60 bg-background/60 text-base backdrop-blur"
              onClick={onContinueWithGoogle}
              disabled={isSigningInWithGoogle}
            >
              {isSigningInWithGoogle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 3.1-4.2 3.1-7.3Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3.1-2.5c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.6-4.1H3.2v2.6A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.2A10 10 0 0 0 2 12c0 1.6.4 3 1.2 4.4l3.2-2.6Z" />
                    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3.2 14.7 2 12 2A10 10 0 0 0 3.2 7.6l3.2 2.6C7.2 7.8 9.4 6.1 12 6.1Z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                or use email
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) onSendEmailCode() }}
              className="h-12 rounded-xl border-border/60 bg-background/60 text-base backdrop-blur"
            />
            <Input
              placeholder="Have an invite code? Enter it here"
              value={joinInput}
              onChange={(e) => onJoinInputChange(e.target.value.toLowerCase())}
              className="h-12 rounded-xl border-border/60 bg-background/60 text-base backdrop-blur"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-12 w-full rounded-xl text-base"
                onClick={onSendEmailCode}
                disabled={isSendingEmailCode || !email.trim()}
              >
                {isSendingEmailCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Email me a code
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                className="h-12 w-full rounded-xl border border-border/60 bg-background/60 text-base backdrop-blur"
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
                    Magic link instead
                  </>
                )}
              </Button>
            </div>
            {hasPendingCode && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-3 backdrop-blur">
                <Input
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter" && verificationCode.trim()) onVerifyEmailCode() }}
                  className="h-12 rounded-xl border-border/60 bg-background/70 text-base tracking-[0.24em]"
                />
                <Button
                  className="h-12 w-full rounded-xl text-base"
                  onClick={onVerifyEmailCode}
                  disabled={isVerifyingCode || verificationCode.trim().length < 6}
                >
                  {isVerifyingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying code…
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Verify code
                    </>
                  )}
                </Button>
              </div>
            )}
            {onStartDevBypass && (
              <Button
                variant="secondary"
                className="h-12 w-full rounded-xl text-base"
                onClick={onStartDevBypass}
                disabled={isStartingDevBypass}
              >
                {isStartingDevBypass ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting dev session…
                  </>
                ) : (
                  "Continue as dev user"
                )}
              </Button>
            )}
          </div>

          {authMessage && (
            <p className="mt-4 text-sm text-emerald-400">{authMessage}</p>
          )}
          {errorMessage && (
            <p className="mt-4 text-sm text-rose-400">{errorMessage}</p>
          )}

          <p className="mt-6 text-xs text-muted-foreground/50">
            No password needed. Google is the easiest path, and email code avoids the usual magic-link browser weirdness.
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
