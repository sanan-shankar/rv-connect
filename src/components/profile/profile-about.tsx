import Link from "next/link";
import type { ReactNode } from "react";
import { AboutProse } from "@/components/profile/about-prose";

/**
 * The About tab (default). A demoted "Open to" pill row (if any) sits at the
 * top, then the About prose, then a light valley-years note. On mobile the
 * rail cards (record / find them / groups) are inlined below via `mobileRail`
 * (rendered by the server page and passed through) since a directory profile
 * should never hide them behind a desktop-only column.
 */
export function ProfileAbout({
  about,
  openToTags,
  firstName,
  isOwnProfile,
  mobileRail,
}: {
  about: string | null;
  openToTags: string[];
  firstName: string;
  isOwnProfile: boolean;
  mobileRail: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
        {openToTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {openToTags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-leaf/10 px-3 py-1.5 text-[12px] font-semibold text-leaf"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          About
        </h3>
        {about ? (
          <AboutProse text={about} />
        ) : isOwnProfile ? (
          <p className="text-[14px] leading-[1.7] text-muted-foreground">
            You haven&rsquo;t written an About yet.{" "}
            <Link href="/settings" className="font-semibold text-leaf hover:underline">
              Add a few lines
            </Link>{" "}
            so people know who you are now.
          </p>
        ) : (
          <p className="text-[14px] leading-[1.7] text-muted-foreground">
            {firstName}
            {" "}hasn&rsquo;t written an About yet.
          </p>
        )}
      </section>

      {isOwnProfile && (
        <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            The valley years
          </h3>
          <p className="text-[13.5px] leading-[1.7] text-muted-foreground">
            Memory prompts are on their way to{" "}
            <Link href="/settings" className="font-semibold text-leaf hover:underline">
              your settings
            </Link>
            . Answer the ones you remember, and they will show up here. The rest stay hidden.
          </p>
        </section>
      )}

      {/* Rail inlined on mobile only; the desktop rail is the persistent aside. */}
      <div className="lg:hidden">{mobileRail}</div>
    </div>
  );
}
