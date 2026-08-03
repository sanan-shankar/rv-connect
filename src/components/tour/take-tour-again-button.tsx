"use client";

/* ------------------------------------------------------------------ *
 *  <TakeTourAgainButton> — the owner Admin page's manual entry into the
 *  product tour. Calls tour-provider's start(), which deliberately ignores
 *  any stored completed/dismissed state and navigates to /feed at Stop 1.
 * ------------------------------------------------------------------ */

import { Button } from "@/components/ui/button";
import { useTour } from "./tour-provider";

export function TakeTourAgainButton() {
  const { start } = useTour();
  return (
    <Button variant="primary" size="sm" onClick={start}>
      hoopoe tour
    </Button>
  );
}
