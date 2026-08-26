"use client";

import { m } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { SPRINGS } from "@/components/common/motion";
import { FIELD_SHELL, FloatField } from "@/components/common/float-field";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import type { FlightTarget } from "@/components/mascot/mascot-flight";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The auth page's opening frame, drawn on the LANDING during the exit.
 *
 *  The landing owns the 0.9s photo slide; the auth page does not exist
 *  until the push at the end of it, so the real column used to arrive
 *  after the cream had already finished coming in — the owner's "mid
 *  flight the right side content comes in". This is that column, drawn
 *  a navigation early, parked behind the photo and uncovered by the
 *  slide, so the cream arrives with the content already on it.
 *
 *  It is a stand-in, not a page: aria-hidden, no pointer events, nothing
 *  live. The one thing that must be true of it is that it is identical
 *  to what the real page renders at mount, because the push swaps one
 *  for the other with no crossfade and no entrance. Two things keep it
 *  honest: the fields and the button ARE the real components (a
 *  FloatField with nothing in it renders what /login renders at rest),
 *  and `auth-first-frame.test.mjs` fails if any copy or measured class
 *  drifts from login-client.tsx / signup-client.tsx / trivia-gate.tsx.
 *
 *  The destination skips its own entrance whenever AUTH_PREVIEW_FLAG
 *  names it (useFlightArrival reads it). If this is ever deleted, that
 *  goes with it.
 * ------------------------------------------------------------------ */

export function AuthFirstFrame({ target }: { target: FlightTarget }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex h-full flex-col px-[var(--space-l)] py-[var(--space-l)]"
    >
      {/* Static on the real page too: only the column below slides. */}
      <span className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </span>

      <m.div
        className="my-auto w-full max-w-[400px] self-center text-center"
        initial={{ opacity: 0, x: 48 }}
        animate={{ opacity: 1, x: 0 }}
        transition={SPRINGS.gentle}
      >
        {target === "signup" ? <SignupBody /> : <LoginBody />}
      </m.div>
    </div>
  );
}

/** /signup at mount: the gate before its question has come back. */
function SignupBody() {
  return (
    <>
      {/* The perch, empty: the bird is still in the air, and on the real page
          this box is transparent until the flyer hands off. Only its height
          matters here, and it is the one thing holding the heading in place
          across the swap. */}
      <div className="mx-auto mb-1 grid h-[112px] place-items-center" />

      <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
        First, a quick check
      </h1>

      <div className="mt-4 mb-3">
        <div className="py-1">
          <p className="min-h-[1.75rem] text-center font-heading text-lg text-balance text-foreground">
            ...
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {/* Not a FloatField: the gate's answer box is a plain input on the
            shared shell, because the question above it is its label. */}
        <input
          readOnly
          tabIndex={-1}
          placeholder="Your answer..."
          className={cn(
            FIELD_SHELL,
            "px-4 text-center text-base text-foreground outline-none",
            "placeholder:text-muted-foreground"
          )}
        />
        {/* Disabled, because the real one is: the gate cannot be answered
            until its question has arrived, so /signup mounts with a muted
            Check too. /login's below is NOT disabled, for the same reason
            in reverse — a colour that only matches for one of the two is
            a pop at the swap. */}
        <Button type="button" variant="primary" size="lg" className="w-full" disabled>
          Check
        </Button>
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account? <span className="text-leaf underline">Sign in</span>
      </p>
    </>
  );
}

/** /login at mount: both fields empty, nothing focused, no error. */
function LoginBody() {
  return (
    <>
      {/* 128px here, 112px on /signup: the two pages perch at different
          heights and always have. */}
      <div className="mx-auto mb-1 grid h-[128px] place-items-center" />

      <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
        Welcome back
      </h1>

      <div className="relative mt-5 space-y-3 text-left">
        {/* The real fields, uncontrolled and untouchable. An empty FloatField
            at rest is exactly what /login shows at mount, so there is no
            second copy of a field to keep in step — only the rows around it. */}
        <div>
          <FloatField id="frame-email" type="email" label="Email" readOnly tabIndex={-1} />
        </div>
        <div>
          <PasswordField id="frame-password" label="Password" focusHint={null} />
          <div className="mt-1.5 text-right leading-none">
            <span className="text-[12.5px] font-medium text-muted-foreground">Forgot it?</span>
          </div>
        </div>
        <div className="pt-1">
          {/* Live-looking on purpose (see the note on Check above): /login's
              button is only disabled while a sign-in is in flight, so at
              mount it is full Canopy. The whole frame is pointer-events-none,
              so nothing here can be pressed. */}
          <Button type="button" variant="primary" size="lg" className="w-full">
            Sign in
          </Button>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New here? <span className="font-medium text-leaf">Join</span>
      </p>
    </>
  );
}
