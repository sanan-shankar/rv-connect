"use client";

import { LazyMotion } from "motion/react";

/* ------------------------------------------------------------------ *
 *  The motion feature bundle, loaded off the critical path.
 *
 *  `motion.div` carries the whole animation runtime with it -- 132 KB raw
 *  / 64 KB gzipped, and it sat in the first load of all 93 client pages,
 *  /privacy and /terms included. `m.div` is the same component with the
 *  features stripped out; LazyMotion supplies them, and because `features`
 *  is a function rather than a value, they arrive in their own async chunk.
 *
 *  `domMax`, not `domAnimation`: this app really does use both of the
 *  things that separate them -- `layout`/`layoutId` on the sidebar marker
 *  and the segmented pills, and drag in the image viewer and the avatar
 *  crop. domAnimation is ~15 KB smaller and would silently break both.
 *
 *  NOT `strict`. Strict mode makes a stray `motion.*` throw, which is a
 *  good migration aid and the wrong thing to ship here: the 30 files under
 *  src/app/lab deliberately still use `motion.*`, so strict would break
 *  every lab room. Their full-motion chunk now loads only on lab routes,
 *  which is the outcome we want anyway. `no-motion-namespace.test.mjs`
 *  is what keeps the app side honest instead.
 *
 *  Nothing about the motion LANGUAGE changes -- same springs, same curves,
 *  same always-on policy (DESIGN-SYSTEM.md sec. 7). The only visible edge
 *  is that an interaction in the first moments after load animates once the
 *  feature chunk lands; elements still render, and `initial` styles apply.
 * ------------------------------------------------------------------ */
const loadDomMax = () => import("motion/react").then((mod) => mod.domMax);

export function MotionFeatures({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={loadDomMax}>{children}</LazyMotion>;
}
