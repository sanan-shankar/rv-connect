"use client";

import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Step 5: Done. A warm send-off into the feed. No auto-redirect timer, the
 * person leaves this page on their own click.
 *
 * `next` is normally the feed, but someone who arrived from an invite link is
 * sent back to it, so the thing they originally clicked is the thing they land
 * on. The button says where it goes either way.
 */
export function DoneStep({ name, next = "/feed" }: { name: string; next?: string }) {
  const router = useRouter();
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-[var(--space-l)] text-center">
      {/* Same opaque bg-card surface every other step uses (see welcome-step.tsx's
          comment). This is also where the post-signup celebration hoopoe
          actually plays (see onboarding-flow.tsx), so it doubles as the one
          moment that needs to read clean against the mascot mid-flight. */}
      <div className="space-y-[var(--space-l)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        {/* Celebration bubble in the leaf tint (colour protocol's chip trio);
            cinnamon would fight the hoopoe flying through this same moment. */}
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-leaf/30 bg-leaf/[0.07] text-leaf"
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
        onClick={() => router.push(next)}
      >
        {next === "/feed" ? "Take me to the feed" : "Take me there"}
      </Button>
    </div>
  );
}
