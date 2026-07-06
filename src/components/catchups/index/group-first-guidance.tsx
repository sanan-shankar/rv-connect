"use client";

/* ------------------------------------------------------------------ *
 *  <GroupFirstGuidance> — the shared "a Catch-up lives inside a group"
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
  primaryHref = "/groups",
  primaryLabel = "Find a group",
  primaryIcon: PrimaryIcon = Users,
  secondaryHref = "/groups/new",
  secondaryLabel = "Create a group",
  secondaryIcon: SecondaryIcon = Plus,
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
    <div className="card-elevated relative mx-auto flex max-w-2xl flex-col items-center gap-5 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-8 text-center sm:p-10">
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

      <div className="relative max-w-md">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          A Catch-up lives inside a group
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
          Create or join a group first, then start a Catch-up from it.
        </p>
      </div>

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
