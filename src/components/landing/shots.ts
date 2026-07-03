/**
 * Optimized, real screenshots of the live app, captured with the repo screenshot
 * tools and Sharp-processed to WebP. Each carries its intrinsic dimensions (so
 * `next/image` reserves space and CLS stays 0) and a tiny inline blur LQIP.
 *
 * Captured 2026-07-03 against the post-redesign app (bird-avatar feed, ruled-sheet
 * cards, flush sidebar), staged with a few in-voice demo posts and one letter
 * created for the shoot and removed straight after (see progress.md). The
 * Valley Collection has no contributed photos yet, so `collection` below still
 * points at the pre-redesign capture until the archive has real content.
 *
 * Filenames carry a `-v2` suffix on purpose: `/_next/image` caches by URL and
 * does not re-check the source file's mtime, so overwriting a file at the same
 * path (e.g. `feed.webp`) can keep serving a stale cached render (dev's image
 * cache does not expire on its own; the same class of staleness can bite a
 * production redeploy too). Give any future re-capture of these a new suffix
 * rather than overwriting in place.
 */
export type Shot = { src: string; w: number; h: number; blur: string };

export const SHOTS: Record<string, Shot> = {
  directory: {
    src: "/images/landing/directory-v2.webp",
    w: 1112,
    h: 818,
    blur: "data:image/webp;base64,UklGRnQAAABXRUJQVlA4IGgAAABQBACdASoYABIAPu1ur1IppiQiqAgBMB2JZwDH5A+4mSTcVe7eZdBFnIUAAP7f0aQh5qXEQeaOcQwfQdao2fwPCDQ1siS2bxoo9T+0j2LTXXvpoGNn2TyJtP/oSaVdHyhdjYRCABQAAA==",
  },
  feed: {
    src: "/images/landing/feed-v2.webp",
    w: 1192,
    h: 900,
    blur: "data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAADwAwCdASoYABIAPu1or1AppaSiqAqpMB2JZwAALnY9a3KZ2BXlxNEAAP7nIeY3DZ5z6fheLYt6o2C+5zD4+aMNAfGpACa1O7t28Z5up45zqCIroYVMcgAA",
  },
  letters: {
    src: "/images/landing/letters-v2.webp",
    w: 1112,
    h: 422,
    blur: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAABwAwCdASoYAAkAPu1kq04ppaQiMAgBMB2JZQCAAAzxuvxegAAA/u9x7Y8podYOr06S0tzm5VVmMAb/dJVGs2fGoAA=",
  },
  // Not regenerated in the 2026-07-03 pass: the Collection has zero contributed
  // photos on the live DB (an empty-state screenshot would undersell the feature),
  // so this still points at the earlier pre-redesign capture. Replace once a few
  // real photos exist. See progress.md for the decision.
  collection: {
    src: "/images/landing/collection.webp",
    w: 1100,
    h: 720,
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAACwAQCdASoQAAoABABoJQAAVD/JFHoAAP7gBj5OyvrZUkQymXkNHCUGO3GBAvM0OuTvu1HlBlbFlz9Tdu7pIaBW2j/RPsLfgyl/b38jAAA=",
  },
  catchups: {
    src: "/images/landing/catchups-v2.webp",
    w: 1136,
    h: 561,
    blur: "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAACQAwCdASoYAAwAPu1kqU4ppaOiMAgBMB2JZQCAAAiuTHz7STQAAP7frlNHVDEwQJS3QpFQP8UEasOYwcNamLuj64Q0SAAA",
  },
};
