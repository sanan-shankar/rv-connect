import { LettersModule } from "./rail/letters-module";
import { CollectionModule } from "./rail/collection-module";
import { DirectoryModule } from "./rail/directory-module";
import { PulseModule } from "./rail/pulse-module";

/**
 * FeedRail: the right-hand companion column on the feed. Fixed module
 * order, each one server-rendered from real data and responsible for
 * hiding itself when it has nothing real to show, so the rail never looks
 * broken or padded:
 *
 *   1. This week in Letters
 *   2. From the Collection
 *   3. New in the directory
 *   4. Signs of life (last, and only when the week is genuinely alive)
 */
/**
 * Who is looking. The rail's modules are server components that show real
 * content, so anything audience-scoped has to be scoped HERE too -- a teaser
 * is a disclosure (bug audit B-045).
 */
export type RailViewer = {
  /** UserPlace cities, for cityScope matching. */
  cities: string[];
  /** e.g. "isc-2017", for targetBatches matching. */
  batch: string;
  /** Admins read everything, so they skip both filters. */
  isAdmin: boolean;
};

export async function FeedRail({ userId, viewer }: { userId: string; viewer: RailViewer }) {
  return (
    /* The sticky box is a DIRECT child of the <aside> grid cell on purpose.
       A sticky element can only travel inside its containing block, and the
       wrapper that used to sit here was height:auto, i.e. exactly as tall as
       this box: travel was 0px, so the rail scrolled straight off the top with
       the feed and never came back (measured: rail top went 125px -> -2275px
       over a 4800px feed). The <aside> is a stretched grid item, so it is as
       tall as the feed column and the rail now genuinely stays put. This is
       the same shape /catchups already uses.

       Deliberately NOT a scroll container (no max-h + overflow-y): parking the
       pointer on the rail must never steal the wheel from the page, the same
       rule the profile page's segmented pill follows.

       top-7 (28px) is the shell's own sm:p-7 padding, so the pinned rail keeps
       the page's top margin rather than kissing the viewport edge. */
    <div className="sticky top-7 space-y-4">
      <LettersModule viewer={viewer} />
      <CollectionModule />
      <DirectoryModule userId={userId} />
      <PulseModule />
    </div>
  );
}
