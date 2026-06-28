import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";

/**
 * Closing CTA band plus a quiet footer. Server-rendered: the ask and the links
 * work with no JavaScript. The band repeats the two hero affordances so a
 * prospect who has scrolled the whole showcase can act without scrolling back.
 */
export function LandingFooter() {
  return (
    <footer className="relative border-t border-border bg-leaf/[0.06]">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <PeaksMark size={20} className="mx-auto text-leaf" />
        <h2 className="mt-6 font-heading text-3xl font-bold tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem] sm:leading-[1.08]">
          Come back to the valley.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-[1.7] text-muted-foreground">
          If you grew up here or taught here, there is a place for you. It stays
          small on purpose, and it keeps the valley close.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-leaf px-8 py-3.5 font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          >
            Request an invite
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 font-semibold text-foreground transition-[transform,background-color,border-color] duration-200 hover:scale-[1.02] hover:border-leaf/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-7 text-[13px] text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <PeaksMark size={13} className="text-muted-foreground" />
            <span className="font-heading font-bold tracking-tight text-foreground">
              Rishi Valley
            </span>
            <span className="uppercase tracking-[0.2em] text-[10px]">Alumni</span>
          </div>
          <p>A quiet, invite-only home for the people of the valley.</p>
        </div>
      </div>
    </footer>
  );
}
