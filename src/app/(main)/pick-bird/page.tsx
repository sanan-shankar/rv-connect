import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONTRIBUTION_SUM, netPaise } from "@/lib/contribution-state";
import { razorpayLivemode } from "@/lib/razorpay";
import { PageHeader } from "@/components/layout/page-header";
import { BirdPicker } from "@/components/support/bird-picker";
import { PERK_MIN_PAISE } from "@/components/support/plate-data";

export const metadata: Metadata = {
  title: "Pick your bird",
  description: "Choose the bird you wear across the site.",
};

/* The supporter's picking room, split out of /support (owner: "the support
   page should be the support page... you're taken to another page and there
   they pick"). A successful payment redirects here; anyone else who has
   contributed can walk in from the Support page's "Choose your bird" button.

   The gate is a convenience, not the security: chooseBird re-checks the same
   sum server-side on every write, so this redirect only decides what a
   non-supporter SEES (the Support page, where the ask lives), never what
   they can do. */

export default async function PickBirdPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [myPaidPaise, me] = await Promise.all([
    prisma.contribution
      .aggregate({
        _sum: CONTRIBUTION_SUM,
        where: { userId: session.user.id, status: "paid", livemode: razorpayLivemode() },
      })
      .then((r) => netPaise(r._sum))
      .catch(() => 0),
    prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { birdOverride: true, birdPickedAt: true },
      })
      .catch(() => null),
  ]);

  // Admins are let through without paying so the owner can walk the exact
  // supporter flow at will; chooseBird carries the same exception. A member
  // is admitted while they hold an unspent pick: the ₹500 floor for the
  // first, and after that a paid contribution newer than their last pick
  // (pay again, pick again). The real enforcement lives in chooseBird; this
  // redirect only decides what a visitor sees.
  const isAdmin = session.user.role === "admin";
  if (!isAdmin) {
    if (myPaidPaise < PERK_MIN_PAISE) redirect("/support");
    if (me?.birdPickedAt) {
      const fresh = await prisma.contribution
        .findFirst({
          where: {
            userId: session.user.id,
            status: "paid",
            livemode: razorpayLivemode(),
            paidAt: { gt: me.birdPickedAt },
          },
          select: { id: true },
        })
        .catch(() => null);
      if (!fresh) redirect("/support");
    }
  }

  const current = me?.birdOverride ?? null;

  return (
    <div className="pb-[var(--space-xl)]">
      {/* Title only, matching /birds (owner: one layout for both pages, no
          subtitles). The confirm bar carries everything a picker needs to
          know before the write. */}
      <PageHeader title="Pick your bird" />
      <BirdPicker currentSlug={current} />
    </div>
  );
}
