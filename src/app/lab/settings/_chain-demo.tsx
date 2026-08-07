"use client";

/* The chain editor on its own stage, so the one idea can be tried without a
   profile around it. This is the SHIPPED component now, not a lab copy. */

import { useState } from "react";
import { HouseChainEditor } from "@/components/profile/house-chain-editor";
import { PERSON } from "./_data";
import type { HouseYearEntry } from "@/lib/houses";

export function ChainDemo() {
  /* Starts EMPTY. The thing worth watching is the chain being built, not a
     finished one sitting there. */
  const [entries, setEntries] = useState<HouseYearEntry[]>([]);

  return (
    <div>
      <HouseChainEditor
        entries={entries}
        onChange={setEntries}
        yearJoined={Number(PERSON.yearJoined)}
        yearLeft={Number(PERSON.yearLeft)}
      />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEntries([])}
          className="dl-press rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={() => setEntries(PERSON.houses)}
          className="dl-press rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Fill it in for me
        </button>
        <span className="text-[12px] text-muted-foreground">Nine years, 2014 to 2023.</span>
      </div>
    </div>
  );
}
