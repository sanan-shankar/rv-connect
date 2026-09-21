import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONTRIBUTION_SUM, netPaise } from "@/lib/contribution-state";
import { CostsCard } from "@/components/support/costs-card";
import { BirdPlate } from "@/components/support/bird-plate";
import { SupportContribute } from "@/components/support/support-contribute";
import { Button } from "@/components/ui/button";
import { SupportShell } from "@/components/support/support-shell";

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
   payment redirects there, and everyone else sees the twelve-bird plate
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
      _sum: CONTRIBUTION_SUM,
      where: { status: "paid", livemode: true },
    })
    .then((r) => netPaise(r._sum))
    .catch(() => 0);

  // Powers the personal "your admission number" chip below; a missed read
  // (or no session, which should not happen behind the (main) layout but
  // costs nothing to guard) just hides the chip rather than taking the page
  // down, same defensive shape as recoveredPaise above.
  const admissionNumber = session?.user?.id
    ? await prisma.user
        .findUnique({ where: { id: session.user.id }, select: { admissionNumber: true } })
        .then((u) => u?.admissionNumber ?? null)
        .catch(() => null)
    : null;

  return (
    <SupportShell
      costs={<CostsCard recoveredPaise={recoveredPaise} />}
      plate={<BirdPlate />}
      contribute={<SupportContribute admissionNumber={admissionNumber} />}
      contributeAside={
        /* The owner's test door: walks the exact page a contributor is
           redirected to after paying, without paying. Admin eyes only;
           /pick-bird and chooseBird both carry the matching exception. */
        isAdmin && (
          <Button variant="secondary" nativeButton={false} render={<Link href="/pick-bird" />}>
            Change bird
          </Button>
        )
      }
    />
  );
}
