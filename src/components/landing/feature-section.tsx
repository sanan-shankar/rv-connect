import { SectionReveal } from "./section-reveal";

const ACCENT: Record<string, string> = {
  leaf: "text-leaf",
  blue: "text-sky",
  cinnamon: "text-cinnamon",
};

/**
 * The workhorse text + visual section. Two-column on desktop (alternating sides
 * via `reverse`), stacked text-first on mobile. Copy is server-rendered so the
 * value proposition is readable before any JS or image arrives.
 */
export function FeatureSection({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reverse = false,
  accent = "leaf",
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  accent?: "leaf" | "blue" | "cinnamon";
}) {
  return (
    <SectionReveal>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={reverse ? "lg:order-2" : ""}>
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
        </div>
        <div className={`relative ${reverse ? "lg:order-1" : ""}`}>{visual}</div>
      </div>
    </SectionReveal>
  );
}
