"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SPRINGS } from "@/components/common/motion";
import { FIELD_SHELL } from "@/components/common/float-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callAction } from "@/lib/call-action";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { getTriviaQuestion, checkTrivia } from "./trivia-actions";
import { gazeFor } from "@/components/mascot/use-hoopoe";

/**
 * Ties the last two words together with a non-breaking space, so no line of a
 * question can ever hold a single word. `text-balance` evens the lines out but
 * does not promise this; the glue does, at any width and any question length.
 */
function noOrphan(text: string): string {
  return text.replace(/\s+(\S+)$/, "\u00a0$1");
}

export function TriviaGate({
  hoopoe,
  onPass,
}: {
  hoopoe: HoopoeApi;
  onPass: () => void;
}) {
  // The question (and its answer) live on the server. We fetch only the prompt
  // after mount so the answer never ships to the browser, and the answer is
  // checked server-side.
  const [question, setQuestion] = useState<{ id: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [passed, setPassed] = useState(false);
  // Focus after paint, not via `autoFocus`: this gate mounts while the signup
  // hoopoe is mid-flight, and autoFocus's in-commit focus() forced a layout
  // that stalled the bird for a couple of frames. See use-deferred-autofocus.ts.
  const answerFocusRef = useDeferredAutofocus<HTMLInputElement>();
  // The curious look on focus is for a PERSON focusing the field. The deferred
  // autofocus above also fires onFocus, ~2 frames after mount — late enough
  // that the rig is live, so without this guard it enqueued express("curious")
  // AHEAD of the mobile fly-in, which then warped the bird off-screen only
  // after the reveal had already shown it seated (caught by
  // hoopoe-landing-check: first visible frame mid-viewport instead of above
  // it). The old in-commit autoFocus never had the problem only because the
  // rig was not yet ready to hear the call. Swallow exactly that first,
  // programmatic focus; every later one is a real visitor.
  const programmaticFocus = useRef(true);
  // A swap that changes the number of lines used to shunt the answer field and
  // the button down (or up) in one frame, which read as the page flinching.
  // The question block's height is animated instead: measure the natural
  // height of the text, animate the wrapper to it, and everything below rides
  // the same spring the words do.
  const questionRef = useRef<HTMLDivElement>(null);
  const [questionHeight, setQuestionHeight] = useState<number | "auto">("auto");
  useEffect(() => {
    const el = questionRef.current;
    if (!el) return;
    // ResizeObserver rather than an effect on `question`: the height also
    // moves when the window is resized or the font finally loads, and neither
    // of those is a state change here.
    const observer = new ResizeObserver(() => setQuestionHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // callAction: a rejected fetch (deploy skew, dropped network) used to be
    // an unhandled rejection with `question` left null forever, so the gate
    // sat on "..." with a permanently-disabled submit and no way out
    // (audit B-042).
    callAction(() => getTriviaQuestion()).then((q) => {
      if ("error" in q) {
        toast.error(q.error);
        return;
      }
      setQuestion(q);
    });
  }, []);

  // Counts swaps so the arrow icon rolls half a turn per press (see below);
  // an accumulating angle means it always turns the same way, never snaps back.
  const [swaps, setSwaps] = useState(0);

  async function swapQuestion() {
    if (!question || checking || passed) return;
    setError("");
    setAnswer("");
    setSwaps((n) => n + 1);
    // The bird tilts its head at the new question rather than reacting as if
    // something went wrong: asking for another question is a normal move.
    hoopoe.express("curious");
    const q = await callAction(() => getTriviaQuestion(question.id));
    if ("error" in q) {
      toast.error(q.error);
      return;
    }
    setQuestion(q);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || checking || passed) return;
    setChecking(true);
    setError("");
    // the hoopoe looks up and ponders while the server checks
    hoopoe.react("thinking");
    try {
      const res = await checkTrivia(question.id, answer);
      if (res.ok) {
        // A real celebration, not the nod it used to be (owner, 2026-08-04:
        // "a celebration when you answer correctly"). celebrate(2) is the
        // middle tier: happy eyes, a 24px hop, both wings thrown open twice,
        // the tail and crest springing, and six particles. Level 3 is held
        // back for actually joining, so the two moments escalate.
        setPassed(true);
        setChecking(false);
        hoopoe.celebrate(2);
        // 720ms cut the hop off at its apex. The bird is hoisted at the page
        // level and never unmounts across the step swap, so the celebration
        // does carry over -- but the form sliding in on top of it stole the
        // moment. 1150ms lets the hop land first; the bird is still settling
        // as the form arrives, which is the handover this always wanted.
        setTimeout(onPass, 1150);
        return;
      }
      // a wrong answer: the hoopoe shakes its head and looks worried
      setError(res.error ?? "Not quite. Have another go.");
      hoopoe.react("wrong");
      setChecking(false);
    } catch {
      setError("Something went wrong. Please try again.");
      hoopoe.react("error");
      setChecking(false);
    }
  }

  return (
    <div>
      {/* The swap sits INSIDE the question line as a small circular-arrow
          beside the words (owner, 2026-08-20: the underlined text line read
          as clutter). A whole extra line of UI was more furniture than the
          feature; a quiet glyph the eye finds only when it goes looking is
          the right weight. The icon rolls half a turn per press — transform
          only — so the press visibly "turns the question over" while nothing
          else on the line moves. */}
      {/* text-balance so a wrapped question splits into even lines instead of
          dropping its tail onto a line of its own. */}
      {/* mt-4 + the inner py-1 is the same 20px the register step puts between
          its title and form; mb-3 + py-1 is the same 16px below. The padding
          is not decoration: overflow-hidden is what stops the
          taller question from spilling over the answer field mid-grow, and
          without the padding it would crop the swap button's focus ring. */}
      <m.div
        className="mt-4 mb-3 overflow-hidden"
        animate={{ height: questionHeight }}
        transition={SPRINGS.snappy}
        initial={false}
      >
        <div ref={questionRef} className="py-1">
          <p className="min-h-[1.75rem] text-center font-heading text-lg text-balance text-foreground">
            {/* One breath per swap (owner, 2026-08-20: "short and sweet, not
                exaggerated"): the outgoing words drift up and fade as the new
                ones rise in — opacity and a 5px translate on the snappy spring,
                nothing slower. popLayout lifts the leaving text out of flow so
                the incoming line does not wait for it. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={question?.id ?? "loading"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={SPRINGS.snappy}
                className="inline-block max-w-full"
              >
                {question ? noOrphan(question.question) : "..."}
                {/* The arrow lives INSIDE the text box, glued to the last word by
                    a non-breaking space. As a sibling of the box it was pushed
                    onto a line of its own the moment a question wrapped: an
                    inline-block that has to wrap takes the full width, leaving
                    the arrow nowhere to sit. Inside, it simply rides the last
                    line and hugs the question mark at every width. The 1px
                    optical nudge is on the button, whose transform nothing else
                    animates. */}
                {question && (
                  <>
                    {"\u00a0"}
                    <button
                      type="button"
                      onClick={swapQuestion}
                      disabled={checking || passed}
                      aria-label="Try a different question"
                      title="Try a different question"
                      className="inline-flex -translate-y-px align-middle rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
                    >
                      <RefreshCw
                        aria-hidden
                        className="size-4 transition-transform duration-500 ease-out"
                        style={{ transform: `rotate(${swaps * 180}deg)` }}
                      />
                    </button>
                  </>
                )}
              </m.span>
            </AnimatePresence>
          </p>
        </div>
      </m.div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* The same calm material as the register step's FloatFields (56px
            mist, no hairline), built as a plain input on the shared shell
            rather than overriding ui/Input: stacking border-none over its
            baked-in border renders right but is one careless edit from a
            hairline coming back, and its md:text-sm would undo the 16px
            no-iOS-zoom guarantee. The question above is this box's label; the
            placeholder stays because centred text with no label needs the
            invitation. */}
        <input
          placeholder="Your answer..."
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            // the bird watches what you type, sweeping its gaze across the field
            hoopoe.gaze(gazeFor(e.target.value.length, 18));
          }}
          onFocus={() => {
            if (programmaticFocus.current) {
              programmaticFocus.current = false;
              return;
            }
            if (!passed) hoopoe.express("curious");
          }}
          ref={answerFocusRef}
          className={cn(
            FIELD_SHELL,
            // No focus ring, same owner call as FloatField: the caret is the
            // focus state on a text box.
            "px-4 text-center text-base text-foreground outline-none",
            "placeholder:text-muted-foreground",
            "autofill:[-webkit-box-shadow:0_0_0_1000px_var(--color-mist)_inset] autofill:[-webkit-text-fill-color:var(--color-foreground)]"
          )}
        />
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!question || checking || passed}
        >
          {checking ? "Checking..." : "Check"}
        </Button>
      </form>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/login"
          className="rounded-sm text-leaf underline hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
