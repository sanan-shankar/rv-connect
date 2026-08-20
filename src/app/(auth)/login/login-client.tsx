"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatField } from "@/components/common/float-field";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR, LOGIN_TRANSITION_FLAG } from "@/components/landing/hero-photo";
import { reportPerch, onHandoff, FLIGHT_FLAG, PERCH_LIFT_PX } from "@/components/mascot/mascot-flight";
import { nextPathFromLocation } from "@/lib/next-path";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/turnstile-widget";
import { RATE_LIMITED } from "@/lib/rate-limit-message";
import { BOT_CHECK_FAILED, TICK_HUMAN_BOX } from "@/lib/bot-check-message";

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

  // One-shot flag: the landing "Sign in" transition sets this session flag
  // right before it pushes here, purely so the handoff machinery below can
  // tell a genuine hero transition apart from every other arrival. Decide it
  // before first paint via a lazy initializer so there is no flash: on the
  // transition (a soft client navigation) the flag is present; on a direct
  // visit / reload (a full SSR load) server and client both see no flag. The
  // sign-in form's lateral slide-in itself now plays for BOTH cases (see the
  // motion.div below) so ordinary arrivals get the same pleasant entrance
  // /signup has always had, instead of just popping in.
  //
  // The read here is PURE (no clear): React Strict Mode double-invokes state
  // initializers in dev, so clearing inside it would wipe the flag on the first
  // call and make the second call (whose value React keeps) return false,
  // silently breaking the hero-transition detection below. We consume the
  // one-shot flag in the effect below instead.
  const [arrivedViaTransition] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(LOGIN_TRANSITION_FLAG) === "1";
    } catch {
      return false;
    }
  });

  // Whether the ONE hoopoe is flying in from the landing CTA (button-to-perch
  // flight). When true, this page keeps its own hoopoe hidden and at rest until
  // the flyer lands and hands off, so only one bird is ever on screen. Read
  // pure (no clear) for the same Strict-Mode reason as above; consumed in the
  // handoff effect so a reload does not re-hide the bird.
  const [arrivedViaFlight] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(FLIGHT_FLAG) === "login";
    } catch {
      return false;
    }
  });

  // Mobile has no Sign-in button to launch a cross-page flight from (the photo
  // panel and its CTA only exist at lg+), so on a narrow viewport the owner
  // wants the SAME "one bird" feeling delivered a different way: the page
  // loads bare, then ~500ms later the hoopoe flies in from off-screen and
  // perches exactly where the static mascot would otherwise sit. Decided once
  // at mount via the identical `min-width: 1024px` gate the landing hero's
  // desktop-only flight uses, so this never fires on a viewport wide enough to
  // have gotten the button-to-perch flight instead. The `arrivedViaFlight`
  // check is belt-and-suspenders against the (practically-impossible but
  // guarded-for) case of a desktop flight landing on a since-narrowed
  // viewport: that arrival already has its own reveal path above and must
  // never also trigger this one, or two hoopoes could end up in the air.
  const [mobileFlyIn] = useState(() => {
    if (typeof window === "undefined") return false;
    if (arrivedViaFlight) return false;
    try {
      return !window.matchMedia("(min-width: 1024px)").matches;
    } catch {
      return false;
    }
  });
  // Guards the scheduled fly-in so it can only ever fire once.
  const mobileFlyInFired = useRef(false);

  // Consume the one-shot flag after mount so a later reload or a fresh direct
  // visit within the same tab session does not mistake itself for a hero
  // transition (the flag is otherwise unused now that the entrance below
  // plays for every arrival, but this keeps it from lingering as stale state).
  useEffect(() => {
    if (!arrivedViaTransition) return;
    try {
      window.sessionStorage.removeItem(LOGIN_TRANSITION_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
  }, [arrivedViaTransition]);

  // The hoopoe covers its eyes (wings up) while the password is hidden, and peeks
  // when you reveal it; while peeking it follows what you type. One mascot, driven
  // by its controller.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const showPwRef = useRef(showPw);
  showPwRef.current = showPw;
  const introDone = useRef(false);
  // Tracks the runIntro settle timer so a fast navigation (browser back, logo
  // click) can cancel it on unmount instead of letting it fire mascot verbs
  // against an already-unmounted rig.
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The tight box around the hoopoe SVG. Its client rect is the flyer's exact
  // landing target, so the perched flyer and this hoopoe end up pixel-aligned.
  const hoopoeBoxRef = useRef<HTMLDivElement>(null);
  // The form entrance element (the motion.div that slides x 48 -> 0). The
  // perch report below reads its live transform to un-shift rects measured
  // mid-entrance.
  const entranceRef = useRef<HTMLDivElement>(null);
  const hoopoeApiRef = useRef<HoopoeApi | null>(null);
  // Hidden until the flyer hands off when arriving via a flight; shown from the
  // start on a direct visit (there is no flyer to wait for). Deliberately does
  // NOT also fold in the mobile case here: a mismatched inline `style`
  // attribute between the server render (which can never know the viewport)
  // and the client's first hydration pass is a class of hydration error React
  // does not patch up (it leaves the server value in place until some
  // unrelated update touches the node). The mobile fly-in instead hides the
  // bird with the SSR-safe `max-lg:opacity-0` CLASS below — className swaps
  // hydrate fine, and a media-scoped class is inert at lg+ so the server can
  // render it unconditionally.
  const [hoopoeShown, setHoopoeShown] = useState(!arrivedViaFlight);

  // Focus after paint, never during the commit: the `autoFocus` attribute this
  // replaces forced a synchronous layout inside React's commit, which stalled
  // the hoopoe's rAF-driven flight for a couple of frames right as this page's
  // content slid in. See use-deferred-autofocus.ts for the measurements.
  const emailFocusRef = useDeferredAutofocus<HTMLInputElement>();

  // Mobile fly-in, part 1: the pre-flight veil. Rendered on the bird's OUTER
  // box (the inner box carries an inline opacity, which would beat any class)
  // as `max-lg:opacity-0`, so on a phone the seated bird is invisible from the
  // very first painted frame — including the SSR paint, which the previous
  // hide-after-hydration approach could not cover on a slow device. Lifted
  // before paint for every non-fly-in arrival so a later narrow-resize can
  // never hide a legitimately visible bird; the fly-in effect below lifts it
  // for the mobile path once the bird is posed off-screen.
  const [preFlightVeil, setPreFlightVeil] = useState(true);
  useLayoutEffect(() => {
    if (!mobileFlyIn) setPreFlightVeil(false);
  }, [mobileFlyIn]);

  // React to reveal toggles after the intro settles.
  useEffect(() => {
    if (!introDone.current) return;
    if (showPw) hoopoe.peek();
    else hoopoe.coverEyes();
  }, [showPw, hoopoe]);

  // The password peek-a-boo intro: peek in with a double-blink greeting, then
  // tuck the wings over the (hidden) password. On a flight arrival this runs at
  // handoff (the flyer having just landed) instead of at mount.
  function runIntro(api: HoopoeApi) {
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

  function onHoopoeReady(api: HoopoeApi) {
    hoopoeApiRef.current = api;
    if (!arrivedViaFlight && !mobileFlyIn) runIntro(api);
  }

  // Belt-and-suspenders: cancel any pending intro timer on unmount so a fast
  // navigation away from /login (browser back, logo click) can never fire
  // coverEyes()/peek() against a rig that is already gone.
  useEffect(() => {
    return () => {
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, []);

  // Where this hoopoe will rest, reported to the flight bus. The form entrance
  // above the bird animates x 48 -> 0 on a spring, so a rect measured while it
  // is still sliding sits shifted by whatever translation remains; subtracting
  // the entrance element's live transform yields the SETTLED rect. That makes
  // the mount-time report below exactly as accurate as the settle-time one —
  // and the mount-time report is the fix for the owner's "lands lower and then
  // corrects" jank: the old single report only fired AFTER the entrance
  // spring finished, ~2s in, when the flyer's cruise had already ended on a
  // provisional guess ~25px low.
  const reportPerchRect = useCallback(() => {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    const host = entranceRef.current;
    if (host) {
      const t = getComputedStyle(host).transform;
      if (t && t !== "none") {
        const m = new DOMMatrix(t);
        dx = m.e;
        dy = m.f;
      }
    }
    reportPerch({ left: r.left - dx, top: r.top - dy, width: r.width, height: r.height });
  }, [arrivedViaFlight]);

  // Report the perch EARLY — before this page's first paint, while the flyer
  // is still mid-cruise — and keep it fresh (ResizeObserver + resize + scroll,
  // the tour-spotlight measuring pattern) until the handoff makes it moot. The
  // flight bus explicitly supports repeated reports and the flyer retargets
  // smoothly every frame, so the bird is never aiming at a stale rect.
  // `perchWatchStop` lets the handoff reveal below drop the listeners the
  // moment they stop mattering.
  const perchWatchStop = useRef<(() => void) | null>(null);
  // THE MOUNT-TIME REPORT IS THE ResizeObserver'S OWN INITIAL DELIVERY, and
  // that is a flight-smoothness decision, not an accident (2026-08-11).
  //
  // reportPerchRect reads getBoundingClientRect and getComputedStyle. This
  // effect used to also CALL it directly, first as a layout effect and then as
  // a passive one, and in both schedulings it ran before the just-mounted
  // page's first layout, so the read forced a full synchronous layout of a
  // dirty tree — traced at ~85ms, billed to whichever code touches geometry
  // first (this callback, or `autoFocus`, or the router's scroll walk; fixing
  // one just moved the bill to the next). The flight layer drives the bird's
  // cruise from requestAnimationFrame, so those milliseconds came out of the
  // flight as skipped frames: the owner's "it jerks slightly when the sign in
  // content comes in".
  //
  // A ResizeObserver is the one scheduling the platform guarantees to be
  // clean: its callbacks run in the rendering phase AFTER layout, and
  // observe() always produces an initial delivery. So the observer alone
  // reports the perch in the first rendered frame, off a freshly computed
  // layout, forcing nothing — the explicit call added no earliness worth one
  // whole forced layout. The flyer retargets smoothly every frame across a
  // ~2s cruise, so frame-one is early by a mile anyway.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    const ro = new ResizeObserver(reportPerchRect);
    if (el) ro.observe(el);
    window.addEventListener("resize", reportPerchRect);
    window.addEventListener("scroll", reportPerchRect, { passive: true, capture: true });
    const stop = () => {
      ro.disconnect();
      window.removeEventListener("resize", reportPerchRect);
      window.removeEventListener("scroll", reportPerchRect, true);
      perchWatchStop.current = null;
    };
    perchWatchStop.current = stop;
    return stop;
  }, [arrivedViaFlight, reportPerchRect]);

  // Flight handoff: reveal + start the intro when the flyer lands. A fallback
  // timer guarantees the bird is never stranded hidden if the flight stalls;
  // it is set longer than the flyer's own failsafe so the two never both show.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    try {
      window.sessionStorage.removeItem(FLIGHT_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
    // One-shot: on the failsafe path the flyer's forced handoff AND the
    // fallback timer below can both land here inside the intro's settle
    // window, and running the intro twice queued a double greeting.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      perchWatchStop.current?.();
      setHoopoeShown(true);
      const api = hoopoeApiRef.current;
      if (api && !introDone.current) runIntro(api);
    };
    const unsub = onHandoff(reveal);
    // Must stay ABOVE the flight layer's own failsafe (5800ms at the default
    // speed, mascot-flight-layer.tsx), so the flyer always hands off before
    // this fires and the two birds are never both on screen. Raised 4000 ->
    // 6000 on 2026-08-04 with the slower cruise; the same three numbers live
    // in that file's header comment.
    const fallback = setTimeout(reveal, 6000);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [arrivedViaFlight]);

  // Mobile fly-in, part 2: ~500ms after the page settles, the hoopoe flies
  // itself in from above the viewport onto its own rest anchor (no target =
  // wherever it is mounted), landing exactly where the static mascot would
  // otherwise sit. `flyIn` is a same-mount primitive (no cross-page bus
  // involved), so no `reportPerch`/`onHandoff` wiring is needed here; it only
  // ever fires when `arrivedViaFlight` is false, so it can never race the
  // flight-bus reveal above.
  useEffect(() => {
    if (!mobileFlyIn) return;
    const timer = setTimeout(() => {
      if (mobileFlyInFired.current) return;
      const api = hoopoeApiRef.current;
      if (!api) {
        // The rig never reported ready (it mounts statically, so this is
        // near-impossible): show the seated bird rather than none at all.
        setPreFlightVeil(false);
        return;
      }
      mobileFlyInFired.current = true;
      // "sky", not "top": the top edge spawns relative to the rig's own box,
      // which sits mid-viewport here, so the bird used to pop in already on
      // screen. The sky edge starts it fully above the VIEWPORT (see
      // offCanvasStart in hoopoe.tsx) for a genuine descent from off-screen.
      void api.flyIn("sky").then(() => {
        if (!introDone.current) runIntro(api);
      });
      // Lift the veil two frames later: motion renders the fly-in's duration-0
      // pose warps on its NEXT animation frame, so revealing in the same tick
      // could paint one frame of the seated bird at the perch before the warp
      // moves it off-screen. Instant reveal, no fade — the bird is above the
      // viewport by then, so a fade could only ever be seen as a mid-air
      // ghost during the descent.
      requestAnimationFrame(() => requestAnimationFrame(() => setPreFlightVeil(false)));
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileFlyIn]);

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
              : "Invalid email or password.",
        );
      } else if (result?.ok) {
        // ?next= carries a link that was followed before signing in (a
        // Catch-up invite, say) so the person lands back on it rather than
        // on the feed. Validated against same-site paths in safeNextPath.
        window.location.href = nextPathFromLocation();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Not a grid: the photo half is viewport-fixed (below), so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the same width
    // the fixed panel occupies, so the form content starts right where the photo ends.
    <div className="min-h-screen lg:pl-[58.3333%]">
      {/* Photo half: the valley, with the brand overlaid. Pinned to the viewport with
          `fixed` + `inset-y-0` (not part of the grid row), so its size and crop stay
          constant regardless of form height (password field toggling, error text, etc).
          The form column scrolls the page under it; the photo never resizes.

          Geometry note: the inner box is a full 100vw `object-cover` render (the SAME
          scale the landing hero uses), right-aligned inside this 58.33vw panel and
          clipped by `overflow-hidden`. So the panel shows exactly the RIGHT slice of the
          landing composition, at the landing's zoom, with the left part cropped off. That
          is what the landing "Sign in" slide lands on, so the handoff has no jump. */}
      <div className="fixed inset-y-0 left-0 hidden w-[58.3333%] overflow-hidden lg:block">
        <div className="absolute inset-y-0 right-0 w-screen">
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            placeholder="blur"
            blurDataURL={HERO_IMAGE_BLUR}
            className="object-cover"
            sizes="100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent"
          />
        </div>
        {/* Canonical wordmark lockup (same size + position as the landing hero, so it
            stays put across the sign-in handoff). */}
        <Link
          href="/"
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white lg:left-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
        >
          <Wordmark markClassName="text-white" textClassName="block" />
        </Link>
      </div>

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
                  hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 22) * 2 - 1)));
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
                  hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 16) * 2 - 1)));
                }}
                required
                minLength={8}
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
