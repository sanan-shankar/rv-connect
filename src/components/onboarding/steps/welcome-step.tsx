"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Step 1: Welcome. The one-liner about the place, greeting by first name.
 * The hoopoe's own post-signup welcome moment plays independently (mounted
 * by the server page, see onboarding/page.tsx) — this step does not touch
 * the mascot at all, so there is never a second bird on screen.
 */
export function WelcomeStep({ name, onNext }: { name: string; onNext: () => void }) {
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-[var(--space-l)] text-center">
      <div className="space-y-[var(--space-xs)]">
        <h1 className="font-heading text-[28px] leading-tight tracking-[-0.02em] text-foreground">
          Welcome, {firstName}.
        </h1>
        <p className="mx-auto max-w-[34ch] text-[16px] leading-relaxed text-muted-foreground">
          Let&apos;s get your page ready so old friends can find you. A few
          quick steps, and you can skip any of them.
        </p>
      </div>
      <Button type="button" variant="primary" size="lg" className="w-full" onClick={onNext}>
        Let&apos;s go
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
