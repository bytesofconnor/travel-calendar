"use client"

import { useEffect, useState } from "react"
import { ChevronDown, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SpectrumHairline } from "@/components/trip-cover"

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 3.1-4.2 3.1-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3.1-2.5c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.6-4.1H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.2A10 10 0 0 0 2 12c0 1.6.4 3 1.2 4.4l3.2-2.6Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3.2 14.7 2 12 2A10 10 0 0 0 3.2 7.6l3.2 2.6C7.2 7.8 9.4 6.1 12 6.1Z" />
    </svg>
  )
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
  emailAuthEnabled?: boolean
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
  emailAuthEnabled = true,
}: LoginScreenProps) {
  const [showInviteCode, setShowInviteCode] = useState(Boolean(joinInput))
  const [showEmailAuth, setShowEmailAuth] = useState(Boolean(joinInput) && emailAuthEnabled)

  useEffect(() => {
    if (hasPendingCode && emailAuthEnabled) {
      setShowEmailAuth(true)
    }
  }, [hasPendingCode, emailAuthEnabled])

  return (
    <main id="main-content" className="together-story create-join flex min-h-dvh flex-col overflow-y-auto overscroll-contain">
      <div className="create-join__mast">
        <div className="create-join__mast-bar">
          <span className="create-join__brand">Travel Calendar</span>
        </div>
        <div className="create-join__mast-copy">
          <p className="create-join__eyebrow">
            <span className="create-join__eyebrow-dot" aria-hidden="true" />
            Together
          </p>
          <h1 className="create-join__title">Plan the trip together</h1>
          <p className="create-join__sub">
            One shared story for flights, stays, and the days between — always in sync with your
            partner.
          </p>
        </div>
        <SpectrumHairline />
      </div>

      <div className="create-join__body">
        <button
          type="button"
          className="create-join__submit"
          onClick={onContinueWithGoogle}
          disabled={isSigningInWithGoogle}
        >
          {isSigningInWithGoogle ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Redirecting…
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2.5">
                <GoogleIcon />
                Continue with Google
              </span>
              <span className="create-join__submit-arrow" aria-hidden="true">
                →
              </span>
            </>
          )}
        </button>

        {emailAuthEnabled && !showEmailAuth ? (
          <button
            type="button"
            onClick={() => setShowEmailAuth(true)}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-muted-foreground hover:text-foreground"
          >
            Continue with email
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        {emailAuthEnabled && showEmailAuth ? (
          <div className="mt-6 space-y-3.5">
            <label className="block space-y-1.5">
              <span className="create-join__label">Email</span>
              <Input
                id="login-email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim()) onSendEmailCode()
                }}
                className="create-join__field"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowInviteCode((current) => !current)}
              className="text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground"
            >
              {showInviteCode ? "Hide invite code" : "Have an invite code?"}
            </button>

            {showInviteCode ? (
              <label className="block space-y-1.5">
                <span className="create-join__label">Invite code</span>
                <Input
                  id="invite-code"
                  placeholder="Paste code"
                  value={joinInput}
                  onChange={(e) => onJoinInputChange(e.target.value.toLowerCase())}
                  className="create-join__field create-join__field--code"
                />
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-11 rounded-lg text-sm font-semibold"
                onClick={onSendEmailCode}
                disabled={isSendingEmailCode || !email.trim()}
              >
                {isSendingEmailCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
                Code
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-lg text-sm font-semibold"
                onClick={onSendMagicLink}
                disabled={isSendingAuth || !email.trim()}
              >
                {isSendingAuth ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
                Link
              </Button>
            </div>

            <p className="flex items-start gap-2 text-[0.75rem] leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Email is only used to sign you in.
            </p>
          </div>
        ) : null}

        {emailAuthEnabled && hasPendingCode ? (
          <div className="mt-5 space-y-2.5">
            <p className="text-sm font-semibold">Check your inbox</p>
            <label className="block space-y-1.5">
              <span className="create-join__label">Verification code</span>
              <Input
                inputMode="numeric"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && verificationCode.trim()) onVerifyEmailCode()
                }}
                className="create-join__field tracking-[0.28em]"
                autoComplete="one-time-code"
              />
            </label>
            <button
              type="button"
              className="create-join__submit"
              onClick={onVerifyEmailCode}
              disabled={isVerifyingCode || verificationCode.trim().length < 6}
            >
              {isVerifyingCode ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                <>
                  <span>Verify</span>
                  <span className="create-join__submit-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </div>
        ) : null}

        {authMessage ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {authMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 text-sm font-medium text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-8 text-[0.8125rem] leading-5 text-muted-foreground">
          After you sign in, you create or join one trip. That trip is home.
        </p>

        {onStartDevBypass ? (
          <button
            type="button"
            onClick={onStartDevBypass}
            disabled={isStartingDevBypass}
            className="mt-auto pt-8 text-center text-[0.75rem] text-muted-foreground disabled:opacity-50"
          >
            {isStartingDevBypass ? "Starting dev session…" : "Dev sign-in"}
          </button>
        ) : (
          <div className="mt-auto" aria-hidden="true" />
        )}
      </div>
    </main>
  )
}
