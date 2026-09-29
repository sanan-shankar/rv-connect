import type { Metadata } from "next";
import Link from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/peaks-mark";

export const metadata: Metadata = {
  title: "You're invited",
};

/* ------------------------------------------------------------------ *
 *  /catchups/join with no token at all.
 *
 *  Without this file the two-segment path fell through to the (main)
 *  route group's /catchups/[catchupId] with catchupId="join" (audit
 *  C-204), so somebody who lost the last part of a forwarded link got a
 *  generic not-found if they were signed in and a bounce to /login if
 *  they were not -- from a path proxy.ts deliberately lists as PUBLIC,
 *  precisely so a stranger can open an invitation.
 *
 *  It says exactly what the [token] page says about a token it does not
 *  recognise, because it is the same situation: the link did not
 *  survive being passed along.
 * ------------------------------------------------------------------ */
export default function JoinCatchupWithoutTokenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-[var(--space-l)] py-[var(--space-xl)]">
      <Link
        href="/"
        className="mb-[var(--space-l)] inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Wordmark />
      </Link>
      <div className="card-elevated w-full max-w-[420px] rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        <h1 className="font-heading text-[26px] leading-tight tracking-[-0.02em] text-foreground">
          This link is incomplete
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          An invitation carries a code at the end of it, and this one arrived
          without. Ask whoever sent it for the whole link.
        </p>
        <Link href="/" className="mt-6 inline-flex">
          <Button variant="outline">Go to Rishi Valley</Button>
        </Link>
      </div>
    </div>
  );
}
