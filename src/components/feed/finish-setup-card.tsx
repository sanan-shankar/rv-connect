"use client";

/* ------------------------------------------------------------------ *
 *  FinishSetupCard — a small, dismissible "finish setting up" nudge on
 *  /feed. Shown only when something from the onboarding wizard is still
 *  missing: no admission number, no about/bio, or a houses submission
 *  parked in localStorage waiting on the pending migration (see
 *  src/components/onboarding/actions.ts). Canopy-outline, not a banner,
 *  and dismissing it persists (localStorage) so it never nags twice in a
 *  session once someone has waved it off.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPendingHouses } from "@/lib/onboarding-local";

const DISMISS_PREFIX = "rv:onboarding:nudgeDismissed:";

export function FinishSetupCard({
  userId,
  admissionNumberMissing,
  aboutMissing,
}: {
  userId: string;
  admissionNumberMissing: boolean;
  aboutMissing: boolean;
}) {
  const [dismissed, setDismissed] = useState(true); // default hidden until checked, avoids a flash
  const [housesPending, setHousesPending] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let wasDismissed = false;
    try {
      wasDismissed = window.localStorage.getItem(DISMISS_PREFIX + userId) === "1";
    } catch {
      // storage disabled — never block the nudge over it
    }
    setDismissed(wasDismissed);
    setHousesPending(hasPendingHouses(userId));
    setChecked(true);
  }, [userId]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_PREFIX + userId, "1");
    } catch {
      // ignore
    }
  }

  const missingCount =
    Number(admissionNumberMissing) + Number(aboutMissing) + Number(housesPending);

  if (!checked || dismissed || missingCount === 0) return null;

  // One primary link to whatever matters most: the onboarding data first
  // (admission number, then houses), a short bio last since that lives in
  // settings, not the wizard (the owner explicitly kept long-form writing
  // out of onboarding itself).
  const href = admissionNumberMissing
    ? "/welcome?step=register"
    : housesPending
      ? "/welcome?step=houses"
      : "/settings";

  const bits = [
    admissionNumberMissing && "your admission number",
    housesPending && "your houses",
    aboutMissing && "a line or two about yourself",
  ].filter(Boolean) as string[];

  return (
    <div className="mb-[var(--space-l)] flex flex-col gap-3 rounded-2xl border border-canopy/35 bg-canopy/[0.06] px-[var(--space-l)] py-[var(--space-m)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-foreground">Finish setting up your profile</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          Still missing {bits.join(", ")}.
          {housesPending && " Your houses are saved already, just waiting to finish syncing."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Link href={href}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-canopy/50 text-canopy hover:bg-canopy/10"
          >
            Finish now
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
