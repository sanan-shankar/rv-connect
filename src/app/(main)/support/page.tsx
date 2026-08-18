import type { Metadata } from "next";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { razorpayLivemode } from "@/lib/razorpay";
import { SupportWood } from "@/components/support/wood";
import { CostsCard } from "@/components/support/costs-card";
import { BirdPlate } from "@/components/support/bird-plate";
import { BirdPicker } from "@/components/support/bird-picker";
import { SupportContribute } from "@/components/support/support-contribute";
import { PERK_MIN_PAISE } from "@/components/support/plate-data";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the site running.",
};

/* The aviary layout, promoted from /lab/support-ideas (owner pick,
   2026-08-18): the site's own birds as a fixed field behind the page, the
   readable sections floating over them on glass. The header is NOT a card --
   the owner struck that -- so the wood keeps a clear lane behind the content
   column (see wood.tsx) and bare text never sits on a bird.

   One heading register: the page title, then a 20px card title per section,
   then body. That rule is the whole redesign; the old page had twelve text
   sizes and no order. */

/* The one shared card: glass over the wood, the standard card radius, and the
   --space-l padding every shipped support card already used. */
function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass card-elevated rounded-[var(--radius)] border border-border p-[var(--space-l)]">
      <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xs)]">
        <h2 className="font-heading text-xl leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function SupportPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Three reads, one round trip. The public figure (the recovery bar) only
  // ever counts real money: status paid AND livemode true, so a developer's
  // localhost test click can never inch the public bar forward. The perk sum
  // filters on the CURRENT key mode instead, so against test keys a test
  // payment opens the picker for testing, and against live keys only real
  // money does. A failed read falls back to the zero state rather than taking
  // the page down; the figures are a nicety, the page is not.
  const [recoveredPaise, myPaidPaise, me] = await Promise.all([
    prisma.contribution
      .aggregate({
        _sum: { amount: true },
        where: { status: "paid", livemode: true },
      })
      .then((r) => r._sum.amount ?? 0)
      .catch(() => 0),
    userId
      ? prisma.contribution
          .aggregate({
            _sum: { amount: true },
            where: { userId, status: "paid", livemode: razorpayLivemode() },
          })
          .then((r) => r._sum.amount ?? 0)
          .catch(() => 0)
      : Promise.resolve(0),
    userId
      ? prisma.user
          .findUnique({ where: { id: userId }, select: { birdOverride: true } })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const canPickBird = myPaidPaise >= PERK_MIN_PAISE;

  const seeAll = (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/birds" />}>
      See all 50
    </Button>
  );

  return (
    <div className="pb-[var(--space-xl)]">
      <SupportWood />

      {/* Bare on the page, not a card (owner). The pledge is one paragraph in
          the reading colour at the body size: it is the reason the page
          exists, not a subtitle. */}
      <header className="mb-[var(--space-xl)]">
        <div className="flex items-center gap-[var(--space-s)]">
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] text-leaf"
            aria-hidden
          >
            <Tree size={26} weight="duotone" />
          </span>
          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            Support
          </h1>
        </div>
        <p className="mt-[var(--space-m)] max-w-[62ch] text-base leading-relaxed text-foreground">
          This site will always be free to use. It is not for profit. Donations go towards
          maintaining and running it. Anything beyond that goes to the school.
        </p>
      </header>

      <div className="flex flex-col gap-[var(--space-l)]">
        <Card title="Costs">
          <CostsCard recoveredPaise={recoveredPaise} />
        </Card>

        {canPickBird ? (
          <Card title="Pick your bird" aside={seeAll}>
            <BirdPicker currentSlug={me?.birdOverride ?? null} />
          </Card>
        ) : (
          <Card title="Pick your bird" aside={seeAll}>
            <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
              Anyone who contributes picks their own bird, instead of the one they were given.
            </p>
            <BirdPlate />
          </Card>
        )}

        <Card title="Contribute">
          <div className="mt-[var(--space-m)]">
            <SupportContribute />
          </div>
        </Card>
      </div>

      <p className="mt-[var(--space-xl)] leading-relaxed text-foreground">
        Thank you for your support.
      </p>
    </div>
  );
}
