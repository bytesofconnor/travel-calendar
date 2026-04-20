"use client"

import { useState } from "react"
import { ChevronRight, KeyRound, Loader2, Mail, ShieldCheck, Sparkles, Users } from "lucide-react"
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
  const [showInviteCode, setShowInviteCode] = useState(Boolean(joinInput))

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
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
            background:
              "linear-gradient(180deg, hsl(var(--background) / 0.62), hsl(var(--background) / 0.9)), radial-gradient(circle at 50% 35%, rgba(112, 167, 202, 0.1), transparent 30%)",
            backdropFilter: "saturate(0.34) brightness(0.58)",
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-5xl">
        <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,32,39,0.88),rgba(14,21,28,0.95))] shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="relative border-b border-white/8 p-8 sm:p-10 lg:border-b-0 lg:border-r lg:border-white/8 lg:p-12">
              <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-sky-300/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-6rem] left-[-3rem] h-44 w-44 rounded-full bg-cyan-400/8 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-200/85">
                  <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                  Travel Calendar
                </div>

                <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-[4.25rem] sm:leading-[0.92]">
                  Make every trip feel shared before it even starts.
                </h1>

                <p className="mt-5 max-w-lg text-base leading-8 text-slate-300/88 sm:text-lg">
                  Build one living itinerary for flights, stays, notes, packing, and all the little
                  details couples and travel partners usually lose across texts.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                    <Users className="h-4 w-4 text-sky-200" />
                    <p className="mt-3 text-sm font-medium text-foreground">Share everything</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      One plan for both travelers, not five half-finished threads.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                    <Sparkles className="h-4 w-4 text-sky-200" />
                    <p className="mt-3 text-sm font-medium text-foreground">Mara helps fill gaps</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Get suggestions for routes, meals, logistics, and packing.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                    <ShieldCheck className="h-4 w-4 text-sky-200" />
                    <p className="mt-3 text-sm font-medium text-foreground">Simple sign-in</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Google first, email fallback, no passwords to remember.
                    </p>
                  </div>
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-sm text-slate-300/72">
                  <span className="rounded-full border border-white/10 px-2 py-1">travelcalendar.space</span>
                  <span>Built for couples and travel partners</span>
                </div>
              </div>
            </section>

            <section className="relative p-8 sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:hidden" />
              <div className="mx-auto max-w-md">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/78">
                  Sign in
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  Start planning in under a minute.
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use Google for the smoothest path, or continue with email if you&apos;d rather keep it simple.
                </p>

                <div className="mt-7 space-y-5">
                  <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Best for most people</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          One tap in, then create or join a trip immediately.
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-200">
                        Recommended
                      </div>
                    </div>

                    <Button
                      className="mt-4 h-14 w-full rounded-2xl bg-white text-base font-medium text-slate-950 shadow-lg transition-transform hover:translate-y-[-1px] hover:bg-white/95"
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
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                      email fallback
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="rounded-[1.6rem] border border-white/8 bg-black/16 p-4">
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Email address
                      </label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) onSendEmailCode() }}
                        className="h-12 rounded-xl border-white/10 bg-black/30 text-base backdrop-blur placeholder:text-muted-foreground/75"
                      />
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/8 bg-black/18 p-3">
                      <button
                        type="button"
                        onClick={() => setShowInviteCode((current) => !current)}
                        className="w-full text-left text-sm font-medium text-foreground transition-colors hover:text-white"
                      >
                        {showInviteCode ? "Hide invite code" : "Have an invite code?"}
                      </button>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground/75">
                        Optional. Use this if your partner already shared a trip with you.
                      </p>
                      {showInviteCode && (
                        <div className="mt-3">
                          <label htmlFor="invite-code" className="block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Invite code
                          </label>
                          <Input
                            id="invite-code"
                            placeholder="Enter your code"
                            value={joinInput}
                            onChange={(e) => onJoinInputChange(e.target.value.toLowerCase())}
                            className="mt-2 h-12 rounded-xl border-white/10 bg-black/30 text-base backdrop-blur placeholder:text-muted-foreground/75"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3">
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
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/4 text-base backdrop-blur"
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
                            Email me a sign-in link
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5 text-xs text-muted-foreground/72">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-200" />
                      <p>We only use your email to sign you in and sync your shared trip access.</p>
                    </div>
                  </div>

                  {hasPendingCode && (
                    <div className="space-y-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4 backdrop-blur">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200/90">
                        Check your inbox
                      </p>
                      <p className="text-sm leading-6 text-emerald-100/70">
                        We sent a 6-digit code to your email. Paste it here to finish signing in.
                      </p>
                      <Input
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => { if (e.key === "Enter" && verificationCode.trim()) onVerifyEmailCode() }}
                        className="h-12 rounded-xl border-white/10 bg-black/30 text-base tracking-[0.24em] backdrop-blur placeholder:text-muted-foreground/75"
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

                  {authMessage && (
                    <p className="rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300">
                      {authMessage}
                    </p>
                  )}
                  {errorMessage && (
                    <p className="rounded-xl border border-rose-400/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
                      {errorMessage}
                    </p>
                  )}

                  {onStartDevBypass && (
                    <div className="rounded-2xl border border-dashed border-white/12 bg-white/3 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                        Dev only
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-2 h-12 w-full rounded-xl border border-white/8 bg-transparent text-base"
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
                    </div>
                  )}

                  <p className="text-xs leading-6 text-muted-foreground/62">
                    No password needed. Google is the easiest path, and email code avoids the usual magic-link browser weirdness.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground/70">
          travelcalendar.space
        </p>
      </div>
    </div>
  )
}
