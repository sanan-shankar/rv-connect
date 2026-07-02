"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTriviaQuestion, checkTrivia } from "./trivia-actions";

function BlinkingOwl() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      className="mx-auto mb-4"
      aria-hidden="true"
    >
      <style>
        {`
          @keyframes blink {
            0%, 90%, 100% { ry: 5; }
            95% { ry: 0.5; }
          }
          .owl-eye { animation: blink 5s infinite; }
        `}
      </style>
      {/* Body */}
      <ellipse cx="32" cy="38" rx="18" ry="20" fill="#8B6F47" />
      {/* Head */}
      <circle cx="32" cy="22" r="14" fill="#A68B5B" />
      {/* Ears */}
      <polygon points="20,12 18,2 26,10" fill="#8B6F47" />
      <polygon points="44,12 46,2 38,10" fill="#8B6F47" />
      {/* Eye whites */}
      <circle cx="26" cy="22" r="6" fill="#FAF7F2" />
      <circle cx="38" cy="22" r="6" fill="#FAF7F2" />
      {/* Pupils */}
      <ellipse cx="26" cy="22" rx="3" ry="5" fill="#2C2C2C" className="owl-eye" />
      <ellipse cx="38" cy="22" rx="3" ry="5" fill="#2C2C2C" className="owl-eye" />
      {/* Beak */}
      <polygon points="32,26 29,30 35,30" fill="#C4A76C" />
      {/* Belly */}
      <ellipse cx="32" cy="44" rx="10" ry="12" fill="#C4A76C" opacity="0.5" />
      {/* Feet */}
      <ellipse cx="26" cy="57" rx="5" ry="2" fill="#8B6F47" />
      <ellipse cx="38" cy="57" rx="5" ry="2" fill="#8B6F47" />
    </svg>
  );
}

export function TriviaGate({ onPass }: { onPass: () => void }) {
  // The question (and its answer) live on the server. We fetch only the prompt
  // after mount so the answer never ships to the browser, and the answer is
  // checked server-side.
  const [question, setQuestion] = useState<{ id: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getTriviaQuestion().then(setQuestion);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await checkTrivia(question.id, answer);
      if (res.ok) {
        onPass();
        return;
      }
      setError(res.error ?? "Not quite. Have another go.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className="transition-transform"
      style={
        shake
          ? {
              animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
            }
          : undefined
      }
    >
      <style>
        {`
          @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
          }
        `}
      </style>
      <BlinkingOwl />
      <p className="mb-4 min-h-[1.75rem] text-center font-heading text-lg text-foreground">
        {question?.question ?? "..."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
          className="text-center"
        />
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!question || checking}
        >
          {checking ? "Checking..." : "Check"}
        </Button>
      </form>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="rounded-sm text-leaf underline hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          Sign in
        </a>
      </p>
    </div>
  );
}
