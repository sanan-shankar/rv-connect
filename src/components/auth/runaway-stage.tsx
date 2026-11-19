"use client";

/* ------------------------------------------------------------------ *
 *  The signup form, watched for one visitor.
 *
 *  Wraps SignupForm without changing it. It reads the names and the email
 *  as they are typed (runaway-visitor.ts decides whether they are hers).
 *  Once they are, it turns every submit away and loads the runner: the
 *  Join button that will not be pressed (runaway-join.tsx). The runner is
 *  its own chunk, fetched only when she arms it, seconds before she can
 *  reach the button, so nobody else downloads any of it.
 *
 *  The form is read by field name: firstName, lastName, email and the
 *  hidden accountType. Those are the names registerUser reads, so they are
 *  a contract that already holds.
 *
 *  Retiring the prank: RUNAWAY_ENABLED = false in runaway-visitor.ts.
 * ------------------------------------------------------------------ */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { safeGet, safeRemove, safeSet } from "@/lib/local-storage";
import { RUNAWAY_ENABLED, RUNAWAY_MEMORY_KEY, isRunawayVisitor } from "@/lib/runaway-visitor";

const RunawayRunner = dynamic(() => import("./runaway-join").then((m) => m.RunawayRunner), { ssr: false });

/** Whether the button has run from this browser before (the lab shows it). */
export const runawayRemembered = () => safeGet(RUNAWAY_MEMORY_KEY) === "1";
/** Let this browser through again (the lab). */
export const forgetRunaway = () => safeRemove(RUNAWAY_MEMORY_KEY);

export function RunawayStage({
  hoopoe,
  force = false,
  debug = false,
  practice = false,
  children,
}: {
  /** The page's hoopoe: it watches the chase and giggles at every miss. */
  hoopoe?: HoopoeApi;
  /** Run for whoever is here, not only for her (the lab). */
  force?: boolean;
  /** Draw what it is thinking (the lab). */
  debug?: boolean;
  /** Never send a signup, whatever is typed, and never mark the browser (the lab). */
  practice?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [named, setNamed] = useState(false);
  const [remembered, setRemembered] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage has no server-side answer, so it can only be read after mount.
    setRemembered(RUNAWAY_ENABLED && !practice && runawayRemembered());
  }, [practice]);
  const armed = force || (RUNAWAY_ENABLED && (named || remembered));

  // Asked again whenever anything in the form changes. A name typed on the
  // way to another ("Jyothi" on the way to "Jyothirmayi") arms it only until
  // the next keystroke: nothing is remembered until it has actually run.
  const check = () => {
    const form = ref.current?.querySelector("form");
    if (!form) return;
    const field = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    setNamed(
      RUNAWAY_ENABLED &&
        isRunawayVisitor({
          firstName: field("firstName"),
          lastName: field("lastName"),
          email: field("email"),
          teacher: field("accountType") === "teacher",
        })
    );
  };

  return (
    <div
      ref={ref}
      className="contents"
      onInput={check}
      // The Teacher answer is a click, and its hidden field changes a render later.
      onClick={() => requestAnimationFrame(check)}
      // Capture runs before the form's own submit handler, which then never
      // hears it. Enter, a phone's Go key and the button all end here.
      onSubmitCapture={(e) => {
        if (!armed && !practice) return;
        e.preventDefault();
        e.stopPropagation();
        if (!armed) toast("The lab never sends a signup.");
      }}
    >
      {children}
      {armed && (
        <RunawayRunner
          stage={ref}
          hoopoe={hoopoe}
          debug={debug}
          onFirstRun={practice ? undefined : () => safeSet(RUNAWAY_MEMORY_KEY, "1")}
        />
      )}
    </div>
  );
}
