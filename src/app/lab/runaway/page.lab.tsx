"use client";

/* ------------------------------------------------------------------ *
 *  The Join button that runs, to try for yourself.
 *
 *  The real signup page past its trivia question: the same photograph,
 *  bird, heading and form, at the same size. Two differences. The button
 *  runs for whoever is here, unless switched to "her only", where it waits
 *  for her name exactly as /signup does (runaway-visitor.ts). And the form
 *  never sends a signup, so a test name typed here can never become a
 *  real account on the live database.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import Link from "@/components/common/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthHeading, AuthPhotoPanel } from "@/components/auth/auth-panel";
import { SignupForm } from "@/components/auth/signup-form";
import { RunawayStage, forgetRunaway, runawayRemembered } from "@/components/auth/runaway-stage";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { PERCH_LIFT_PX } from "@/components/mascot/mascot-flight";

export default function RunawayLab() {
  // The ref for the bird, the verbs for the form, split the way signup-client does.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const [thinking, setThinking] = useState(false);
  const [anyone, setAnyone] = useState(true);
  // Typing her name on the real signup page marks that browser as hers, so
  // Join runs from it there for good. Only worth a control when it has happened.
  const [marked, setMarked] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage has no server-side answer, so it can only be read after mount.
    setMarked(runawayRemembered());
  }, []);

  return (
    <div className="min-h-screen lg:pl-[58.3333%]">
      <AuthPhotoPanel />
      <div data-runaway-column className="relative flex min-h-screen flex-col bg-background px-[var(--space-l)] py-[var(--space-l)]">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <Link
            href="/lab"
            className="mr-auto inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Lab
          </Link>
          <Button variant="ghost" size="sm" aria-pressed={!anyone} onClick={() => setAnyone((a) => !a)}>
            {anyone ? "Runs from anyone" : "Runs from her only"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setThinking((t) => !t)}>
            {thinking ? "Hide what it thinks" : "Show what it thinks"}
          </Button>
        </div>
        {marked && (
          <p className="mt-2 flex flex-wrap items-center justify-end gap-x-1 text-[13px] text-muted-foreground">
            This browser typed her name on the real signup page, so Join runs from it there too.
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                forgetRunaway();
                setMarked(false);
              }}
            >
              Let it through again
            </Button>
          </p>
        )}

        <div className="mt-[8vh] mb-auto w-full max-w-[400px] self-center text-center">
          <div className="mx-auto mb-1 grid h-[112px] place-items-center">
            <div style={{ transform: `translateY(-${PERCH_LIFT_PX}px)` }}>
              <Hoopoe ref={hoopoeRef} size={96} />
            </div>
          </div>
          <AuthHeading title="A bit about yourself" />
          {/* A fresh form when the mode flips, so no name carries over. */}
          <RunawayStage key={anyone ? "anyone" : "her"} hoopoe={hoopoe} force={anyone} debug={thinking} practice>
            <SignupForm hoopoe={hoopoe} turnstileSiteKey={null} onSuccess={() => {}} />
          </RunawayStage>
          <p className="mt-6 text-[13px] text-muted-foreground">
            {anyone
              ? "On the real page this runs only for the principal. Here it runs for you."
              : "Type her name, in any spelling, and Join comes alive."}
          </p>
        </div>
      </div>
    </div>
  );
}
