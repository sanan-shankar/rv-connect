"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Button } from "@/components/ui/button";
import { FloatField } from "@/components/common/float-field";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { BOT_CHECK_BLOCKED, TICK_HUMAN_BOX } from "@/lib/bot-check-message";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";
import { requestPasswordReset } from "@/components/auth/email-actions";
import { callAction } from "@/lib/call-action";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/turnstile-widget";
import { gazeFor } from "@/components/mascot/use-hoopoe";

/* ------------------------------------------------------------------ *
 *  "I forgot my password", step one.
 *
 *  Two states in one page rather than two routes, so the address stays
 *  in memory and the bird is continuous across the change.
 *
 *  On the copy (owner, 2026-08-12: "just be straightforward"): the sent
 *  screen states plainly that we sent a link, and to where. It does NOT
 *  hedge with "if that address has an account". That hedge existed to
 *  avoid confirming whether somebody is a member, but it does not
 *  actually buy that: saying the SAME sentence either way already
 *  withholds it, and the server returns the same thing either way
 *  regardless. All the hedge did was make a reassuring screen sound
 *  like a legal notice, to somebody who is already locked out.
 *
 *  The address shown is the one the visitor typed, unmasked. They typed
 *  it into the box on the previous screen; echoing it back is how they
 *  catch their own typo, and masking a value somebody just entered
 *  protects nobody from anything.
 * ------------------------------------------------------------------ */

export function ForgotPasswordClient({
  initialEmail,
  turnstileSiteKey,
}: {
  initialEmail: string;
  turnstileSiteKey: string | null;
}) {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const apiRef = useRef<HoopoeApi | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  // Desktop-only deferred focus; attached only when the box arrived empty.
  // Arriving from sign-in it is already filled, and stealing focus there
  // would put a caret in a field nobody needs to touch.
  const emailFocusRef = useDeferredAutofocus<HTMLInputElement>();

  // Arrival: the bird leans in, crest up. `curious` is the listening pose, and
  // this page's whole content is one question put to the visitor.
  function onHoopoeReady(api: HoopoeApi) {
    apiRef.current = api;
    void api.express("curious");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");

    const formData = new FormData();
    formData.set("email", email);
    // Proof-of-human (audit H22); the server verifies it with Cloudflare.
    const turnstileToken = await turnstileRef.current?.getToken();
    if (turnstileToken === "interaction") {
      // Cloudflare's checkbox is on screen, waiting for the human.
      setError(TICK_HUMAN_BOX);
      setSending(false);
      void apiRef.current?.react("wrong");
      return;
    }
    // The check's script never loaded here, so nothing sent from this browser
    // can carry a token and the server refuses all of it (audit M07).
    if (turnstileToken === "blocked") {
      setError(BOT_CHECK_BLOCKED);
      setSending(false);
      void apiRef.current?.react("wrong");
      return;
    }
    if (turnstileToken) formData.set("turnstileToken", turnstileToken);
    // Through callAction (audit C-034): a rejected dispatch left this form
    // stuck on a disabled "Sending..." with no way back but a reload.
    const result = await callAction(() => requestPasswordReset(formData));

    /* The refusals here are about the CALLER (bot check, too many requests
       from this connection), never about the address, so showing them leaks
       nothing the always-identical success screen exists to protect. */
    if (!result.ok) {
      setError(result.error);
      setSending(false);
      void apiRef.current?.react("wrong");
      // Spent token; re-arm so another go has a fresh one.
      turnstileRef.current?.reset();
      return;
    }

    setSentTo(email.trim());
    setSending(false);

    // Message taken and carried off: two nods, then a warm beat, then back to
    // rest. It settles rather than holding the grin, the same reasoning as the
    // login intro: a fixed expression stops reading as a reaction.
    const api = apiRef.current;
    if (!api) return;
    await api.nod(2);
    await api.express("happy");
    setTimeout(() => void api.express("content"), 1500);
  }

  return (
    <AuthPanel
      back={{ href: "/login", label: "Back to sign in" }}
      hoopoeRef={hoopoeRef}
      onHoopoeReady={onHoopoeReady}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sentTo === null ? (
          <m.div
            key="ask"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.gentle}
          >
            {/* No subtitle (the calm-form language): the Email box and the
                "Send reset link" button say the whole sentence the old grey
                line said. */}
            <AuthHeading title="Forgot your password?" />

            <form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
              <FloatField
                id="email"
                type="email"
                label="Email"
                value={email}
                autoComplete="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                  // The bird follows the address as it is typed, the same
                  // gesture the sign-in form uses, so the two pages feel like
                  // one continuous animal rather than two mascots.
                  hoopoe.gaze(
                    gazeFor(e.target.value.length, 22),
                  );
                }}
                required
                ref={initialEmail === "" ? emailFocusRef : undefined}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              {/* Invisible unless Cloudflare asks for an interaction; see
                  turnstile-widget.tsx. */}
              <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send reset link"}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link
                href="/login"
                className="rounded-sm font-medium text-leaf hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Sign in
              </Link>
            </p>
          </m.div>
        ) : (
          <m.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.gentle}
          >
            <AuthHeading title="Check your email" />

            {/* Three tiers, one job each (owner, 2026-08-20: the old screen
                was four same-weight muted lines with uneven gaps, "a jumble").
                Tier 1 is the ADDRESS, on its own line in the foreground
                weight: it is the one thing worth scanning for, both to know
                which inbox to open and to catch a typo. Tier 2 is one quiet
                line holding everything secondary (lifespan + spam) so nothing
                floats alone. Tier 3 is the action, styled as the same canopy
                link every auth page uses for its secondary move, so it reads
                as something you can press rather than more grey prose. */}
            <div className="mt-4">
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                A reset link is on its way to
              </p>
              <p className="mt-0.5 break-all text-[16px] font-semibold text-foreground">
                {sentTo}
              </p>
            </div>

            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              It works for the next hour. If it hasn&apos;t appeared, check your
              spam folder.
            </p>

            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="mt-6 rounded-sm text-[14px] font-medium text-canopy underline decoration-canopy/40 underline-offset-2 transition-colors duration-150 hover:decoration-canopy active:opacity-70 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Use a different address
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}
