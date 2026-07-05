"use client";

/* ------------------------------------------------------------------ *
 *  <PublishNowButton> - the Keeper's shortcut past the 24h preparing hold
 *  (spec 2.5 / 3.5). Only rendered for the effective Keeper (page.tsx
 *  computes that server-side via `isEffectiveKeeper`; this component trusts
 *  its caller, same as every other Keeper-only control in the feature).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishNow } from "@/app/(main)/catchups/actions";

export function PublishNowButton({ editionId }: { editionId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await publishNow(editionId);
    if (result && "error" in result) toast.error(result.error);
    setBusy(false);
  }

  return (
    <Button variant="primary" onClick={handleClick} disabled={busy}>
      {busy ? "Publishing..." : "Publish now"}
    </Button>
  );
}
