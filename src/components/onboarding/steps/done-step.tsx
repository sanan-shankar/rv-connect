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
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-canopy/10 text-canopy"
        aria-hidden
      >
        <PartyPopper className="h-7 w-7" />
      </div>
      <div className="space-y-[var(--space-xxs)]">
        <h2 className="font-heading text-[26px] leading-tight tracking-[-0.02em] text-foreground">
          All set, {firstName}.
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          Thank you for filling that in. Whatever you skipped is waiting for
          you, whenever you feel like it, from a small card on your feed.
        </p>
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
