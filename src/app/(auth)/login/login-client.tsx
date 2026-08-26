"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatField } from "@/components/common/float-field";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { AuthPhotoPanel } from "@/components/auth/auth-panel";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { PERCH_LIFT_PX } from "@/components/mascot/mascot-flight";
import { useFlightArrival } from "@/components/mascot/use-flight-arrival";
import { nextPathFromLocation } from "@/lib/next-path";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/turnstile-widget";
import { RATE_LIMITED } from "@/lib/rate-limit-message";
import { BOT_CHECK_BLOCKED, BOT_CHECK_FAILED, TICK_HUMAN_BOX } from "@/lib/bot-check-message";
import { SIGN_IN_UNAVAILABLE } from "@/lib/sign-in-unavailable-message";
import { MIN_PASSWORD } from "@/lib/password-rule";
import { gazeFor } from "@/components/mascot/use-hoopoe";

export default function LoginClient({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  // Same row choreography as the signup form: rows glide on the snappy
  // spring when a sibling appears or leaves.
  const rowTransition = { layout: SPRINGS.snappy };

  // The hoopoe covers its eyes (wings up) while the password is hidden, and peeks
  // when you reveal it; while peeking it follows what you type. One mascot, driven
  // by its controller.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const showPwRef = useRef(showPw);
  showPwRef.current = showPw;
  // Flips when the greeting has settled, not when it starts: the reveal-toggle
  // effect below waits on it so an early tap cannot fight the intro.
  const introDone = useRef(false);
  // Tracks the runIntro settle timer so a fast navigation (browser back, logo
  // click) can cancel it on unmount instead of letting it fire mascot verbs
  // against an already-unmounted rig.
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The password peek-a-boo intro: peek in with a double-blink greeting, then
  // tuck the wings over the (hidden) password. On a flight arrival this runs at
  // handoff (the flyer having just landed) instead of at mount.
  function runIntro(api: HoopoeApi) {
    // Self-guarding, because useFlightArrival calls this from every arrival
    // path and the failsafe can bring two of them together.
    if (introDone.current) return;
    api.peek();
    // Blink first, THEN smile (owner, 2026-08-04: "a sweet smile after hitting
    // sign in, before going back to normal and closing eyes"). The order is the
    // point: the double-blink plays on the round eyes, so it reads as the bird
    // looking at you, and only then does the face change. Smiling first would
    // put the blink on the `happy` arc eyeshape, which is a stroked curve with
    // no pupil to blink -- the beat would simply not be visible.
    api.blinkOnce(true);
    api.express("happy");
    introTimeoutRef.current = setTimeout(() => {
      introTimeoutRef.current = null;
      introDone.current = true;
      // Back to normal before the wings come up. Without this the bird sat
      // grinning behind its own wings for the rest of the page, which turns a
      // greeting into a fixed expression.
      api.express("content");
      if (showPwRef.current) api.peek();
      else api.coverEyes();
      // 1700, not the old 1150: the blink and the smile's spring together take
      // ~750ms, so the shorter window left well under half a second of actual
      // smile. This holds it about a second, which is long enough to register
      // as warmth and short enough that it is gone before you have finished
      // reaching for the email field.
    }, 1700);
  }

  // How the bird gets here: the landing "Sign in" flight on a desktop, or a
  // descent from off-screen on a phone, plus everything that keeps this page's
  // own hoopoe hidden and pixel-aligned until the flyer hands off. /signup and
  // the three email pages run the same hook; the beat above is what differs.
  const { hoopoeBoxRef, entranceRef, hoopoeShown, preFlightVeil, onHoopoeReady, reportPerchRect } =
    useFlightArrival({ flightKey: "login", runIntro });

  // Focus after paint, never during the commit: the `autoFocus` attribute this
  // replaces forced a synchronous layout inside React's commit, which stalled
  // the hoopoe's rAF-driven flight for a couple of frames right as this page's
  // content slid in. See use-deferred-autofocus.ts for the measurements.
  const emailFocusRef = useDeferredAutofocus<HTMLInputElement>();

  // React to reveal toggles after the intro settles.
  useEffect(() => {
    if (!introDone.current) return;
    if (showPw) hoopoe.peek();
    else hoopoe.coverEyes();
  }, [showPw, hoopoe]);

  // Belt-and-suspenders: cancel any pending intro timer on unmount so a fast
  // navigation away from /login (browser back, logo click) can never fire
  // coverEyes()/peek() against a rig that is already gone.
  useEffect(() => {
    return () => {
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // A fresh single-use token per attempt; authorize() checks it with
      // Cloudflare (audit H22). Null when the widget could not produce one
      // — the server then refuses with the bot-check code below, or lets
      // it pass if Turnstile itself is what broke. The "interaction"
      // sentinel means Cloudflare's checkbox is on screen waiting for the
      // human: say so NOW instead of sending a request that can only fail.
      const turnstileToken = await turnstileRef.current?.getToken();
      if (turnstileToken === "interaction") {
        setError(TICK_HUMAN_BOX);
        setLoading(false);
        return;
      }
      // The check's own script never loaded, so no attempt from this browser
      // can carry a token and the server refuses every one of them. Say that,
      // instead of sending a request whose refusal reads as "try again"
      // (audit M07).
      if (turnstileToken === "blocked") {
        setError(BOT_CHECK_BLOCKED);
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        ...(turnstileToken ? { turnstileToken } : {}),
        redirect: false,
      });

      if (result?.error) {
        // authorize() can refuse for reasons that are NOT a wrong password,
        // and telling someone their password is wrong when it isn't sends
        // them into a doomed reset loop. Only a CODE survives NextAuth's
        // CredentialsSignin channel, so it maps back to the same shared
        // sentences every other surface shows for the same refusal.
        const code = (result as { code?: string | null }).code;
        setError(
          code === "rate-limited"
            ? RATE_LIMITED
            : code === "bot-check"
              ? BOT_CHECK_FAILED
              : code === "unavailable"
                ? SIGN_IN_UNAVAILABLE
                : "Invalid email or password.",
        );
        /* Re-arm for the retry. The token that attempt carried is spent, so
           the next one needs a fresh challenge; and where Cloudflare is
           showing a checkbox, this is the moment it comes back — after the
           refusal, next to the reason, rather than blanking itself under a
           button still reading "Signing in..." (owner report 2026-08-22). */
        turnstileRef.current?.reset();
      } else if (result?.ok) {
        // ?next= carries a link that was followed before signing in (a
        // Catch-up invite, say) so the person lands back on it rather than
        // on the feed. Validated against same-site paths in safeNextPath.
        window.location.href = nextPathFromLocation();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      turnstileRef.current?.reset(); // same reasoning as the refusal above
    } finally {
      setLoading(false);
    }
  }

  return (
    // Not a grid: the photo half is viewport-fixed (below), so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the same width
    // the fixed panel occupies, so the form content starts right where the photo ends.
    <div className="min-h-screen lg:pl-[58.3333%]">
      <AuthPhotoPanel />

      {/* Form half: warm panel with a top-left "Back" link (matches /signup)
          and a centered form below it. The content always does a lateral pass
          on mount: it slides in from the right on the gentle spring while the
          photo half and its logo stay anchored, whether you arrived via the
          landing "Sign in" slide or any other navigation (direct visit,
          reload, back button). Hydration-safe; no reduced-motion branching per
          owner decision. */}
      <div className="flex min-h-screen flex-col bg-background px-[var(--space-l)] py-[var(--space-l)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <motion.div
          ref={entranceRef}
          // 400px, matching /signup, so the two auth pages are one column.
          className="my-auto w-full max-w-[400px] self-center text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
          onAnimationComplete={reportPerchRect}
        >
          <div className={cn("mx-auto mb-1 grid h-[128px] place-items-center", preFlightVeil && "max-lg:opacity-0")}>
            {/* Tight box around the SVG so its rect is the exact perch target.
                Hidden (at rest) until the flyer hands off, then revealed with NO
                fade: the flyer holds for two frames over this exact rect and two
                identical fully-opaque birds swap invisibly, where the old 160ms
                fade dipped the stack's combined opacity mid-cross and read as
                one hoopoe dissolving into another. Idle breathing is off while
                hidden so the swap matches the flyer's still rest pose. The box
                rides PERCH_LIFT_PX high (argued in mascot-flight.ts); its
                measured rect includes the lift, so the report, the flyer and
                this bird all agree. */}
            <div
              ref={hoopoeBoxRef}
              data-hoopoe-perch
              style={{ opacity: hoopoeShown ? 1 : 0, transform: `translateY(-${PERCH_LIFT_PX}px)` }}
            >
              <Hoopoe ref={hoopoeRef} size={102} onReady={onHoopoeReady} idle={hoopoeShown} />
            </div>
          </div>
          {/* No subtitle: same calm-form language as /signup (owner,
              2026-08-14) - one heading, fields that say their own names,
              no grey prose. */}
          <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
            Welcome back
          </h1>

          {/* `relative` anchors popLayout's exiting rows; rows carry `layout`
              so the password block vanishing (admin email) and the error line
              arriving glide their neighbours instead of snapping - the same
              choreography as the signup form. */}
          <form onSubmit={handleSubmit} className="relative mt-5 space-y-3 text-left">
            <motion.div layout transition={rowTransition}>
              <FloatField
                id="email"
                type="email"
                label="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // follow the email as it's typed too, so the bird feels alive across the form
                  hoopoe.gaze(gazeFor(e.target.value.length, 22));
                }}
                required
                ref={emailFocusRef}
              />
            </motion.div>
            {/* The password field is unconditional. It used to be hidden
                whenever the typed address matched NEXT_PUBLIC_ADMIN_EMAIL,
                because the admin signed in through a password-less bypass
                (security audit C1-a/b/c). That bypass is being removed, and
                hiding the field was also what stopped the owner from ever
                testing his own password. */}
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...SPRINGS.snappy, ...rowTransition }}
            >
              <FloatField
                id="password"
                type={showPw ? "text" : "password"}
                label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // the bird follows what you type whether peeking or covered (head tracks
                  // behind the wings when its eyes are hidden)
                  hoopoe.gaze(gazeFor(e.target.value.length, 16));
                }}
                required
                minLength={MIN_PASSWORD}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    // state-layer gives the reveal button the fill it never had:
                    // an ink darkening alone is easy to miss on a 32px target,
                    // and the same class carries the press state.
                    className="state-layer grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {showPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                }
              />
              {/* The way out sits right under the field that is failing
                  them: by the time somebody wants this they have typed a
                  password that did not work, and their eyes are here (the
                  floating label leaves no label row for it to share).
                  Carries whatever is already in the email box - retyping
                  an address ten seconds after a rejection reads as an app
                  that is not paying attention (owner, 2026-08-12). */}
              {/* leading-none trims the inherited 24px line box around a
                  12.5px link, which was adding ~4px of phantom air to the
                  coded 6px gap above it. */}
              <div className="mt-1.5 text-right leading-none">
                <Link
                  href={
                    email.trim()
                      ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                      : "/forgot-password"
                  }
                  className="rounded-sm text-[12.5px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Forgot it?
                </Link>
              </div>
            </motion.div>
            <AnimatePresence mode="popLayout" initial={false}>
              {error && (
                <motion.p
                  key="error"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...SPRINGS.snappy, ...rowTransition }}
                  className="text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            {/* Invisible until Cloudflare wants an interaction; see
                turnstile-widget.tsx. Above the button so a challenge, when
                one does appear, reads as part of the form, not an afterthought
                below the CTA. */}
            <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />
            <motion.div layout transition={rowTransition} className="pt-1">
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </motion.div>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="rounded-sm font-medium text-leaf hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Join
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Warms the flight rig off-screen in case a visitor lands here directly
          and bounces back to the landing hero to fly again. See
          hoopoe-warmup.tsx. */}
      <HoopoeWarmup />
    </div>
  );
}
