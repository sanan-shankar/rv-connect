import type { ReactNode } from "react";
import Link from "@/components/common/link";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

/**
 * /support, everything but what it fetches.
 *
 * The page is nearly all words that never change -- the pledge, the three
 * headings, "See all 50", the thanks -- around three live parts: the costs
 * card (its recovery bar reads a sum over every contribution), the bird plate
 * and the contribute form (which carries the member's admission number). So
 * the page and its loading screen are the SAME component with different
 * slots: page.tsx fills them with the real parts, loading.tsx with each
 * part's own placeholder. Nothing the loading screen shows can drift from the
 * page, because it is the page, and the wait shows exactly what it is waiting
 * for.
 */
export function SupportShell({
  costs,
  plate,
  contribute,
  contributeAside,
}: {
  costs: ReactNode;
  plate: ReactNode;
  contribute: ReactNode;
  /** Beside the Contribute heading: the owner's test door, admins only. */
  contributeAside?: ReactNode;
}) {
  return (
    <div className="pb-[var(--space-xl)]">
      {/* The bird field and the solid backdrop mount from the APP SHELL
          (wood-mount.tsx), not here: the page transition template animates a
          transform, which would trap an absolutely-positioned field inside
          the reading column for the entrance and cause the rearrange-on-load
          the owner reported. */}

      {/* Hero: the shipped header, unchanged (owner: "let it look like how it
          did in the shipped version"). The pledge below runs the full column
          width; no max-w, so it never wraps at an arbitrary point. */}
      <header className="mb-[var(--space-xl)]">
        <style>{`
          @keyframes support-sway {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(2deg); }
          }
        `}</style>
        <div className="flex items-center gap-[var(--space-s)]">
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-leaf/10 text-leaf"
            aria-hidden
          >
            <span
              className="inline-flex"
              style={{ animation: "support-sway 6s ease-in-out infinite", transformOrigin: "50% 80%" }}
            >
              <Tree size={28} weight="duotone" />
            </span>
          </span>
          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            Support
          </h1>
        </div>
        <p className="mt-[var(--space-m)] text-base leading-relaxed text-foreground">
          This site is not for profit and will always be free to use. Donations are much
          appreciated and go towards running and improving it for everyone. Anything left over
          goes to the school.
        </p>
      </header>

      <section aria-labelledby="costs-heading" className="mb-[var(--space-xl)]">
        <h2
          id="costs-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          Costs
        </h2>
        <div className="glass card-elevated rounded-[var(--radius-lg)] border border-border p-[var(--space-l)]">
          {costs}
        </div>
      </section>

      <section aria-labelledby="perk-heading" className="mb-[var(--space-xl)]">
        <div className="mb-[var(--space-s)] flex flex-wrap items-center justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xs)]">
          <h2
            id="perk-heading"
            className="font-heading text-xl font-bold tracking-tight text-foreground"
          >
            Pick your bird
          </h2>
          {/* A filled secondary pill at full control height: the outline
              size=sm version disappeared against the glass ("barely a
              button"). Secondary carries the state-layer hover and reads as
              a control at a glance without competing with the canopy CTA
              below it. */}
          <Button variant="secondary" nativeButton={false} render={<Link href="/birds" />}>
            See all 50
          </Button>
        </div>
        <div className="glass card-elevated rounded-[var(--radius-lg)] border border-border p-[var(--space-l)]">
          <p className="leading-relaxed text-foreground">
            Anyone who contributes gets to pick their own bird!
          </p>
          {plate}
          {/* No standing door to /pick-bird here, even for members who have
              already contributed: the ONLY way in is the redirect after a
              successful payment (owner). The page a supporter lands on after
              paying stays reachable at its own URL; this page never links
              it. */}
        </div>
      </section>

      <section aria-labelledby="contribute-heading" className="mb-[var(--space-xl)]">
        <div className="mb-[var(--space-s)] flex flex-wrap items-center justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xs)]">
          <h2
            id="contribute-heading"
            className="font-heading text-xl font-bold tracking-tight text-foreground"
          >
            Contribute
          </h2>
          {contributeAside}
        </div>
        <div className="glass card-elevated rounded-[var(--radius-lg)] border border-border p-[var(--space-l)]">
          {contribute}
        </div>
      </section>

      <p className="leading-relaxed text-foreground">Thank you for your support.</p>
    </div>
  );
}
