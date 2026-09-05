/* Motion's own documented "features.js" shape for LazyMotion, and it is its
   own module for one reason: a bundler cannot tree-shake a dynamic namespace
   import. `import("motion/react").then((m) => m.domMax)` makes it evaluate
   every export of the barrel to hand back `m`, so the async chunk carried
   `useInvertedScale`, `Reorder`, `LayoutGroup`, `MotionConfig`, the legacy
   frameloop and the view-transition machinery -- 70 KB raw that no file in
   this app imports. A STATIC named import in a module of its own is shaken,
   and `import("./motion-features-max")` then asks for exactly domMax's graph.

   Pinned by motion-namespace-rule.test.mjs, which reads both halves: the
   loader must point here, and this must import domMax. */
import { domMax } from "motion/react";

export default domMax;
