"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { SegmentedPills } from "@/components/common/segmented-pills";
import {
  FloatField,
  FIELD_SHELL,
  FIELD_PAD,
  FLOAT_LABEL_BASE,
  FLOAT_LABEL_REST,
  FLOAT_LABEL_UP,
} from "@/components/common/float-field";
import { YearInput } from "@/components/common/year-input";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { cn } from "@/lib/utils";
import { BOT_CHECK_BLOCKED, TICK_HUMAN_BOX } from "@/lib/bot-check-message";
import { registerUser } from "./actions";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { MIN_PASSWORD } from "@/lib/password-rule";
import { PasswordField } from "@/components/auth/password-field";
import { gazeFor } from "@/components/mascot/use-hoopoe";

// Devices with a real mouse get the info bubble on hover; touch devices (no
// fine hover) get it on tap instead. Checked once on mount, not reactively,
// since a device does not switch input modes mid-session.
function useHoverCapable() {
  const [capable, setCapable] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Asks matchMedia whether the device has a real pointer. A media query has no server-side answer, so this has to happen after mount.
    setCapable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);
  return capable;
}

/**
 * Small circled-i affordance that reveals a short warm note. Opens on hover
 * for mouse users, on tap for touch users, and on keyboard focus either way
 * (gated on :focus-visible so a mouse click does not double-fire with the tap
 * handler). Closes on blur, outside click/tap, or Escape.
 */
