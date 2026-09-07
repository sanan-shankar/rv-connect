"use client";

/* ------------------------------------------------------------------ *
 *  The dark mode gauntlet (owner, 2026-07-30): turning dark mode ON is
 *  a deliberately theatrical series of pages - "it's just difficult to
 *  turn it on" - while turning it OFF is one click in Appearance. The
 *  steps follow the owner's script: are-you-sure, experimental-feature,
 *  the liability waiver, the less-character confession, today's REAL
 *  Wordle answer (owner, 2026-07-31 - genuine homework by design), one
 *  final trial (the hoopoe judges a five second hold), and only then
 *  the toggle - whose flip pays off with the Nightfall scene. Any "No"
 *  along the way exits with visible relief.
 *
 *  Tone rules: funny but never mean, no em dashes, every step still a
 *  real choice.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, m } from "motion/react";
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

/* One relieved line per escape hatch, cycled by step so repeat visitors
   read something new. The first is the owner's own line. */
const RELIEF_LINES = [
  "Thank goodness. Dark mode is really not ready yet.",
  "Wise. The valley looks better in daylight anyway.",
  "A close call. The cream lives another day.",
  "Good decision. We were a little worried for a second.",
  "The hoopoe exhales. Everyone exhales.",
];

const WRONG_WORD_LINES = [
  "That is not it. The Wordle disagrees with you.",
  "Close, possibly. Wrong, definitely.",
  "Have you actually played it today? Be honest.",
];

/* The five second trial. Long enough to feel like a commitment, short
   enough that nobody actually suffers; the hoopoe cannot bear to watch. */
const HOLD_MS = 5000;

