"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * <InviteLinkCard> - the Keeper's shareable link to this Catch-up.
 *
 * Everyone in a Catch-up got there by being picked when it was created, which
 * meant adding a seventh person afterwards was impossible without starting
 * again. This is the way in (owner, 2026-08-04: "you create a catch up and then
 * you should be able to share that link to people").
 *
 * The origin is read on the client rather than passed from the server, so the
 * copied link always matches the host the Keeper is actually on. Rendering the
 * full URL server-side would have to guess between localhost, the vercel.app
 * host and rishivalley.space, and it would guess wrong in at least one of them.
 * Until it hydrates the field shows the path alone, which is still true.
 *
 * Keeper-only, because handing out membership is a Keeper's call; the server
 * does not check that (holding the token IS the authorisation, as with any
 * share link), so this is about who is offered the button, not about security.
 */
export function InviteLinkCard({ token }: { token: string }) {
  const path = `/catchups/join/${token}`;
  const [copied, setCopied] = useState(false);

  /* useSyncExternalStore, not an effect that setStates on mount: this is
     exactly the "one value on the server, another on the client" case it
     exists for, and it gets the origin in during hydration instead of
     scheduling a second render (which is also what the setState-in-an-effect
     lint rule is objecting to). The subscribe callback is a no-op because
     window.location.origin cannot change without a navigation. */
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
  // Reset the tick a moment after a copy, so a second copy still reads as one.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const url = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The field below is selectable, so say that rather than failing mutely.
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
          Invite by link
        </h3>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Anyone with this link can join. Send it however you already talk to these people.
      </p>

      {/* A read-only input, not a <p>: it gives select-all on focus and a
          native long-press "copy" on a phone, which is the fallback for every
          browser where the clipboard API is unavailable. --radius-input (12px)
          is one rung inside the 16px card. */}
      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Invite link"
        className="mt-[var(--space-s)] w-full rounded-[var(--radius-input)] border border-border bg-muted px-3 py-2 text-[12.5px] text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />

      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
