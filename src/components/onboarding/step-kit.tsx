"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { shortPlaceLabel } from "@/lib/normalize";
import { batchLine, metaLine } from "@/lib/utils";
import type { OnboardingUser } from "./types";

/* ------------------------------------------------------------------ *
 *  The three parts every step of the setup wizard is built from, so
 *  the five read as one sheet rather than five layouts.
 *
 *  Left-aligned throughout. The wizard used to centre its headings
 *  over left-aligned form fields, so the title, the line under it and
 *  the first label each started at a different x.
 * ------------------------------------------------------------------ */

/** The first word of the name, for the two steps that greet by it. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/** The step's title and, optionally, one plain line under it. */
export function StepHead({
  title,
  line,
  as: Heading = "h2",
}: {
  title: React.ReactNode;
  line?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div>
      <Heading className="font-heading text-[1.5rem] leading-tight tracking-[-0.025em] text-balance text-foreground">
        {title}
      </Heading>
      {line && (
        <p className="mt-[var(--space-xs)] text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {line}
        </p>
      )}
    </div>
  );
}

/** One row at the foot of the step: the way past it on the left, the step's
 *  one canopy action filling the rest. Full width rather than two pills at
 *  the right edge because on a phone the wide button is where the thumb is,
 *  and it was sharing a row with Back and Skip at 390px. */
export function StepActions({
  secondary,
  children,
}: {
  secondary?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-[var(--space-l)] flex items-center gap-2 [&>*:last-child]:flex-1">
      {secondary}
      {children}
    </div>
  );
}

/** The canopy button that moves the wizard on: its label, then an arrow that
 *  gives way to a spinner while the step is saving. */
export function StepNext({
  busy = false,
  disabled,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & { busy?: boolean }) {
  return (
    <Button variant="primary" size="lg" disabled={busy || disabled} {...props}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
      {!busy && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}

/**
 * The member as the Directory will show them: bird, name, and the batch, work
 * and city line the directory card reads (profile-card.tsx), filled in from
 * whatever the step has so far. The register step hands it the fields as they
 * are typed, so the line grows while the member fills the form in, and the
 * photo step hands it the photo the moment it is uploaded.
 *
 * The one recessed well in the sheet (colour protocol rule 3). It is a picture
 * of a card, not a card, so it takes the well rather than a second border.
 */
export function YouCard({
  user,
  avatar = "sm",
}: {
  user: Pick<
    OnboardingUser,
    "id" | "name" | "photoUrl" | "birdOverride" | "accountType" | "batchType" | "batchYear" | "places" | "jobTitle"
  >;
  avatar?: "sm" | "md" | "lg";
}) {
  const place = user.places[0];
  const meta = metaLine(
    batchLine(user),
    user.jobTitle?.trim(),
    place ? place.city || shortPlaceLabel(place.label) : null
  );

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-mist px-3 py-2.5">
      <BirdAvatar
        user={{ id: user.id, name: user.name, photoUrl: user.photoUrl, birdOverride: user.birdOverride }}
        size={avatar}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
          {user.name}
        </p>
        {meta && (
          <p className="mt-0.5 truncate text-[12.5px] leading-tight text-muted-foreground">{meta}</p>
        )}
      </div>
    </div>
  );
}