type StepId =
  | "intro"
  | "sure"
  | "experimental"
  | "waiver"
  | "character"
  | "word"
  | "trial"
  | "toggle"
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
    setReliefLine("Undone. Like it never happened. The cream missed you.");
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
              It exists. It is technically real. Whether it should be turned on
              is a question the next few pages exist to answer.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>
              <Button variant="primary" onClick={() => setStep("sure")}>
                Begin
              </Button>
            </div>
          </m.div>
        )}

        {step === "sure" && (
          <GauntletStep
            key="sure"
            motionProps={stepMotion}
            kicker="Question 1 of 5"
            title="Are you absolutely sure you want to turn on dark mode?"
            yes="Yes, absolutely"
            no="No, take me back"
            onYes={() => setStep("experimental")}
            onNo={() => bail(0)}
          />
        )}

        {step === "experimental" && (
          <GauntletStep
            key="experimental"
            motionProps={stepMotion}
            kicker="Question 2 of 5"
            title="Dark mode is an experimental feature. Do we really need experimental features at this point?"
            body="Things here are calm. Stable. Pleasantly beige."
            yes="We do. Keep going"
            no="You make a good point"
            onYes={() => setStep("waiver")}
            onNo={() => bail(1)}
          />
        )}

        {step === "waiver" && (
          <GauntletStep
            key="waiver"
            motionProps={stepMotion}
            kicker="Question 3 of 5"
            title="If anything goes wrong in there, you cannot blame us."
            body="Elements invisible. Things cut off. The UI worse in ways science cannot measure. Do you agree to blame absolutely no one?"
            yes="I agree. I blame no one"
            no="I would prefer someone to blame"
            onYes={() => setStep("character")}
            onNo={() => bail(2)}
          />
        )}

        {step === "character" && (
          <GauntletStep
            key="character"
            motionProps={stepMotion}
            kicker="Question 4 of 5"
            title="The UI is a lot less fun and has a lot less character in dark. Do you accept a life with less character?"
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
              What is today&apos;s Wordle answer?
            </h2>
            {/* The real one, from the New York Times, fetched server-side
                (owner, 2026-07-31). This is genuine homework by design: if
                you have not solved it, the dark can wait while you do. */}
            <p className="mx-auto max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Yes, that Wordle. The real one, today&apos;s. If you have not done
              it yet, go do it. We will wait right here.
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
                Answer
              </Button>
            </form>
            <BailLink onClick={() => bail(4)} />
          </m.div>
        )}

        {step === "trial" && (
          <HoopoeTrial
            key="trial"
            motionProps={stepMotion}
            onPass={() => setStep("toggle")}
            onBail={() => bail(4)}
          />
        )}

        {step === "toggle" && (
          <m.div key="toggle" {...stepMotion} className="space-y-6 text-center">
            <StepKicker>You have earned this</StepKicker>
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              Here is your toggle.
            </h2>
            <p className="mx-auto max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Flip it and the sun goes down on the valley. Take a breath first.
            </p>
            {/* THE toggle: a plain, honest switch at last. Flipping it starts
                Nightfall; the theme itself changes mid-scene so the swap is
                never seen raw. */}
            <button
              type="button"
              aria-label="Turn on dark mode"
              onClick={() => setNightfall(true)}
              // The track keeps its bg-secondary rest fill; state-layer tints
              // it on hover. hover:bg-accent used to swap secondary for accent,
              // a 1-rung move the eye could not find on this dim page.
              className="group relative mx-auto block h-12 w-[92px] rounded-full border border-border bg-secondary state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <m.span
                className="absolute left-1 top-1 grid h-10 w-10 place-items-center rounded-full bg-canopy text-white shadow-[0_1px_2px_rgba(30,28,22,0.2)]"
                whileTap={{ scale: 0.94 }}
                transition={SPRINGS.snappy}
              >
                ☾
              </m.span>
            </button>
            <BailLink onClick={() => bail(4)} label="Actually, never mind" />
          </m.div>
        )}

        {step === "regrets" && (
          <m.div key="regrets" {...stepMotion} className="space-y-5 text-center">
            <StepKicker>One last thing</StepKicker>
            <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
              This is the valley after dark.
            </h2>
            <p className="mx-auto max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Look around. Sit with it. If it is not for you, one press takes
              you home and we never speak of this again.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={revertLight}>
                Take me back
              </Button>
              <Button variant="primary" onClick={keepDark}>
                No regrets
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

function BailLink({ onClick, label = "No, take me back" }: { onClick: () => void; label?: string }) {
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

/* The final trial: hold the button for five seconds while the hoopoe, who
 * cannot bear to watch, covers its eyes. Let go early and it peeks out and
 * shakes its head; hold to the end and it celebrates in spite of itself.
 * The progress indicator is a canopy disc SCALING up behind the button
 * (pure transform, per the motion rules), reaching full size exactly at
 * HOLD_MS. */
function HoopoeTrial({
  motionProps,
  onPass,
  onBail,
}: {
  motionProps: Record<string, unknown>;
  onPass: () => void;
  onBail: () => void;
}) {
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const [holding, setHolding] = useState(false);
  const [passed, setPassed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function startHold() {
    if (passed) return;
    setHolding(true);
    hoopoe.coverEyes();
    timerRef.current = setTimeout(async () => {
      setPassed(true);
      setHolding(false);
      hoopoe.peek();
      await hoopoe.celebrate();
      onPass();
    }, HOLD_MS);
  }

  function endHold() {
    if (passed || !holding) return;
    setHolding(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    hoopoe.peek();
    void hoopoe.shake();
  }

  return (
    <m.div {...motionProps} className="space-y-5 text-center">
      <StepKicker>The final trial</StepKicker>
      <h2 className="font-heading text-lede leading-tight tracking-[-0.02em] text-foreground">
        Hold the button for five seconds while the hoopoe considers your decision.
      </h2>
      <p className="mx-auto max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
        It cannot bear to watch. If you let go, it starts again.
      </p>
      <div className="grid h-[128px] place-items-center">
        <Hoopoe ref={hoopoeRef} size={102} idle />
      </div>
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        {/* The five second fill: scales 0 to 1 behind the button. Resets by
            snapping to 0 (a failed trial should feel like a reset, not a
            rewind). */}
        <m.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-canopy/20"
          initial={false}
          animate={holding ? { scale: 1 } : { scale: 0 }}
          transition={holding ? { duration: HOLD_MS / 1000, ease: "linear" } : { duration: 0 }}
        />
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") startHold();
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") endHold();
          }}
          disabled={passed}
          // state-layer, not hover:bg-accent: this button sits on bg-card and
          // the accent swap was +2.06 dL*, invisible on the one control the
          // whole step asks you to find.
          className="relative z-10 h-16 w-16 rounded-full border border-canopy/40 bg-card text-[12px] font-bold uppercase tracking-[0.08em] text-canopy state-layer active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {passed ? "Held" : "Hold"}
        </button>
      </div>
      <BailLink onClick={onBail} label="I cannot take the pressure" />
    </m.div>
  );
}
