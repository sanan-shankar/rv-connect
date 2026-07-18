"use client";

import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Step 5: Done. A warm send-off into the feed. No auto-redirect timer, the
 * person leaves this page on their own click.
 */
export function DoneStep({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-[var(--space-l)] text-center">
      {/* Same opaque bg-card surface every other step uses (see welcome-step.tsx's
          comment). This is also where the post-signup celebration hoopoe
          actually plays (see onboarding-flow.tsx), so it doubles as the one
          moment that needs to read clean against the mascot mid-flight. */}
      <div className="space-y-[var(--space-l)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-canopy/10 text-canopy"
          aria-hidden
        >
          <PartyPopper className="h-7 w-7" />
        </div>
        <div className="space-y-[var(--space-xxs)]">
          <h2 className="font-heading text-[26px] leading-tight tracking-[-0.02em] text-foreground">
            You&apos;re in, {firstName}.
          </h2>
          <p className="mx-auto max-w-[34ch] text-[16px] leading-relaxed text-muted-foreground">
            Your page is ready. Come say hello, the valley&apos;s been waiting.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => router.push("/feed")}
      >
        Take me to the feed
      </Button>
    </div>
  );
}
