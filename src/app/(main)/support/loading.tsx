import { SupportShell } from "@/components/support/support-shell";
import { CostsCardSkeleton } from "@/components/support/costs-card";
import { BirdPlateSkeleton } from "@/components/support/bird-plate";
import { SupportContributeSkeleton } from "@/components/support/support-contribute";

/* /support reads the running contribution total before it can paint, and that
   is an aggregate over the whole table (audit M06). What it waits for is three
   parts of a page that is otherwise words that never change, so this is the
   page itself -- the same SupportShell page.tsx renders -- with each of the
   three standing in: the costs card with its total and bars pending, the bird
   plate as discs, and the form as its own boxes. Nothing here can drift from
   the page it precedes, and nothing moves when it lands. */
export default function SupportLoading() {
  return (
    <SupportShell
      costs={<CostsCardSkeleton />}
      plate={<BirdPlateSkeleton />}
      contribute={<SupportContributeSkeleton />}
    />
  );
}
