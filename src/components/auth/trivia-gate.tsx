"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";
import { getTriviaQuestion, checkTrivia } from "./trivia-actions";

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

  useEffect(() => {
    getTriviaQuestion().then(setQuestion);
  }, []);

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
      <p className="mb-4 min-h-[1.75rem] text-center font-heading text-lg text-foreground">
        {question?.question ?? "..."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Your answer..."
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            // the bird watches what you type, sweeping its gaze across the field
            hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 18) * 2 - 1)));
          }}
          onFocus={() => {
            if (programmaticFocus.current) {
              programmaticFocus.current = false;
              return;
            }
            if (!passed) hoopoe.express("curious");
          }}
          ref={answerFocusRef}
          className="text-center"
        />
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          variant="primary"
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
