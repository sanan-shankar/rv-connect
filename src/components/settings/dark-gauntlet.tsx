"use client";

/* ------------------------------------------------------------------ *
 *  The dark mode gauntlet (owner, 2026-07-30): turning dark mode ON is
 *  a deliberately theatrical series of pages - "it's just difficult to
 *  turn it on" - while turning it OFF is one click in Appearance. The
 *  steps follow the owner's script: are-you-sure, experimental-feature,
 *  the liability waiver, the less-character confession, today's REAL
 *  Wordle answer (owner, 2026-07-31 - genuine homework by design), one
 *  final trial (keep still until the hoopoe falls asleep), and only
 *  then the toggle - whose flip pays off with the Nightfall scene. Any
 *  "No" along the way exits with visible relief.
 *
 *  Tone (rewritten 2026-09-21, owner: the first draft was "a bit
 *  cringe", whimsy in a put-on British register). Say the thing plainly
 *  and let the situation be the joke: the absurdity is that a settings
 *  toggle needs five questions, so the copy plays it straight. One dry
 *  line per step at most, no em dashes, every step still a real choice.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AnimatePresence,
  animate,
  m,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { SPRINGS } from "@/components/common/motion";
import { setThemePreference } from "@/components/settings/theme-actions";
import { Nightfall } from "./nightfall";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";

/* One line per escape hatch, indexed by the step it was taken from. The
   first is the owner's own; the fourth answers the trap question, where
   the member most likely pressed Stop on autopilot. */
const RELIEF_LINES = [
  "Thank goodness. Dark mode is really not ready yet.",
  "Good call. Everything in here was tested in the light.",
  "Fair. Nobody likes signing a waiver.",
  "You pressed Stop, so we stopped.",
  "Probably for the best.",
];

const WRONG_WORD_LINES = [
  "That's not it.",
  "Still not it.",
  "Have you actually done it today?",
];

type StepId =
  | "intro"
  | "sure"
  | "experimental"
  | "waiver"
  | "character"
  | "word"
  | "trial"
  | "regrets"
  | "relief";

