"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR, LOGIN_TRANSITION_FLAG } from "@/components/landing/hero-photo";
import { reportPerch, onHandoff, FLIGHT_FLAG } from "@/components/mascot/mascot-flight";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

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
  const hoopoeApiRef = useRef<HoopoeApi | null>(null);
  // Hidden until the flyer hands off when arriving via a flight; shown from the
  // start on a direct visit (there is no flyer to wait for). Deliberately does
  // NOT also fold in `mobileFlyIn` here: a mismatched inline `style` attribute
  // between the server render (which can never know the viewport) and the
  // client's first hydration pass is a class of hydration error React does not
  // patch up (it leaves the server value in place until some unrelated update
  // touches the node), so computing this from a client-only viewport check
  // would leave the hoopoe wrongly VISIBLE at its rest pose through the whole
  // hidden window instead of hidden. The mobile fly-in effect below hides it
  // instead, via a plain client-only state update after mount (not a
  // hydration commit), which React always reconciles correctly.
  const [hoopoeShown, setHoopoeShown] = useState(!arrivedViaFlight);

  // Mobile fly-in, part 1: the instant we know this is a fly-in viewport, hide
  // the hoopoe before the browser paints (useLayoutEffect, not useEffect), so
  // the SSR-rendered "already sitting there" frame is never actually shown.
  // This is a genuine post-hydration update, so it is exempt from the
  // attribute-hydration-mismatch pitfall the comment above describes.
  useLayoutEffect(() => {
    if (mobileFlyIn) setHoopoeShown(false);
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
    api.blinkOnce(true);
    introTimeoutRef.current = setTimeout(() => {
      introTimeoutRef.current = null;
      introDone.current = true;
      if (showPwRef.current) api.peek();
      else api.coverEyes();
    }, 1150);
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

  // Flight handoff: report where this hoopoe will rest once the entry settles
  // (see the form's onAnimationComplete), and reveal + start the intro when the
  // flyer lands. A fallback timer guarantees the bird is never stranded hidden
  // if the flight stalls; it is set longer than the flyer's own failsafe so the
  // two never both show.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    try {
      window.sessionStorage.removeItem(FLIGHT_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
    const reveal = () => {
      setHoopoeShown(true);
      const api = hoopoeApiRef.current;
      if (api && !introDone.current) runIntro(api);
    };
    const unsub = onHandoff(reveal);
    const fallback = setTimeout(reveal, 4000);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [arrivedViaFlight]);

  // Mobile fly-in, part 2: ~500ms after the page settles, reveal the (now
  // hidden, per the layout effect above) hoopoe and have it fly itself in
  // from off-screen onto its own rest anchor (no target = wherever it is
  // mounted), landing exactly where the static mascot would otherwise sit.
  // `flyIn` is a same-mount primitive (no cross-page bus involved), so no
  // `reportPerch`/`onHandoff` wiring is needed here; it only ever fires when
  // `arrivedViaFlight` is false, so it can never race the flight-bus reveal
  // above.
  useEffect(() => {
    if (!mobileFlyIn) return;
    const timer = setTimeout(() => {
      if (mobileFlyInFired.current) return;
      const api = hoopoeApiRef.current;
      if (!api) return;
      mobileFlyInFired.current = true;
      setHoopoeShown(true);
      api.flyIn("top").then(() => {
        if (!introDone.current) runIntro(api);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileFlyIn]);

  function reportPerchRect() {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    reportPerch({ left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const isAdmin =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
    email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Admin bypass: direct login via admin-login endpoint (no password needed)
      if (isAdmin) {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          window.location.href = "/feed";
          return;
        }
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else if (result?.ok) {
        window.location.href = "/feed";
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
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:left-16"
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
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <motion.div
          className="my-auto w-full max-w-[360px] self-center text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
          onAnimationComplete={reportPerchRect}
        >
          <div className="mx-auto mb-1 grid h-[128px] place-items-center">
            {/* Tight box around the SVG so its rect is the exact perch target.
                Hidden (at rest) until the flyer hands off; idle breathing is off
                while hidden so the swap matches the flyer's still rest pose. */}
            <div
              ref={hoopoeBoxRef}
              style={{ opacity: hoopoeShown ? 1 : 0, transition: "opacity 160ms ease" }}
            >
              <Hoopoe ref={hoopoeRef} size={102} onReady={onHoopoeReady} idle={hoopoeShown} />
            </div>
          </div>
          <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mx-auto mt-2 mb-7 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
            Sign in to reconnect with the people who grew up under the same trees.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // follow the email as it's typed too, so the bird feels alive across the form
                  hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 22) * 2 - 1)));
                }}
                required
                autoFocus
              />
            </div>
            {!isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // the bird follows what you type whether peeking or covered (head tracks
                      // behind the wings when its eyes are hidden)
                      hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 16) * 2 - 1)));
                    }}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {showPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="rounded-sm font-medium text-leaf hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
