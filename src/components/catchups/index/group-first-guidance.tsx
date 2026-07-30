"use client";

/* ------------------------------------------------------------------ *
 *  <GroupFirstGuidance> - the shared "a Catch-up lives inside a group"
 *  empty state (spec section 3.1 + 3.2). Used two places: the index
 *  when the viewer is in no groups at all, and the create flow's
 *  no-group short-circuit (which swaps which CTA is primary so the
 *  create-a-group action leads, per spec 3.2). Never a dead end: both
 *  CTAs are always present, just reordered.
 *
 *  One-hoopoe rule: gated on `useSoloHoopoe()` like every other mascot
 *  moment. When another bird is already on screen, the hoopoe simply
 *  drops out of the flex column -- the shared `gap-5` closes the space
 *  on its own, so the heading just leads the card instead.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";

export function GroupFirstGuidance({
  primaryHref = "/catchups/new",
  primaryLabel = "Start a Catch-up",
  primaryIcon: PrimaryIcon = Plus,
  secondaryHref = "/directory",
  secondaryLabel = "Find people",
  secondaryIcon: SecondaryIcon = Users,
}: {
  primaryHref?: string;
  primaryLabel?: string;
  primaryIcon?: typeof Users;
  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryIcon?: typeof Users;
}) {
  const solo = useSoloHoopoe();

  return (
    <div className="card-elevated relative mx-auto flex max-w-2xl flex-col items-center gap-[var(--space-m)] overflow-hidden rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] text-center sm:p-[var(--space-l)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--color-leaf) 10%, transparent), transparent 62%)",
        }}
      />

      {solo && (
        <div className="relative">
          <Hoopoe size={96} />
        </div>
      )}

      {/* No sub-copy under this heading: the two buttons below are the
          instruction, so a line telling you to start one would only say what
          they already say. */}
      <h2 className="relative max-w-md font-heading text-xl font-semibold tracking-tight text-foreground">
        You are not in a Catch-up yet
      </h2>

      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <Link href={primaryHref}>
          <Button variant="primary">
            <PrimaryIcon className="h-4 w-4" />
            {primaryLabel}
          </Button>
        </Link>
        <Link href={secondaryHref}>
          <Button variant="outline">
            <SecondaryIcon className="h-4 w-4" />
            {secondaryLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
