"use client";

/* ------------------------------------------------------------------ *
 *  HousesTrail — the concepts' adapter onto the SHIPPED houses chain.
 *
 *  This file used to carry its own copy of the trail, drawn with solid
 *  filled pills. The owner's call (2026-07-25): "use the style for
 *  labelling houses that is shipped, your new style in delight is much
 *  worse." So the drawing now lives in exactly one place,
 *  `src/components/profile/houses-chain.tsx`, and this is only the shape
 *  conversion from the preview mock to the real `HouseSpan`.
 *
 *  Also load-bearing, from the same review: "house is just a fun thing,
 *  it's not that important, you're making it 50% of the profile. Don't
 *  give it so much space." The shared component is capped narrow and its
 *  pills are small; concepts must keep it as a quiet strip and must not
 *  wrap it in a big labelled section of its own.
 * ------------------------------------------------------------------ */

import { HouseTrail } from "@/components/profile/houses-chain";
import type { HouseSpan } from "@/lib/house-spans";
import type { MockHouseYear } from "./_data";

export function HousesTrail({ houses }: { houses: MockHouseYear[] }) {
  // MockHouseYear is already {house, fromYear, toYear}; the cast is a rename,
  // not a reshape, and keeps the mock free of a lib import.
  const spans: HouseSpan[] = houses.map((h) => ({
    house: h.house,
    fromYear: h.fromYear,
    toYear: h.toYear,
  }));
  return <HouseTrail spans={spans} />;
}
