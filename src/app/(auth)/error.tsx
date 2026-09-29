"use client";

import Link from "@/components/common/link";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ *
 *  The error boundary for sign-in, sign-up, and the reset and confirm
 *  links.
 *
 *  These pages had no boundary of their own, so anything they threw
 *  went up to the root one (audit M05). That is the worst place for it
 *  to land: somebody who cannot get in is shown a generic apology with
 *  a "Try again" that re-runs the same render, and no route back to the
 *  form they were trying to use. The links out matter more here than
 *  anywhere else in the app, because a person stuck on this screen has
 *  no session and no navigation to fall back on.
 * ------------------------------------------------------------------ */

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        This is us, not you. Try again in a moment, or go back and start over.
      </p>
      <div className="mt-[var(--space-m)] flex flex-wrap items-center justify-center gap-2.5">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
        <Link href="/login">
          <Button variant="outline">Back to sign in</Button>
        </Link>
      </div>
    </div>
  );
}
