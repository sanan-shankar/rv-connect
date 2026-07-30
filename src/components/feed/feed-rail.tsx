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
export async function FeedRail({ userId }: { userId: string }) {
  return (
    <div className="w-full">
      <div className="sticky top-7 space-y-4">
        <LettersModule />
        <CollectionModule />
        <DirectoryModule userId={userId} />
        <PulseModule />
      </div>
    </div>
  );
}
