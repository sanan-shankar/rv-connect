"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ *
 *  The error boundary for everything inside the signed-in shell.
 *
 *  Until now there was exactly one error boundary in the app, at the
 *  ROOT (src/app/error.tsx), and Next replaces everything below a
 *  boundary when it catches: so one widget throwing on the feed took
 *  the sidebar, the header, the notification bell and the whole
 *  navigation with it, and left a member on a full-screen apology with
 *  no way back except the browser's own back button (audit M05).
 *
 *  A boundary HERE is inside `(main)/layout.tsx`, so the shell around it
 *  survives. The member loses the one page that broke and keeps every
 *  route in the rail, which is the difference between "that page is
 *  having a moment" and "the site is down".
 *
 *  It does not read `error`. A digest tells a member nothing and reads
 *  as broken; the server side is already reported to Sentry by
 *  `onRequestError` (src/instrumentation.ts), which is where a human
 *  finds out. Kept in the signature so it still documents what Next
 *  hands in.
 * ------------------------------------------------------------------ */

export default function MainError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card-elevated mx-auto max-w-lg rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)] text-center">
      <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
        This page did not load
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        Something went wrong on our side, not yours. Everything else is still
        here.
      </p>
      <div className="mt-[var(--space-m)] flex flex-wrap items-center justify-center gap-2.5">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
        <Link href="/feed">
          <Button variant="outline">Go to the feed</Button>
        </Link>
      </div>
    </div>
  );
}
