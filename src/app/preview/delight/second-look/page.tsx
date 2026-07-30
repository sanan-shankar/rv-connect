import { permanentRedirect } from "next/navigation";

/* ------------------------------------------------------------------ *
 *  Old second-look index. Folded into /lab (2026-07-30) alongside the
 *  delight index, so every dev/preview room lives in one place instead
 *  of two separate, drifting indexes; see src/app/lab/_registry.ts.
 *  `ROOMS` (./_kit) stays exported: the built rooms below still import
 *  it and keep their own URLs, unchanged.
 * ------------------------------------------------------------------ */
export default function SecondLookIndex() {
  permanentRedirect("/lab");
}