export function DarkGauntlet({ word }: { word: string }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [step, setStep] = useState<StepId>("intro");
  const [reliefLine, setReliefLine] = useState(RELIEF_LINES[0]);
  const [wordGuess, setWordGuess] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [nightfall, setNightfall] = useState(false);

  function bail(stepIndex: number) {
    setReliefLine(RELIEF_LINES[stepIndex % RELIEF_LINES.length]);
    setStep("relief");
  }

  function submitWord() {
    if (wordGuess.trim().toLowerCase() === word.toLowerCase()) {
      setStep("trial");
    } else {
      setWrongCount((c) => c + 1);
      toast.error(WRONG_WORD_LINES[Math.min(wrongCount, WRONG_WORD_LINES.length - 1)]);
    }
  }

  function commitDark() {
    // CLIENT-ONLY at this point, deliberately: next-themes flips the class
    // (and its localStorage) with no server roundtrip. Setting the cookie via
    // the server action here would re-render this route mid-ceremony, and the
    // page's own gate would swap the gauntlet out for the exit page before
    // the regrets step could show (seen live). Persistence happens when the
    // regrets question is ANSWERED below; abandoning the tab mid-regrets
    // leaves only the localStorage flip, which the next completed toggle
    // heals.
    setTheme("dark");
  }

  async function keepDark() {
    // callAction: a rejected save must not strand the ceremony here with an
    // unhandled rejection and no way onward -- the preference not persisting
    // is a minor annoyance, but the toast plus moving on is honest about it.
    const result = await callAction(() => setThemePreference("dark"));
    if (result?.error) toast.error(result.error);
    router.push("/feed");
  }

  function revertLight() {
    // Nothing was persisted at dusk, so going back is purely client-side too.
    setTheme("light");
    setReliefLine("Back to normal. We won't mention it.");
    setStep("relief");
  }

  const stepMotion = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: SPRINGS.gentle },
    exit: { opacity: 0, y: -12, transition: { duration: 0.16 } },
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col justify-center py-8">
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <m.div key="intro" {...stepMotion} className="space-y-5 text-center">
            <StepKicker>Appearance</StepKicker>
            <h1 className="font-heading text-[32px] leading-tight tracking-[-0.02em] text-foreground">
              Dark mode
            </h1>
            <p className="mx-auto max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">
              It works. We just like the app better in the light, so there are
              a few questions first.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>
              <Button variant="primary" onClick={() => setStep("sure")}>
                Start
              </Button>
            </div>
          </m.div>
        )}

        {step === "sure" && (
          <GauntletStep
            key="sure"
            motionProps={stepMotion}
            kicker="Question 1 of 5"
            title="Are you sure you want dark mode?"
            yes="Yes, I'm sure"
            no="No"
            onYes={() => setStep("experimental")}
            onNo={() => bail(0)}
          />
        )}

        {step === "experimental" && (
          <GauntletStep
            key="experimental"
            motionProps={stepMotion}
            kicker="Question 2 of 5"
            title="Dark mode is still experimental. Do you really need an experimental feature today?"
            yes="I do"
            no="Probably not"
            onYes={() => setStep("waiver")}
            onNo={() => bail(1)}
          />
        )}

        {step === "waiver" && (
          <GauntletStep
            key="waiver"
            motionProps={stepMotion}
            kicker="Question 3 of 5"
            title="If something looks wrong in dark mode, that's on you."
            body="Text you can't read, a button you can't find, that sort of thing. You agree not to complain about any of it."
            yes="Agreed"
            no="I'd like to complain"
            onYes={() => setStep("character")}
            onNo={() => bail(2)}
          />
        )}

        {step === "character" && (
          <GauntletStep
            key="character"
            motionProps={stepMotion}
            kicker="Question 4 of 5"
            title="The app has a lot less character in the dark. Are you OK with that?"
            yes="Continue"
            no="Stop"
            // THE TRAP (owner, 2026-08-04). Three questions have trained the
            // hand that the green pill on the right means "keep going". Here
            // that pill is Stop, and the way onward is the quiet outline
            // button. Answering on autopilot ends the run and you begin again
            // from the first question, which is the entire point: one more
            // reason not to go through with this.
            swap
            onYes={() => setStep("word")}
            onNo={() => bail(3)}
          />
        )}

        {step === "word" && (
          <m.div key="word" {...stepMotion} className="space-y-5 text-center">
            <StepKicker>Question 5 of 5</StepKicker>
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              What&apos;s today&apos;s Wordle answer?
            </h2>
            {/* The real one, from the New York Times, fetched server-side
                (owner, 2026-07-31). This is genuine homework by design: if
                you have not solved it, the dark can wait while you do. */}
            <p className="mx-auto max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
              The real one, from today. If you haven&apos;t done it yet, go and do
              it. This page will still be here.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitWord();
              }}
              className="mx-auto flex max-w-[300px] items-center gap-2"
            >
              <Input
                value={wordGuess}
                onChange={(e) => setWordGuess(e.target.value)}
                placeholder="Five letters"
                maxLength={5}
                aria-label="Today's Wordle answer"
                autoFocus
              />
              <Button type="submit" variant="primary" disabled={!wordGuess.trim()}>
                Check
              </Button>
            </form>
            <BailLink onClick={() => bail(4)} />
          </m.div>
        )}

        {step === "trial" && (
          <SleepTrial
            key="trial"
            motionProps={stepMotion}
            onFlip={() => setNightfall(true)}
            onBail={() => bail(4)}
          />
        )}

        {step === "regrets" && (
          <m.div key="regrets" {...stepMotion} className="space-y-5 text-center">
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              This is dark mode.
            </h2>
            <p className="mx-auto max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Have a look around. If you don&apos;t like it, one press puts
              everything back.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={revertLight}>
                Put it back
              </Button>
              <Button variant="primary" onClick={keepDark}>
                Keep it
              </Button>
            </div>
          </m.div>
        )}

        {step === "relief" && (
          <m.div key="relief" {...stepMotion} className="space-y-5 text-center">
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              {reliefLine}
            </h2>
            <div className="flex justify-center pt-2">
              <Link
                href="/feed"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {nightfall && (
        <Nightfall
          onDusk={commitDark}
          onDone={() => {
            setNightfall(false);
            setStep("regrets");
          }}
        />
      )}
    </div>
  );
}

function StepKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function BailLink({ onClick, label = "Never mind" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto block rounded-sm text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {label}
    </button>
  );
}

function GauntletStep({
  motionProps,
  kicker,
  title,
  body,
  yes,
  no,
  swap = false,
  onYes,
  onNo,
}: {
  motionProps: Record<string, unknown>;
  kicker: string;
  title: string;
  body?: string;
  yes: string;
  no: string;
  /**
   * Hands the canopy fill to the NO action while leaving both buttons where
   * they were. Position is what the hand has learned over the earlier
   * questions, so moving the pill would give the swap away; only the label
   * and what it does change underneath it.
   */
  swap?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  const left = swap ? { label: yes, onClick: onYes } : { label: no, onClick: onNo };
  const right = swap ? { label: no, onClick: onNo } : { label: yes, onClick: onYes };
  return (
    <m.div {...motionProps} className="space-y-5 text-center">
      <StepKicker>{kicker}</StepKicker>
      <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {body && (
        <p className="mx-auto max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      <div className="flex justify-center gap-2 pt-2">
        <Button variant="outline" onClick={left.onClick}>
          {left.label}
        </Button>
        <Button variant="primary" onClick={right.onClick}>
          {right.label}
        </Button>
      </div>
    </m.div>
  );
}


/* The final trial (rebuilt 2026-09-21; it was a five second press-and-hold,
 * which on a phone also selects text and asked nothing of the screen). The
 * hoopoe is a day bird, so it has to be asleep before the lights go out,
 * and the only way to get it there is to do nothing at all for STILL_MS.
 * As it drifts off, a dark veil closes in on the whole screen around it,
 * sidebar included, so the room itself is getting sleepy. Any movement
 * (pointer, touch, key, scroll) startles it and the veil snaps back open.
 * Once it is out, the veil holds and the switch appears under the bird.
 *
 * `drowse` runs 0 -> 1; the veil's opacity and the copy's fade both read
 * it, so the only things animating are opacity values. */
const STILL_MS = 7000;
/* How long the page has to be quiet after a stir before drowsing resumes.
   Without it a slowly drifting cursor restarts the clock every frame and
   the veil flickers at 1%. */
const SETTLE_MS = 700;
/* A hand resting on a mouse or trackpad twitches a few pixels. Movement
   only counts once this many pixels add up inside one settle window. */
const STIR_PX = 24;
/* Scene ink, the same as Nightfall's dusk sky: fixed art, not a token,
   so the veil reads the same whatever the theme underneath. */
const VEIL = "19,26,23";

function SleepTrial({
  motionProps,
  onFlip,
  onBail,
}: {
  motionProps: Record<string, unknown>;
  onFlip: () => void;
  onBail: () => void;
}) {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const [asleep, setAsleep] = useState(false);
  const [stirred, setStirred] = useState(false);
  const [centre, setCentre] = useState<{ x: number; y: number } | null>(null);
  const birdRef = useRef<HTMLDivElement>(null);
  const drowse = useMotionValue(0);
  const veilOpacity = useTransform(drowse, [0, 1], [0, 1]);
  const copyOpacity = useTransform(drowse, [0, 1], [1, 0.3]);

  // Refs, not state: the listeners below are bound once and read these live.
  const asleepRef = useRef(false);
  const sleepyRef = useRef(false);
  const run = useRef<AnimationPlaybackControls | null>(null);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const travelled = useRef(0);

  // The bird turns sleepy-eyed a little under halfway, so the member can
  // see it working before the veil gets heavy.
  useMotionValueEvent(drowse, "change", (v) => {
    if (v > 0.4 && !sleepyRef.current && !asleepRef.current) {
      sleepyRef.current = true;
      void hoopoe.express("sleepy");
    }
  });

  useEffect(() => {
    const measure = () => {
      const r = birdRef.current?.getBoundingClientRect();
      if (r) setCentre({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };

    const fallAsleep = async () => {
      asleepRef.current = true;
      setStirred(false);
      setAsleep(true);
      // The veil stays down while it sleeps: the switch sits in the one
      // pool of light left, and Nightfall rises over it from there.
      await hoopoe.sleep();
    };

    const drift = () => {
      run.current = animate(drowse, 1, {
        duration: ((1 - drowse.get()) * STILL_MS) / 1000,
        ease: "linear",
        onComplete: () => void fallAsleep(),
      });
    };

    const stir = () => {
      if (asleepRef.current) return;
      travelled.current = 0;
      run.current?.stop();
      if (resume.current) clearTimeout(resume.current);
      resume.current = setTimeout(drift, SETTLE_MS);
      measure();
      // Only a bird that had started to nod off notices being woken.
      if (drowse.get() < 0.1) {
        drowse.set(0);
        return;
      }
      setStirred(true);
      run.current = animate(drowse, 0, { duration: 0.35, ease: "easeOut" });
      sleepyRef.current = false;
      void hoopoe.express("surprise", { hold: 380 }).then(() => hoopoe.express("content"));
    };

    const onMove = (e: PointerEvent) => {
      travelled.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (travelled.current > STIR_PX) stir();
    };

    measure();
    resume.current = setTimeout(drift, SETTLE_MS);
    const drain = setInterval(() => (travelled.current = 0), SETTLE_MS);
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((t) => window.addEventListener(t, stir, { passive: true }));
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      events.forEach((t) => window.removeEventListener(t, stir));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", measure);
      clearInterval(drain);
      if (resume.current) clearTimeout(resume.current);
      run.current?.stop();
    };
    // hoopoe and drowse are stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <m.div {...motionProps} className="space-y-5 text-center">
      <AnimatePresence mode="wait" initial={false}>
        {asleep ? (
          <m.div
            key="asleep"
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.6 } }}
          >
            <StepKicker>That&apos;s everything</StepKicker>
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              Here&apos;s the switch.
            </h2>
            <p className="mx-auto max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Try not to wake the bird.
            </p>
          </m.div>
        ) : (
          <m.div
            key="settling"
            className="space-y-5"
            style={{ opacity: copyOpacity }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <StepKicker>Last one</StepKicker>
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              The hoopoe has to be asleep first.
            </h2>
            <p className="mx-auto max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
              It&apos;s a day bird. Keep still and it&apos;ll nod off.
            </p>
          </m.div>
        )}
      </AnimatePresence>

      <div ref={birdRef} className="grid h-[128px] place-items-center">
        <Hoopoe ref={hoopoeRef} size={102} idle />
      </div>

      {/* One fixed-height line for what just happened, so the switch below
          never jumps when it changes. */}
      <p aria-live="polite" className="h-5 text-[13px] text-muted-foreground">
        {stirred && !asleep ? "It heard that." : ""}
      </p>

      <div className="grid h-12 place-items-center">
        {asleep && (
          <m.button
            type="button"
            aria-label="Turn on dark mode"
            onClick={() => {
              // The veil is portalled to <body>, so it stacks above
              // Nightfall. It clears over the scene's own 0.5s fade-in, and
              // the sunset plays exactly as it did before this step existed.
              animate(drowse, 0, { duration: 0.5, ease: "easeOut" });
              onFlip();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.9 } }}
            // The track keeps its bg-secondary rest fill; state-layer tints
            // it on hover. hover:bg-accent used to swap secondary for accent,
            // a 1-rung move the eye could not find on this dim page.
            className="group relative block h-12 w-[92px] rounded-full border border-border bg-secondary state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <m.span
              className="absolute left-1 top-1 grid h-10 w-10 place-items-center rounded-full bg-canopy text-white shadow-[0_1px_2px_rgba(30,28,22,0.2)]"
              whileTap={{ scale: 0.94 }}
              transition={SPRINGS.snappy}
            >
              ☾
            </m.span>
          </m.button>
        )}
      </div>

      <BailLink onClick={onBail} label={asleep ? "Actually, never mind" : "Leave it awake"} />

      {/* Portalled: the step's own m.div carries a transform, and a
          transformed ancestor would pin a `fixed` child to itself instead
          of the viewport. */}
      {centre &&
        createPortal(
          <m.div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[70]"
            style={{
              opacity: veilOpacity,
              background: `radial-gradient(circle at ${centre.x}px ${centre.y}px, rgba(${VEIL},0) 0, rgba(${VEIL},0) 90px, rgba(${VEIL},0.55) 240px, rgba(${VEIL},0.94) 70vmax)`,
            }}
          />,
          document.body,
        )}
    </m.div>
  );
}
