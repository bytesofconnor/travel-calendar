"use client"

import { useState } from "react"
import { ArrowRight, Loader2, MapPin } from "lucide-react"

interface PaywallScreenProps {
  userId: string
  paymentLink: string | null
  onAccessGranted: () => void
}

export function PaywallScreen({ userId, paymentLink, onAccessGranted }: PaywallScreenProps) {
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [code, setCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [codeError, setCodeError] = useState("")

  const stripeUrl = paymentLink
    ? `${paymentLink}?client_reference_id=${userId}&prefilled_promo_code=`
    : null

  async function handleRedeem() {
    if (!code.trim()) return

    setIsRedeeming(true)
    setCodeError("")

    try {
      const res = await fetch("/api/access/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      if (res.ok) {
        onAccessGranted()
      } else {
        const data = await res.json() as { error?: string }
        setCodeError(data.error ?? "Invalid code.")
      }
    } catch {
      setCodeError("Something went wrong. Try again.")
    } finally {
      setIsRedeeming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.3), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <MapPin className="h-7 w-7 text-foreground" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Travel Calendar
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Plan trips together.
          </h1>
          <p className="text-base text-muted-foreground">
            One payment. Every trip, forever.
          </p>
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold tracking-tight text-foreground">$9.99</span>
          <span className="text-base text-muted-foreground">once</span>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          {stripeUrl ? (
            <a
              href={stripeUrl}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-medium text-background transition-opacity hover:opacity-90"
            >
              Get lifetime access
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-secondary text-sm text-muted-foreground">
              Payment not yet configured
            </div>
          )}

          {/* Bypass code */}
          {!showCodeInput ? (
            <button
              type="button"
              onClick={() => setShowCodeInput(true)}
              className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Have a code?
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setCodeError("")
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleRedeem() }}
                  autoFocus
                  className="h-11 flex-1 rounded-xl border-0 bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => void handleRedeem()}
                  disabled={isRedeeming || !code.trim()}
                  className="flex h-11 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
                </button>
              </div>
              {codeError && (
                <p className="text-xs text-destructive">{codeError}</p>
              )}
            </div>
          )}
        </div>

        {/* Just paid? */}
        {stripeUrl && (
          <p className="text-xs text-muted-foreground/60">
            Just paid?{" "}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
            >
              Refresh to continue.
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
