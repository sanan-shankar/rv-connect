"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AnimatePresence, m } from "motion/react";
import { Button } from "@/components/ui/button";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { PasswordField } from "@/components/auth/password-field";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";
import { resetPassword, type ResetLinkState } from "@/components/auth/email-actions";
import { callAction } from "@/lib/call-action";
import { nextPathFromLocation } from "@/lib/next-path";
import { MIN_PASSWORD } from "@/lib/password-rule";
import { gazeFor } from "@/components/mascot/use-hoopoe";

/* ------------------------------------------------------------------ *
 *  Choosing the new password.
 *
 *  The hoopoe here is the SIGN-IN bird, on purpose: wings over its eyes
 *  while the password is hidden, peeking when you reveal it, head
 *  tracking what you type either way. This is the second password field
 *  in the product and it behaves exactly like the first one, so the
 *  gesture reads as a habit of the animal rather than a trick on one
 *  page.
 *
 *  On success the person is signed straight in with the password they
 *  just chose. Sending them to a login screen to retype it seconds later
 *  is the small indignity this whole flow exists to remove.
 * ------------------------------------------------------------------ */

/** What a dead link says. Split by REASON rather than collapsed into one
 *  "invalid link", because the three causes need different next steps and the
 *  person reading has no way to tell them apart on their own. */
const DEAD_LINK: Record<string, { title: string; body: string }> = {
  expired: {
    title: "That link has run out",
    body: "Reset links last an hour, which is enough to keep them safe and not always enough to get to your inbox. Ask for a fresh one and it will be there in a minute.",
  },
  used: {
    title: "That link has been used",
    body: "Password links work once, so this one is spent. If the new password is not working, or you did not do this, ask for another.",
  },
  stale: {
    title: "That link is out of date",
    body: "The email address on this account changed after the link was sent, so it no longer applies. Ask for a new one at the current address.",
  },
  unknown: {
    // Short enough to sit on ONE line at 27px in a 360px column. The longer
    // "We do not recognise that link" wrapped with a single word stranded
    // underneath, which is the worst possible shape for the biggest type on
    // a page somebody has arrived at already confused.
    title: "That link looks broken",
    body: "Email apps sometimes cut long links in half. Copy the whole thing from the message, or ask for a new one.",
  },
};


export function ResetPasswordClient({
  token,
  link,
}: {
  token: string;
  link: ResetLinkState;
}) {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const apiRef = useRef<HoopoeApi | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const linkIsGood = link.state === "ok";

  function onHoopoeReady(api: HoopoeApi) {
    apiRef.current = api;
    if (linkIsGood) {
      // Wings up over the hidden field, the same rest pose as /login. No
      // greeting first: somebody who followed a reset link is mid-errand, and
      // the bird's job here is to be discreet rather than to say hello.
      api.coverEyes();
    } else {
      // A dead link is a small disappointment, and the bird carries it so the
      // copy does not have to apologise twice.
      void api.express("sad");
      void api.shake(1);
    }
  }

  /** The wings answer the reveal toggle on either field. */
  function onReveal(revealed: boolean) {
    if (revealed) hoopoe.peek();
    else hoopoe.coverEyes();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (password.length < MIN_PASSWORD) {
      setError(`Pick a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two do not match. Check the second box.");
      // The bird is the second signal that something is off, alongside the
      // sentence. Back to the covered rest pose straight after, so the page
      // does not sit in a worried face while you retype.
      void apiRef.current?.express("worried");
      setTimeout(() => apiRef.current?.coverEyes(), 1200);
      return;
    }

    setBusy(true);
    /* Through callAction, like every other surface that dispatches one (audit
       C-034). A rejected action -- a dropped connection, a deploy skew where
       the action id no longer resolves -- used to reject this await, so
       setBusy(false) never ran and the button sat on "Saving..." until a
       reload. On THIS screen that is the worst version of it: the password may
       genuinely have changed, and nothing on screen says so. */
    const result = await callAction(() => resetPassword({ token, password }));

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      void apiRef.current?.express("worried");
      setTimeout(() => apiRef.current?.coverEyes(), 1400);
      return;
    }

    // The password is changed. Show the payoff and let the bird celebrate
    // BEFORE navigating, so the moment is not cut off by a page load.
    setDone(true);
    void apiRef.current?.celebrate(2);

    // Sign in with what they just chose. `redirect: false` so a failure here
    // (which would be strange, the row was just written) leaves them on a
    // screen that can still send them to /login rather than on an error page.
    const signedIn = await signIn("credentials", {
      email: result.email,
      password,
      redirect: false,
    });

    setTimeout(() => {
      /* Hard navigations on purpose: a session cookie was just minted, and a
         client-side push would carry the pre-sign-in RSC cache into it. */
      if (signedIn?.ok) window.location.href = nextPathFromLocation();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      else window.location.href = "/login";
    }, 1400);
  }

  return (
    <AuthPanel
      back={{ href: "/login", label: "Back to sign in" }}
      hoopoeRef={hoopoeRef}
      onHoopoeReady={onHoopoeReady}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!linkIsGood ? (
          <m.div
            key="dead"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.gentle}
          >
            <AuthHeading title={DEAD_LINK[link.state].title}>
              {DEAD_LINK[link.state].body}
            </AuthHeading>
            {/* One way out, not two. A "Back to sign in" link under this
                button repeated the one already sitting top-left, which is the
                same duplication the owner cut from the profile's contact
                block. The person here needs a new link; signing in is what
                they already could not do. */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              nativeButton={false}
              render={<Link href="/forgot-password" />}
            >
              Send me a new link
            </Button>
          </m.div>
        ) : done ? (
          <m.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRINGS.gentle}
          >
            <AuthHeading title="That's done">
              Your new password is saved and we are signing you in now.
            </AuthHeading>
          </m.div>
        ) : (
          <m.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.gentle}
          >
            <AuthHeading title="Set a new password">
              For{" "}
              <span className="font-medium text-foreground">{link.email}</span>.
              Pick something you will remember.
            </AuthHeading>

            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              {/* The 8-character rule rides the focus hint ("8+ characters",
                  the PasswordField default): it appears exactly when the
                  caret does, instead of sitting under the field as a
                  permanent grey line. */}
              <PasswordField
                label="New password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  hoopoe.gaze(gazeFor(v.length, 16));
                }}
                onRevealChange={onReveal}
                autoFocus
              />
              <PasswordField
                label="Type it again"
                focusHint="The same one"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  hoopoe.gaze(gazeFor(v.length, 16));
                }}
                onRevealChange={onReveal}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? "Saving..." : "Save and sign me in"}
                </Button>
              </div>
            </form>
          </m.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}
