import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Travel Calendar.",
}

export default function PrivacyPage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0 mara-atmosphere opacity-80" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mara-surface rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl backdrop-blur md:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Travel Calendar
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated April 19, 2026.
          </p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">What we collect</h2>
              <p className="mt-2">
                Travel Calendar collects the information needed to run the app, such as your
                account details, trip plans, notes, invite codes, and packing lists you choose to
                create or share.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">How we use it</h2>
              <p className="mt-2">
                We use your information to authenticate you, sync shared trips, store your content,
                improve product reliability, and communicate with you about your account or support
                requests.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Sharing</h2>
              <p className="mt-2">
                Your trip content is shared only with people you explicitly invite or collaborate
                with inside the app. We may also rely on service providers that help us operate the
                product, such as hosting, authentication, analytics, and payments.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Retention and security</h2>
              <p className="mt-2">
                We keep information for as long as needed to provide the service, comply with legal
                obligations, and resolve disputes. We use reasonable administrative and technical
                safeguards, but no system can be guaranteed perfectly secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Your choices</h2>
              <p className="mt-2">
                You can request access, correction, or deletion of your account data by contacting
                us. You can also stop using the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="mt-2">
                Questions about this policy can be sent to{" "}
                <a
                  className="text-primary underline decoration-primary/40 underline-offset-4"
                  href="mailto:connor.steven.barrett@gmail.com"
                >
                  connor.steven.barrett@gmail.com
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10">
            <Link className="text-sm font-medium text-primary underline underline-offset-4" href="/">
              Return to Travel Calendar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
