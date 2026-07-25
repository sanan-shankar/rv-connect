import Link from "next/link";
import { cn } from "@/lib/utils";
import { AboutProse } from "@/components/profile/about-prose";
/* ------------------------------------------------------------------ *
 *  ProfileAbout - the About tab (the default), rebuilt 2026-07 from the
 *  approved profile-v2 concept. Order:
 *   1. the About prose (eyebrow says "About" - the app standardised on
 *      that name this round; no more bio/in-their-words variants),
 *   3. the at-RV facts as a QUIET footnote strip at the very bottom -
 *      years at RV, entered grade, cities. This is the only home for
 *      those facts now: never in the header, never in a mid-page rail.
 *
 *  Desktop uses the width: prose and "Find them" sit side by side on a
 *  shared grid (both flush to the same left/top), the facts strip spans
 *  the full width beneath. Mobile is the linear stack.
 * ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">{children}</p>
  );
}

/* One at-RV fact, a labelled column. On sm+ a hairline rule separates it from the
   previous fact so the three read as distinct fields, never one run of text
   ("2014-2023 . 9 years" | "Grade 5" | "London . Chennai"); on mobile they
   stack, so the rule would be a stray line and is dropped. */
function Fact({ label, value, divided }: { label: string; value: string; divided: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0",
        divided && "sm:ml-[var(--space-l)] sm:border-l sm:border-border sm:pl-[var(--space-l)]"
      )}
    >
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-cinnamon/80">{label}</dt>
      <dd className="mt-1.5 text-[14px] font-semibold leading-snug text-foreground">{value}</dd>
    </div>
  );
}


export function ProfileAbout({
  about,
  firstName,
  isOwnProfile,
  batchLabel,
  rvYears,
  cities,
}: {
  about: string | null;
  firstName: string;
  isOwnProfile: boolean;
  batchLabel: string | null;
  rvYears: string | null;
  cities: string[];
}) {
  // Batch and the years here, and that is the whole record. The owner cut the
  // rest: "we don't have to specify what batch entered and all, just batch of
  // whatever and what years they were there." So no "Entered Grade 4".
  //
  // Cities are plural on purpose. The label used to read "Based in", which
  // promises one place and then printed three; people live in several and the
  // model already stores several, so the label says so.
  const facts = [
    batchLabel ? { label: "Batch", value: batchLabel } : null,
    rvYears ? { label: "In the valley", value: rvYears } : null,
    cities.length > 0 ? { label: cities.length > 1 ? "Cities" : "City", value: cities.join(" · ") } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <div>
      <div>
        <section>
          <Eyebrow>About</Eyebrow>
          <div className="mt-[var(--space-m)]">
            {about ? (
              <AboutProse text={about} />
            ) : isOwnProfile ? (
              <p className="text-[15px] leading-[1.7] text-muted-foreground">
                You haven&rsquo;t written an About yet.{" "}
                <Link href="/settings" className="font-semibold text-leaf hover:underline">
                  Add a few lines
                </Link>{" "}
                so people know who you are now.
              </p>
            ) : (
              <p className="text-[15px] leading-[1.7] text-muted-foreground">
                {`${firstName} hasn’t written an About yet.`}
              </p>
            )}
          </div>
        </section>

      </div>

      {facts.length > 0 && (
        <dl className="mt-[var(--space-xl)] flex flex-col gap-[var(--space-m)] border-t border-border pt-[var(--space-l)] sm:flex-row sm:flex-wrap sm:items-start sm:gap-y-[var(--space-m)]">
          {facts.map((fact, i) => (
            <Fact key={fact.label} label={fact.label} value={fact.value} divided={i > 0} />
          ))}
        </dl>
      )}
    </div>
  );
}