function InfoTip({
  label,
  children,
  fit = false,
}: {
  label: string;
  children: React.ReactNode;
  /** Size the bubble to its longest line instead of the fixed w-64. For the
   *  short two-line notes; the batch explainer keeps the full measure. */
  fit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hoverCapable = useHoverCapable();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipId = useId();
  // Anchored to the trigger's right edge by default, but clamped so the
  // bubble never runs off either side of a narrow viewport regardless of
  // where the icon happens to sit.
  const [tipLeft, setTipLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const wrap = wrapRef.current;
      const tip = tipRef.current;
      if (!wrap || !tip) return;
      const wrapRect = wrap.getBoundingClientRect();
      const margin = 12;
      let left = wrapRect.width - tip.offsetWidth; // right-align to trigger, wrapper-relative
      const pageLeft = wrapRect.left + left;
      if (pageLeft < margin) left += margin - pageLeft;
      const pageRight = wrapRect.left + left + tip.offsetWidth;
      if (pageRight > window.innerWidth - margin) left -= pageRight - (window.innerWidth - margin);
      setTipLeft(left);
    }
    reposition();
    window.addEventListener("resize", reposition);
    function onOutside(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={hoverCapable ? () => setOpen(true) : undefined}
      onMouseLeave={hoverCapable ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={!hoverCapable ? () => setOpen((o) => !o) : undefined}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted-foreground/70 hover:text-canopy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -2 }}
            transition={SPRINGS.snappy}
            style={{ left: tipLeft ?? undefined, right: tipLeft == null ? 0 : undefined }}
            className={cn(
              "absolute top-full z-30 mt-2 max-w-[80vw] rounded-[var(--radius-md)] border border-border bg-paper px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground shadow-lg",
              fit ? "w-max" : "w-64"
            )}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * The phone field, one calm box like every other field. At rest it says
 * only "Phone" with a small "Optional" at its right edge. Wake it (focus
 * or a saved value) and the label floats up while the country code fades
 * in as a prefix, already filled with +91 and still editable. The reveal
 * is opacity-only; nothing in the row moves, because the digits input
 * always starts after the code slot.
 */
function PhoneField({
  countryCode,
  onCountryCode,
  digits,
  onDigits,
}: {
  countryCode: string;
  onCountryCode: (v: string) => void;
  digits: string;
  onDigits: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const digitsRef = useRef<HTMLInputElement>(null);
  const active = focused || digits.trim() !== "";

  return (
    <div
      // No focus-within ring: same owner call as FloatField. The label
      // floating and the +91 fading in are this box's focus state.
      className={cn(FIELD_SHELL, "relative")}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
      // A resting click can land on the shell, the row or the (hidden) code
      // slot rather than an input; hand anything that is not an input to the
      // digits field so the whole box is one target.
      onClick={(e) => {
        if (!(e.target instanceof HTMLInputElement)) digitsRef.current?.focus();
      }}
    >
      <div className={cn("flex h-full items-stretch", FIELD_PAD)}>
        <input
          aria-label="Country code"
          value={countryCode}
          onChange={(e) => onCountryCode(e.target.value.slice(0, 5))}
          inputMode="tel"
          tabIndex={active ? 0 : -1}
          // Sized to its content (ch tracks the widest tel glyphs closely
          // enough) so "+91" sits right beside the number the way a dialled
          // prefix reads, while a longer code still fits.
          style={{ width: `${Math.max(countryCode.length, 2) + 0.75}ch` }}
          className={cn(
            "shrink-0 bg-transparent text-base text-foreground outline-none transition-opacity duration-200",
            active ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />
        <input
          ref={digitsRef}
          id="phoneDigits"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={digits}
          onChange={(e) => onDigits(e.target.value)}
          className="min-w-0 flex-1 bg-transparent pl-1.5 text-base text-foreground outline-none placeholder:text-muted-foreground/70 placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-100"
        />
      </div>
      <label
        htmlFor="phoneDigits"
        className={cn(FLOAT_LABEL_BASE, active ? FLOAT_LABEL_UP : FLOAT_LABEL_REST)}
      >
        Phone
      </label>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 transition-opacity duration-200",
          active && "opacity-0"
        )}
      >
        Optional
      </span>
    </div>
  );
}

export function SignupForm({
  hoopoe,
  turnstileSiteKey,
  onSuccess,
}: {
  hoopoe: HoopoeApi;
  turnstileSiteKey: string | null;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Set once the account exists and the celebration is running; see finally. */
  const succeeded = useRef(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [accountType, setAccountType] = useState<"alumnus" | "teacher">("alumnus");
  const isAlum = accountType === "alumnus";
  const [showPw, setShowPw] = useState(false);
  // Focus after paint, not via `autoFocus`: this form mounts at the gate-pass
  // moment, while the hoopoe's celebrate(2) hop is still playing, and
  // autoFocus's in-commit focus() forced a layout that stalled that animation.
  // See use-deferred-autofocus.ts for the measurements.
  const firstNameFocusRef = useDeferredAutofocus<HTMLInputElement>();

  // The years row and the error line come and go, and their neighbours must
  // glide both ways. auto-animate only managed one: it FLIPs remaining
  // siblings when a row is REMOVED, but on insertion it drops them straight
  // at their new positions (measured: shrink eased over ~250ms, expand
  // jumped 68px in one frame). So the choreography is Motion's instead:
  // every row below the toggle carries `layout`, and the conditional rows
  // mount through AnimatePresence in popLayout mode, which lifts the
  // exiting row out of flow so the siblings' slide and its fade happen
  // together - the same simultaneous feel in both directions, transforms
  // and opacity only.
  const rowTransition = { layout: SPRINGS.snappy };

  // Phone, collected right here at the first step so it never feels like a
  // later afterthought. Country code defaults to +91 but is a free, editable
  // field; the number is digits-only. Optional. Combined into one value for the
  // hidden `phone` field the server reads (normalizePhone tidies it there).
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const phoneValue = phoneDigits.trim() ? `${countryCode} ${phoneDigits}`.trim() : "";

  // The batch is asked directly ("the year your class finished 12th"),
  // alongside the two plain years someone joined and left. All controlled so we
  // can validate before submit; YearInput owns the digits-only rule.
  const [yearJoined, setYearJoined] = useState("");
  const [yearLeft, setYearLeft] = useState("");
  const [batchYear, setBatchYear] = useState("");

  // The one shared hoopoe (hoisted to the page) covers its eyes while the
  // password is hidden and peeks (following what you type) once revealed.
  const showPwRef = useRef(showPw);
  showPwRef.current = showPw;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // Arriving from the trivia step: tuck the wings over the (hidden)
      // password so it reads as the same bird following you in. But not on a
      // fixed delay: this form mounts while the gate-pass celebrate(2) hop is
      // still playing, and coverEyes is deliberately unqueued, so firing it
      // mid-hop had both animations writing the same wing transforms and the
      // last writer won: answer the trivia fast and the wings stranded
      // half-raised until the next show/hide toggle re-posed them. So wait
      // for the bird to actually be idle (isBusy covers the queue and every
      // live animation), keep the old 340ms as the minimum settle, and cap
      // the wait so a stuck animation can never hold the tuck hostage (a
      // superseded animation's .finished never resolves in motion v12, so a
      // live-set entry CAN wedge open forever). The cap sits past the
      // flight layer's 5800ms failsafe: a shorter cap could fire mid
      // mobile-fly-in and recreate the very mid-animation strand this
      // waits out. The between-verb gaps of a react() sequence are
      // microtask-sized, and this poll is a macrotask, so it can never
      // slip a tuck inside a running chain.
      mounted.current = true;
      let cancelled = false;
      const started = performance.now();
      const tuck = () => {
        if (showPwRef.current) hoopoe.peek();
        else hoopoe.coverEyes();
      };
      // Phase 1 waits for the first quiet moment to tuck. Phase 2 keeps
      // watch: if ANYTHING animates the bird after the tuck (a flight
      // handoff's late greet, a queued celebration, whatever a browser's
      // timing lets through), the pose is re-asserted the moment that
      // intruder finishes, so a stranded wing can survive at most one
      // poll tick. The watch ends at 15s: by then the only writers left
      // are the ambient breathe/blink/crest loop, which never touches
      // wings. Re-tucking is idempotent — springs to values already held
      // move nothing.
      let tucked = false;
      let sawBusySinceTuck = false;
      const tick = () => {
        if (cancelled) return;
        const waited = performance.now() - started;
        const busy = hoopoe.isBusy();
        if (!tucked) {
          if ((waited >= 340 && !busy) || waited > 8000) {
            tuck();
            tucked = true;
          }
        } else if (busy) {
          sawBusySinceTuck = true;
        } else if (sawBusySinceTuck) {
          sawBusySinceTuck = false;
          tuck();
        }
        if (waited < 15000) timer = setTimeout(tick, tucked ? 250 : 120);
      };
      let timer = setTimeout(tick, 340);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    if (showPw) hoopoe.peek();
    else hoopoe.coverEyes();
  }, [showPw, hoopoe]);

  const ACCOUNT_TYPES = [
    { value: "alumnus", label: "Alumnus" },
    { value: "teacher", label: "Teacher" },
  ] as const;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;

    if (password.length < MIN_PASSWORD) {
      setError("Password must be at least 8 characters.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }

    if (isAlum && (!yearJoined || !yearLeft || !batchYear)) {
      setError("Please fill in the years you joined and left, and your batch.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }
    if (!isAlum && !yearJoined) {
      setError("Please add the year you joined.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }
    if (yearJoined && yearLeft && Number(yearLeft) < Number(yearJoined)) {
      setError("The year you left cannot be before the year you joined.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }

    try {
      // Proof-of-human for the server (audit H22); registerUser verifies it
      // with Cloudflare before touching the database. The signIn below needs
      // no second token: registerUser leaves a five-minute pass cookie.
      const turnstileToken = await turnstileRef.current?.getToken();
      if (turnstileToken === "interaction") {
        // Cloudflare's checkbox is on screen, waiting for the human.
        setError(TICK_HUMAN_BOX);
        hoopoe.react("error");
        setLoading(false);
        return;
      }
      // The check's script never loaded here, so nothing sent from this
      // browser can carry a token and the server refuses all of it (M07).
      if (turnstileToken === "blocked") {
        setError(BOT_CHECK_BLOCKED);
        hoopoe.react("error");
        setLoading(false);
        return;
      }
      if (turnstileToken) formData.set("turnstileToken", turnstileToken);

      const result = await registerUser(formData);
      if (result.error) {
        setError(result.error);
        hoopoe.react("error");
        // Spent token; the retry needs a new one. Explicitly here and in the
        // catch, NOT in the finally below — the "interaction" and "blocked"
        // returns above pass through the finally too, and on those nothing
        // was spent and a reset would wipe a challenge mid-solve.
        turnstileRef.current?.reset();
      } else {
        // User created — sign in with credentials directly
        const email = formData.get("email") as string;
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          /* The account exists; only the automatic sign-in did not happen.
             Onboarding was then lost for good: /welcome is reachable only by
             being pushed there from this line, so a member in this branch
             logged in later and landed on the feed having never seen the five
             setup steps (audit Low 115). Sending them to sign-in with
             /welcome as the destination puts them back on the path. The toast
             survives the navigation, so the explanation arrives with them. */
          hoopoe.react("error");
          toast.error("Your account is made. Sign in and we will pick up where you left off.");
          router.push(`/login?next=${encodeURIComponent("/welcome")}`);
        } else {
          // The biggest moment in the whole flow, so it gets the top tier
          // (owner, 2026-08-04: "another celebration after joining").
          // celebrate(3) over react("success")'s level 2: a 38px hop instead
          // of 24, nine particles instead of six, over 1.3s instead of 0.85.
          // peek() first so the wings come off the eyes before they are needed
          // for the celebration itself.
          succeeded.current = true;
          hoopoe.peek();
          hoopoe.celebrate(3);
          toast.success("Welcome to the jungle!");
          // 700ms navigated to the feed while the bird was still on its way UP,
          // so the one unrepeatable celebration in the product was never once
          // seen to completion. 1400ms covers the 1.3s hop. It is a beat longer
          // before the feed appears, on the single occasion in a member's life
          // when a beat is the right thing to spend.
          setTimeout(onSuccess, 1400);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      hoopoe.react("error");
      turnstileRef.current?.reset();
    } finally {
      /* NOT on the success path. The celebration runs for 1.3 seconds before
         the navigation, and re-enabling the button under it let a second click
         fire registerUser again -- which then failed on the unique email and
         painted an error over the one unrepeatable moment in the flow (audit
         Low 111). The button stays disabled until this page goes away. */
      if (!succeeded.current) setLoading(false);
    }
  }

  return (
    // `relative` anchors popLayout's absolutely-positioned exiting rows.
    <form onSubmit={handleSubmit} className="relative mt-5 space-y-3 text-left">
      {/* Who you are comes first, and the choice needs no caption: the two
          answers say it themselves. The fields it governs appear directly
          below it, so cause and effect share a sightline, and everything
          above the years row never moves when it flips. */}
      <input type="hidden" name="accountType" value={accountType} />
      <SegmentedPills
        ariaLabel="Alumnus or teacher"
        layoutId="signupAccountType"
        role="radiogroup"
        fill
        segments={ACCOUNT_TYPES.map((t) => ({ key: t.value, label: t.label }))}
        value={accountType}
        onChange={setAccountType}
        className="bg-mist"
      />

      {/* The years row never leaves: both kinds of member have a joined and a
          left year (a teacher's pair is their tenure, mapped server-side to
          taughtFrom/taughtUntil). Only Batch is a student fact, so flipping to
          Teacher removes that one cell and Joined/Left glide from a third of
          the row to half of it.

          z-10: every row here is a m.div, and a transformed sibling forms
          its own stacking context, so later rows painted OVER the InfoTip
          bubbles no matter their z-index (owner: "the i to explain batches
          goes behind the UI"). Lifting the whole years row wins against the
          z-auto siblings below it. */}
      <m.div
        layout
        transition={rowTransition}
        className={cn("relative z-10 grid gap-3", isAlum ? "grid-cols-3" : "grid-cols-2")}
      >
        <m.div layout transition={rowTransition}>
          <YearInput
            id="yearJoined"
            name="yearJoined"
            label="Joined"
            focusHint="2014"
            value={yearJoined}
            onValueChange={setYearJoined}
            required
          />
        </m.div>
        <m.div layout transition={rowTransition}>
          <YearInput
            id="yearLeft"
            name="yearLeft"
            label="Left"
            focusHint="2021"
            value={yearLeft}
            onValueChange={setYearLeft}
            required={isAlum}
            trailing={
              !isAlum ? (
                // The same circled-i the Batch cell carries, because the same
                // question needs answering: what do I put here? For a teacher
                // the answer is "maybe nothing", and blank has a meaning.
                <InfoTip label="Still at Rishi Valley?" fit>
                  {/* Each sentence is its own line ON PURPOSE: left to wrap
                      naturally in the w-64 bubble, the second sentence broke
                      after "this" and stranded "blank." alone on line two. */}
                  <span className="block">Still teaching at Rishi Valley?</span>
                  <span className="block">Leave this blank.</span>
                </InfoTip>
              ) : undefined
            }
          />
        </m.div>
        <AnimatePresence mode="popLayout" initial={false}>
          {isAlum && (
            <m.div
              key="batch"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...SPRINGS.snappy, ...rowTransition }}
            >
              <YearInput
                id="batchYear"
                name="batchYear"
                label="Batch"
                focusHint="2023"
                value={batchYear}
                onValueChange={setBatchYear}
                required={isAlum}
                trailing={
                  <InfoTip label="What does batch mean?">
                    Your batch is the year your class finished 12th grade at Rishi
                    Valley, even if you left earlier. Left after 10th in 2021? Your
                    batch is still 2023.
                  </InfoTip>
                }
              />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      <m.div layout transition={rowTransition} className="grid grid-cols-2 gap-3">
        <FloatField
          id="firstName"
          name="firstName"
          label="First name"
          autoComplete="given-name"
          required
          minLength={1}
          ref={firstNameFocusRef}
          onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 12))}
        />
        <FloatField
          id="lastName"
          name="lastName"
          label="Surname"
          autoComplete="family-name"
          required
          minLength={1}
          onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 12))}
        />
      </m.div>

      <m.div layout transition={rowTransition}>
        <FloatField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 26))}
        />
      </m.div>

      <m.div layout transition={rowTransition}>
        <PasswordField
          id="password"
          name="password"
          label="Password"
          minLength={MIN_PASSWORD}
          onChange={(v) => {
            // the bird follows what you type whether peeking or covered
            // (its head tracks behind the wings when its eyes are hidden)
            hoopoe.gaze(gazeFor(v.length, 16));
          }}
          onRevealChange={setShowPw}
        />
      </m.div>

      {/* Optional, never verified; the value the server reads. */}
      <input type="hidden" name="phone" value={phoneValue} />
      <m.div layout transition={rowTransition}>
        <PhoneField
          countryCode={countryCode}
          onCountryCode={setCountryCode}
          digits={phoneDigits}
          onDigits={setPhoneDigits}
        />
      </m.div>

      <AnimatePresence mode="popLayout" initial={false}>
        {error && (
          <m.p
            key="error"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ...SPRINGS.snappy, ...rowTransition }}
            className="text-sm text-destructive"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>

      {/* Invisible unless Cloudflare asks for an interaction; see
          turnstile-widget.tsx. */}
      <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />

      {/* The consent line (audit H12): one tick covering all three documents,
          which each open in a new tab so the half-filled form is never lost.
          `required` is the browser's nudge; the server refuses without it
          either way (see registerUser). A native checkbox: accent-color paints
          it canopy in every browser without inventing a control. */}
      <m.div layout transition={rowTransition}>
        <label className="flex cursor-pointer items-start gap-2.5 px-1 text-[13.5px] leading-snug text-muted-foreground">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-canopy outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
              terms of use
            </a>{" "}
            and{" "}
            <a href="/guidelines" target="_blank" rel="noopener" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
              community guidelines
            </a>
            , and I have read the{" "}
            <a href="/privacy" target="_blank" rel="noopener" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
              privacy policy
            </a>
            .
          </span>
        </label>
      </m.div>

      {/* 12 from the list + 4 here = 16 before the CTA, the same breath the
          trivia step gives its Check button, and one step up from the 12px
          field rhythm (the action is related to the fields, not one of them). */}
      <m.div layout transition={rowTransition} className="pt-1">
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Join"}
        </Button>
      </m.div>
    </form>
  );
}
