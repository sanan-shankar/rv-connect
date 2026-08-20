"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { FloatField } from "@/components/common/float-field";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";
import { requestPasswordReset } from "@/components/auth/email-actions";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/turnstile-widget";

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
    if (turnstileToken) formData.set("turnstileToken", turnstileToken);
    const result = await requestPasswordReset(formData);

    /* The refusals here are about the CALLER (bot check, too many requests
       from this connection), never about the address, so showing them leaks
       nothing the always-identical success screen exists to protect. */
    if (!result.ok) {
      setError(result.error);
      setSending(false);
      void apiRef.current?.react("wrong");
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
          <motion.div
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
                    Math.max(-1, Math.min(1, (e.target.value.length / 22) * 2 - 1)),
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
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRINGS.gentle}
          >
            <AuthHeading title="Check your email">
              We sent a reset link to{" "}
              <span className="font-medium text-foreground">{sentTo}</span>. It
              expires in an hour.
            </AuthHeading>

            {/* One line, not a bulleted list of three. Spam is the only thing
                worth saying here, because it is where the message usually is
                when somebody comes back saying it never arrived. */}
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              Can&apos;t find it? Check your spam folder.
            </p>

            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="mt-5 w-full rounded-sm text-[13px] font-medium text-muted-foreground transition-[color,opacity] duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Use a different email
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}
