import { Fragment, type ReactNode } from "react";

/* The styled twin of `metaLine` (src/lib/utils.ts) for bylines that need
 * real elements (styled spans inside a flex row) rather than one string.
 * Same rule, same reason: a middle dot appears only BETWEEN surviving
 * segments (owner, 2026-07-30). An empty string, null, undefined or false
 * part vanishes and takes its separator with it; a single survivor renders
 * alone, dotless.
 *
 * The dot itself is the shared `.dotsep` (globals.css): optically centred
 * and sized for the ~10.5-13px meta registers it appears in. If a new call
 * site sets a much larger font, re-check the dot's +1px nudge there before
 * assuming it still sits right. */
export function MetaDots({ parts }: { parts: ReactNode[] }) {
  const live = parts.filter(
    (p) => p !== null && p !== undefined && p !== false && p !== ""
  );
  return (
    <>
      {live.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="dotsep" aria-hidden>
              ·
            </span>
          )}
          <span>{part}</span>
        </Fragment>
      ))}
    </>
  );
}
