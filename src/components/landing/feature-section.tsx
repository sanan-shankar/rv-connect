import { SectionReveal } from "./section-reveal";

const ACCENT: Record<string, string> = {
  leaf: "text-leaf",
  blue: "text-sky",
  cinnamon: "text-cinnamon",
};

// Full literal class strings (opacity baked in) so Tailwind's static scanner
// picks them up — see the matching note in showcase-shot.tsx.
const GHOST_NUMERAL: Record<string, string> = {
  leaf: "text-leaf/[0.09]",
  blue: "text-sky/[0.09]",
  cinnamon: "text-cinnamon/[0.09]",
};

/**
 * The workhorse text + visual section. Two-column on desktop (alternating
 * sides via `reverse`, with the visual column always the wider of the two so
 * the screenshot carries the section), stacked text-first on mobile. An
 * oversized ghost numeral sits behind the copy on desktop as a quiet
 * editorial marker (a chapter number, not a caption) — it never changes the
 * copy and never appears on mobile, where there isn't the width to spare.
 * Copy is server-rendered so the value proposition is readable before any JS
 * or image arrives.
 */
export function FeatureSection({
  eyebrow,
  title,
  body,
  bullets,
  textExtra,
  visual,
  reverse = false,
  accent = "leaf",
  index,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  /** Optional extra content rendered at the end of the text column, after
   * the bullets. In normal flow (not absolutely positioned against the
   * visual column), so it grows the column naturally and can never overlap
   * the copy above it, whatever width the column wraps to. */
  textExtra?: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
  accent?: "leaf" | "blue" | "cinnamon";
  /** 1-based position among the feature sections; renders the ghost numeral. */
  index?: number;
}) {
  return (
    <SectionReveal>
      <div
        className={`grid items-center gap-10 lg:gap-14 ${
          reverse ? "lg:grid-cols-[1.4fr_1fr]" : "lg:grid-cols-[1fr_1.4fr]"
        }`}
      >
        <div className={`relative z-10 ${reverse ? "lg:order-2" : ""}`}>
          {/* The ghost numeral is anchored to this column (not the row), so it
              sits a fixed distance above the eyebrow regardless of how tall the
              row grows to fit the visual — anchoring it to the row instead would
              have it collide with the label whenever a short, wide screenshot
              (e.g. Letters) lets the text column sit flush with the row's top. */}
          {typeof index === "number" && (
            <span
              aria-hidden
              className={`pointer-events-none absolute -top-6 -z-10 hidden select-none font-heading text-[6.5rem] font-bold leading-none lg:block ${GHOST_NUMERAL[accent]} ${
                reverse ? "right-0" : "left-0"
              }`}
            >
              {String(index).padStart(2, "0")}
            </span>
          )}
          <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${ACCENT[accent]}`}>
            {eyebrow}
          </p>
          <h3 className="mt-3 max-w-[18ch] font-heading text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-foreground text-balance sm:text-4xl">
            {title}
          </h3>
          <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.7] text-muted-foreground">
            {body}
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-5 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-foreground">
                  <span
                    aria-hidden
                    className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${ACCENT[accent]} bg-current`}
                  />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {textExtra}
        </div>
        <div className={`relative z-10 ${reverse ? "lg:order-1" : ""}`}>{visual}</div>
      </div>
    </SectionReveal>
  );
}
