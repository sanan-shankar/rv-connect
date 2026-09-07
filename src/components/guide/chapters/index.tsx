/* slug -> chapter. Kept beside the chapters rather than in guide-areas.ts so
   that the area list stays a plain data module: /guide's index lists the
   areas, and guide-layer picks one out of the path, without either of them
   pulling six React components in behind it. */

import { FeedChapter } from "./feed";
import { DirectoryChapter } from "./directory";
import { CollectionChapter } from "./collection";
import { LettersChapter } from "./letters";
import { CatchupsChapter } from "./catchups";
import { BirdsChapter } from "./birds";

export const CHAPTERS: Record<string, () => React.ReactElement> = {
  feed: FeedChapter,
  directory: DirectoryChapter,
  collection: CollectionChapter,
  letters: LettersChapter,
  catchups: CatchupsChapter,
  birds: BirdsChapter,
};
