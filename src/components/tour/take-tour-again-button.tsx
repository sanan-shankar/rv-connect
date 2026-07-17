"use client";

/* ------------------------------------------------------------------ *
 *  <TakeTourAgainButton> — the About page's permanent way back into the
 *  product tour (walkthrough spec sec 6). Calls tour-provider's start(),
 *  which deliberately ignores any stored completed/dismissed state and
 *  navigates to /feed to begin from Stop 1.
 * ------------------------------------------------------------------ */

import { Button } from "@/components/ui/button";
import { useTour } from "./tour-provider";

export function TakeTourAgainButton() {
  const { start } = useTour();
  return (
    <Button variant="primary" onClick={start}>
      Take the tour again
    </Button>
  );
}
