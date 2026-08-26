import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The app animates through `m`, never `motion`.
 *
 *  `motion.div` carries the whole 132 KB feature runtime with it. `m.div`
 *  is the same component with the features supplied by the LazyMotion in
 *  motion-features.tsx, so they arrive in their own async chunk instead of
 *  the first load of all 93 client pages.
 *
 *  ONE stray `motion.` anywhere in the app graph puts the entire runtime
 *  back into the shared chunk, and nothing else notices: the page renders,
 *  the animation plays, the gates stay green, and the only symptom is 132 KB
 *  that came back. LazyMotion ships a `strict` mode that turns exactly this
 *  into a dev-time throw, and it is deliberately NOT on -- see
 *  motion-features.tsx: strict would break every lab room, because the 30
 *  files under src/app/lab still use `motion.` on purpose and their runtime
 *  now loads only on lab routes. This test is what replaces it.
 *
 *  src/app/lab is therefore exempt BY DESIGN, not by oversight.
 * ------------------------------------------------------------------ */

const LAB = join(ROOT, "src/app/lab");

const appFiles = walk(join(ROOT, "src"), {
  skip: (name, full) => SKIP_DIRS.includes(name) || full === LAB || full.startsWith(LAB + "/"),
}).map((f) => f.slice(ROOT.length + 1));

test("no app file animates through the full `motion` namespace", () => {
  /* Anti-vacuity: if the walk ever stops finding files -- a moved directory,
     a changed matcher -- every assertion below passes over nothing. The
     count is the sweep proving it happened. */
  assert.ok(
    appFiles.length > 400,
    `the sweep found only ${appFiles.length} app files; it is no longer reading the tree`
  );

  const offenders = [];
  let animating = 0;
  for (const rel of appFiles) {
    const src = decomment(read(rel));
    if (!/from "motion\/react"/.test(src)) continue;
    if (/\bm\./.test(src)) animating++;
    /* `motion.tsx`/`motion.ts` are filenames, and `useReducedMotion` and
       `MotionProps` are different identifiers; only a bare `motion.` that is
       not one of those is the full namespace. */
    const stray = src.match(/\bmotion\.(?!tsx\b)(?!ts\b)\w+/g);
    if (stray) offenders.push(`${rel}: ${[...new Set(stray)].join(", ")}`);
  }

  /* Second anti-vacuity guard, and the one that actually bites: the loop above
     skips any file not importing from motion/react, so a rename of the package
     would empty it silently. */
  assert.ok(
    animating > 40,
    `only ${animating} app files animate through \`m\`; the sweep is reading the wrong thing`
  );

  assert.deepEqual(
    offenders,
    [],
    "these files use `motion.` and put the whole 132 KB runtime back on every page; use `m.` (see motion-features.tsx)"
  );
});

test("the LazyMotion that feeds `m` is actually mounted, with domMax", () => {
  const features = read("src/components/common/motion-features.tsx");
  assert.match(features, /LazyMotion/, "motion-features.tsx no longer renders a LazyMotion");
  /* domMax, not domAnimation: `layout` on the sidebar marker and `drag` in the
     image viewer and the avatar crop live only in domMax, and swapping it
     would break both silently rather than loudly. */
  assert.match(features, /domMax/, "the feature bundle is no longer domMax; layout and drag would stop");

  const layout = read("src/app/layout.tsx");
  assert.match(
    layout,
    /<MotionFeatures>/,
    "the root layout no longer wraps the tree in MotionFeatures, so every `m.` renders featureless"
  );
});
