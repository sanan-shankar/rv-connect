import type { Metadata } from "next";
import Link from "next/link";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CostsCard } from "@/components/support/costs-card";
import { BirdPlate } from "@/components/support/bird-plate";
import { SupportContribute } from "@/components/support/support-contribute";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the site running.",
};

/* The aviary page (owner pick from /lab/support-ideas, 2026-08-18): the
   site's own birds as a fixed field behind the page, the sections floating
   over them on glass. The header is bare on the page, not a card, so the
   wood thins to under half strength behind the content column (wood.tsx).

   This page is the SUPPORT page only. Picking a bird lives at /pick-bird
   (owner: "the support page should be the support page"); a successful
   payment redirects there, and everyone else sees the fourteen-bird plate
   with its point-to-name interaction, eligible or not. */

export default async function SupportPage() {
  // Only read to decide whether to show the admin's test door below; the
  // page renders identically for everyone else.
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  // The public figure (the recovery bar) only ever counts real money: status
  // paid AND livemode true, so a developer's localhost test click can never
  // inch the public bar forward. It is summed fresh on every view, which is
  // what makes the bar live: a successful payment refreshes this page and
  // the new row is already in the sum. A failed read falls back to the zero
  // state rather than taking the page down.
  const recoveredPaise = await prisma.contribution
    .aggregate({
      _sum: { amount: true },
      where: { status: "paid", livemode: true },
    })
    .then((r) => r._sum.amount ?? 0)
    .catch(() => 0);

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
          <CostsCard recoveredPaise={recoveredPaise} />
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
          <BirdPlate />
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
          {/* The owner's test door: walks the exact page a contributor is
              redirected to after paying, without paying. Admin eyes only;
              /pick-bird and chooseBird both carry the matching exception. */}
          {isAdmin && (
            <Button variant="secondary" nativeButton={false} render={<Link href="/pick-bird" />}>
              Change bird
            </Button>
          )}
        </div>
        <div className="glass card-elevated rounded-[var(--radius-lg)] border border-border p-[var(--space-l)]">
          <SupportContribute />
        </div>
      </section>

      <p className="leading-relaxed text-foreground">Thank you for your support.</p>
    </div>
  );
}
