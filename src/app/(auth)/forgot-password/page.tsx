"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { SPRINGS } from "@/components/common/motion";
import { requestPasswordReset } from "@/components/auth/email-actions";
import { maskEmail } from "@/lib/mask-email";

/* ------------------------------------------------------------------ *
 *  "I forgot my password", step one.
 *
 *  Two states in one page rather than two routes, so the address stays
 *  in memory and the bird is continuous across the change: it listens
 *  while you type, and nods the message away when you send it.
 *
 *  The screen after sending NEVER says whether that address has an
 *  account. `requestPasswordReset` returns the same thing either way
 *  (see its comment), and the address shown here is the one the visitor
 *  typed, masked, so the page can help them spot their own typo without
 *  becoming a way to test whether a given person is a member.
 * ------------------------------------------------------------------ */

export default function ForgotPasswordPage() {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const apiRef = useRef<HoopoeApi | null>(null);
  const [email, setEmail] = useState("");
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

    setSentTo(maskEmail(email.trim()));
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
              Type the address you signed up with and we will email a link to set
              a new one.
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
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="mt-2 w-full"
                disabled={sending}
              >
                {sending ? "Sending..." : "Send me a link"}
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
            <AuthHeading title="Check your inbox">
              If <span className="font-medium text-foreground">{sentTo}</span> has
              an account, a link to set a new password is on its way.
            </AuthHeading>

            {/* The three things people actually need next, as plain statements
                rather than a support article. Spam is listed FIRST because it
                is where the mail most often is, and the person reading this has
                already told us they are stuck. */}
            <ul className="space-y-2.5 rounded-[var(--radius-md)] border border-border bg-card p-4 text-left text-[13.5px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                <span>
                  It arrives within a minute or two. If you cannot see it, look in
                  spam or promotions.
                </span>
              </li>
              <li className="flex gap-2.5">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                <span>The link works for one hour, and only once.</span>
              </li>
              <li className="flex gap-2.5">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                <span>
                  Look for a message from <span className="text-foreground">hello@rishivalley.space</span>.
                </span>
              </li>
            </ul>

            <div className="mt-5 space-y-2.5">
              <Button
                variant="primary"
                className="w-full"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Back to sign in
              </Button>
              {/* Not "resend": a second send within the rate limit would look
                  identical and teach nothing. Going back to the form lets
                  someone FIX a typed address, which is the actual reason a
                  person lands back here. */}
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="w-full rounded-sm text-[13px] font-medium text-muted-foreground transition-[color,opacity] duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Try a different address
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPanel>
  );
}
