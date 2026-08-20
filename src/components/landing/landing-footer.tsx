import Link from "next/link";
import { PeaksMark, Wordmark } from "@/components/layout/peaks-mark";
import { FooterHoopoe } from "@/components/landing/footer-hoopoe";

/**
 * Closing CTA band plus a low-key footer. Server-rendered: the ask and the links
 * work with no JavaScript. The band repeats the two hero affordances so a
 * prospect who has scrolled the whole showcase can act without scrolling back.
 *
 * Vertical padding is trimmed a step down the golden-ratio scale from the
 * original xxl-ish weight so the closing sequence (trust card, this CTA, the
 * logo row) reads as one composed ending instead of three bands separated by
 * near-empty space.
 */
export function LandingFooter() {
  return (
    <footer className="relative border-t border-border bg-leaf/[0.06]">
      <div id="closing-cta" className="mx-auto max-w-3xl px-6 py-12 text-center sm:py-16">
        <PeaksMark size={20} variant="light" className="mx-auto" />
        <h2 className="mt-6 font-heading text-3xl font-bold tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem] sm:leading-[1.08]">
          Come back to the valley.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-[1.7] text-muted-foreground text-balance">
          If you grew up here, or taught here, or looked after the place while the
          rest of us grew up, you already belong. Come and find everyone else.
        </p>
        {/* The buttons and the one resident hoopoe share a line: the bird
            perches right at the end of the CTA row (its own little ledge,
            see FooterHoopoe) instead of sitting alone in a separate band
            further down — a reward for scrolling that also fills what used
            to be dead space between the buttons and the logo row below. */}
        <div className="mt-9 flex flex-wrap items-end justify-center gap-3">
          <Link
            href="/signup"
            // Same 1.08 as CANOPY_FILL in ui/button.tsx. Hand-rolled Link, not a
            // <Button>, so keep it in lockstep by hand.
            className="inline-flex items-center justify-center rounded-full bg-canopy px-8 py-3.5 font-semibold text-white shadow-sm transition-[filter,transform] duration-200 hover:brightness-[1.08] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
          >
            Join the community
          </Link>
          <Link
            href="/login"
            // state-layer supplies the body change. Its only hover used to be
            // hover:border-leaf/50, a hairline colour move on a 1px edge with
            // nothing happening to the button itself, which is the weakest CTA
            // hover on the public page. The leaf border stays as a second
            // channel on top.
            className="state-layer inline-flex items-center justify-center rounded-full border border-border bg-card px-8 py-3.5 font-semibold text-foreground transition-[transform,border-color] duration-200 hover:border-leaf/50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Sign in
          </Link>
          <div className="w-16 shrink-0 sm:w-20">
            <FooterHoopoe />
          </div>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-5 text-[13px] text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Wordmark variant="light" textClassName="text-foreground" />
          </div>
          <p>A space for the Rishi Valley community to stay connected.</p>
          {/* The transparency layer's front door (audit H12): the documents a
              stranger should be able to find before an account exists. */}
          <nav aria-label="Policies" className="flex items-center gap-4">
            <Link href="/privacy" className="state-layer rounded-full px-1.5 py-1 hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="state-layer rounded-full px-1.5 py-1 hover:text-foreground">
              Terms
            </Link>
            <Link href="/guidelines" className="state-layer rounded-full px-1.5 py-1 hover:text-foreground">
              Guidelines
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
