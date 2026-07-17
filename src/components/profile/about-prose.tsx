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
        className="max-w-[64ch] whitespace-pre-wrap font-heading text-[16.5px] leading-[1.78] text-foreground"
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
