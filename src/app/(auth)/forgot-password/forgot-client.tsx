"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";
import { requestPasswordReset } from "@/components/auth/email-actions";

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

export function ForgotPasswordClient({ initialEmail }: { initialEmail: string }) {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const apiRef = useRef<HoopoeApi | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

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

    const formData = new FormData();
    formData.set("email", email);
    await requestPasswordReset(formData);

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
            <AuthHeading title="Forgot your password?">
              Enter your email and we will send you a link to reset it.
            </AuthHeading>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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
                  // Focus the box only when it is empty. Arriving from sign-in
                  // it is already filled, and stealing focus there would put a
                  // caret in a field nobody needs to touch.
                  autoFocus={initialEmail === ""}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="mt-2 w-full"
                disabled={sending}
              >
                {sending ? "Sending..." : "Send reset link"}
              </Button>
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
