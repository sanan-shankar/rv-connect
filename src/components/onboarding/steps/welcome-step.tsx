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
      {/* Same opaque bg-card surface every other step uses (register, houses,
          photo). This step and Done are the only two bare enough that the
          shared AppShell valley-tree background behind the sidebar (always
          on, see app-shell.tsx) would otherwise show straight through empty
          space and wash out the copy. A real legibility problem, not
          something the mascot's own celebration was ever actually causing. */}
      <div className="space-y-[var(--space-xs)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
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
