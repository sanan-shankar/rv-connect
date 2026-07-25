"use client";

import { useState } from "react";

/**
 * About prose with a gentle "Read more" past a few lines, so a long life story
 * does not push the whole tab down before the reader chooses to see it. Clamps
 * to ~7 lines when collapsed; the toggle only appears if the text overflows.
 */
export function AboutProse({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // A conservative estimate: only offer the toggle when the text is long
  // enough to plausibly exceed the clamp (avoids a "Read more" that reveals
  // nothing). ~7 lines at this measure is roughly 500 characters.
  const isLong = text.length > 500;

  return (
    <div>
      <p
        // Body face at the app's standard body measure, NOT the serif at
        // 16.5px this used to be. A different typeface a size and a half up
        // from every other block of text on the page read as a mistake rather
        // than as emphasis (owner: "the font size of About seems obnoxiously
        // big and not in fitting with everything else"). 15px/1.7 is exactly
        // what a post body uses, so About now sits in the same rhythm as the
        // feed it lives beside.
        className="max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground"
        style={expanded || !isLong ? undefined : {
          display: "-webkit-box",
          WebkitLineClamp: 7,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 rounded-full text-[13px] font-semibold text-canopy transition-transform duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
