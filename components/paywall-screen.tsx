"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { ArrowRight, Loader2, MapPin } from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PaywallScreenProps {
  userId: string
  paymentLink: string | null
  onAccessGranted: () => void
}

export function PaywallScreen({ userId, paymentLink, onAccessGranted }: PaywallScreenProps) {
  const grantByCode = useMutation(api.access.grantByCode)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [code, setCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [codeError, setCodeError] = useState("")

  const stripeUrl = paymentLink
    ? `${paymentLink.includes("?") ? `${paymentLink}&` : `${paymentLink}?`}client_reference_id=${userId}`
    : null

  async function handleRedeem() {
    if (!code.trim()) return

    setIsRedeeming(true)
    setCodeError("")

    try {
      await grantByCode({ code: code.trim() })
      onAccessGranted()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid code."
      setCodeError(message.replace(/^.*ConvexError:\s*/i, "") || "Invalid code.")
    } finally {
      setIsRedeeming(false)
    }
  }

  return (
    <main id="main-content" className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.3), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <MapPin className="h-7 w-7 text-foreground" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Travel Calendar
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Plan trips together.
          </h1>
          <p className="text-base text-muted-foreground">
            One payment. Every trip forever — including agent access.
          </p>
        </div>

        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold tracking-tight text-foreground">$9.99</span>
          <span className="text-base text-muted-foreground">once</span>
        </div>

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
              <Label htmlFor="access-code" className="sr-only">
                Access code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="access-code"
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setCodeError("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRedeem()
                  }}
                  autoFocus
                  aria-invalid={Boolean(codeError)}
                  aria-describedby={codeError ? "access-code-error" : undefined}
                  className="h-11 flex-1 rounded-xl border-border bg-secondary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-xl px-4"
                  onClick={() => void handleRedeem()}
                  disabled={isRedeeming || !code.trim()}
                >
                  {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Redeem"}
                </Button>
              </div>
              {codeError ? (
                <p id="access-code-error" className="text-xs text-destructive" role="alert">
                  {codeError}
                </p>
              ) : null}
            </div>
          )}
        </div>

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
    </main>
  )
}
