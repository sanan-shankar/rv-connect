"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
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
        // a happy nod + crest flick, then hand off to the register step while the
        // mood is still settling so the same bird carries you into the form.
        setPassed(true);
        setChecking(false);
        hoopoe.react("correct");
        setTimeout(onPass, 720);
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
            if (!passed) hoopoe.express("curious");
          }}
          autoFocus
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
