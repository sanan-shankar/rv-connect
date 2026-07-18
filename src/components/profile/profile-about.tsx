import Link from "next/link";
import { cn } from "@/lib/utils";
import { AboutProse } from "@/components/profile/about-prose";
import {
  socialHref,
  socialIcon,
  socialDisplay,
  socialHost,
  type SocialKind,
} from "@/lib/social";

/* ------------------------------------------------------------------ *
 *  ProfileAbout - the About tab (the default), rebuilt 2026-07 from the
 *  approved profile-v2 concept. Order:
 *   1. the About prose (eyebrow says "About" - the app standardised on
 *      that name this round; no more bio/in-their-words variants),
 *   2. the "Find them" socials block (Dossier's block),
 *   3. the at-RV facts as a QUIET footnote strip at the very bottom -
 *      years at RV, entered grade, cities. This is the only home for
 *      those facts now: never in the header, never in a mid-page rail.
 *
 *  Desktop uses the width: prose and "Find them" sit side by side on a
 *  shared grid (both flush to the same left/top), the facts strip spans
 *  the full width beneath. Mobile is the linear stack.
 * ------------------------------------------------------------------ */

export interface AboutSocial {
  kind: SocialKind;
  value: string;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon/85">{children}</p>
  );
}

function SocialPill({ social }: { social: AboutSocial }) {
  const Icon = socialIcon(social.kind);
  const host = socialHost(social.kind, social.value);
  return (
    <a
      href={socialHref(social.kind, social.value)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 rounded-full border border-border bg-mist/70 px-4 py-2 text-[13px] font-semibold text-foreground transition-transform duration-150 hover:-translate-y-0.5 hover:border-cinnamon/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.985]"
    >
      <Icon className="h-[15px] w-[15px] shrink-0 text-cinnamon" aria-hidden />
      <span>{socialDisplay(social.kind, social.value)}</span>
      {host && <span className="font-normal text-muted-foreground">{host}</span>}
    </a>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-cinnamon/70">{label}</dt>
      <dd className="mt-1 text-[13.5px] font-semibold leading-snug text-foreground">{value}</dd>
    </div>
  );
}

export function ProfileAbout({
  about,
  firstName,
  isOwnProfile,
  socials,
  rvYears,
  enteredGrade,
  cities,
}: {
  about: string | null;
  firstName: string;
  isOwnProfile: boolean;
  socials: AboutSocial[];
  rvYears: string | null;
  enteredGrade: number | null;
  cities: string[];
}) {
  const hasSocials = socials.length > 0;
  const hasFacts = Boolean(rvYears) || enteredGrade != null || cities.length > 0;

  return (
    <div>
      <div
        className={cn(
          "grid gap-x-[var(--space-xl)] gap-y-[var(--space-xl)]",
          hasSocials && "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
        )}
      >
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

        {hasSocials && (
          <section className="lg:border-l lg:border-dashed lg:border-border lg:pl-[var(--space-xl)]">
            <Eyebrow>Find them</Eyebrow>
            <div className="mt-[var(--space-m)] flex flex-wrap gap-2.5">
              {socials.map((s) => (
                <SocialPill key={s.kind + s.value} social={s} />
              ))}
            </div>
          </section>
        )}
      </div>

      {hasFacts && (
        <dl className="mt-[var(--space-xl)] flex flex-wrap gap-x-[var(--space-xl)] gap-y-[var(--space-m)] border-t border-dashed border-border pt-[var(--space-l)]">
          {rvYears && <Fact label="In the valley" value={rvYears} />}
          {enteredGrade != null && <Fact label="Entered" value={`Grade ${enteredGrade}`} />}
          {cities.length > 0 && <Fact label="Based in" value={cities.join(" · ")} />}
        </dl>
      )}
    </div>
  );
}
