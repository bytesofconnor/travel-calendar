import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Travel Calendar.",
}

export default function TermsPage() {
  return (
    <main id="main-content" className="relative min-h-dvh overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0 mara-atmosphere opacity-80" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mara-surface rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl backdrop-blur md:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Travel Calendar
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated April 19, 2026.
          </p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">Using the service</h2>
              <p className="mt-2">
                By using Travel Calendar, you agree to use the product lawfully and only for
                personal or internal trip-planning purposes. You are responsible for the accuracy
                of the information you add and share.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
              <p className="mt-2">
                You are responsible for maintaining access to your account and for activity that
                occurs under it. Do not misuse the service, attempt unauthorized access, or disrupt
                other users&apos; ability to use the product.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Content</h2>
              <p className="mt-2">
                You keep ownership of the content you submit. You give us permission to host,
                process, and display that content only as needed to operate and improve Travel
                Calendar.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Availability</h2>
              <p className="mt-2">
                We may update, change, or suspend parts of the service from time to time. We do not
                guarantee uninterrupted availability, and the service is provided on an &quot;as
                is&quot; basis to the extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Termination</h2>
              <p className="mt-2">
                We may suspend or terminate access if these terms are violated or if use of the
                service creates risk for us or other users. You may stop using the service at any
                time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="mt-2">
                Questions about these terms can be sent to{" "}
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
