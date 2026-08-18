"use client";

/* Mounts the support aviary from the SHELL, not from the page, on the one
 * route that wears it. Two things forced this placement, both learned the
 * hard way:
 *
 * The page-transition template ((main)/template.tsx) animates a TRANSFORM,
 * and a transformed ancestor becomes the containing block for every
 * absolutely-positioned descendant. Rendered from the page, the wood spent
 * the entrance second anchored to the 768px column, then snapped to the full
 * content area when the transform cleared: the "birds rearrange a second
 * later" the owner saw. The shell's content div is outside the template, so
 * from here the anchor is right on the first frame.
 *
 * And the photo hide travels with it: the solid backdrop is a property of
 * the support room, so the one component that knows the route hides the
 * valley layer rather than leaving that to a style tag inside the page,
 * where it would flash during the same entrance.
 */

import { usePathname } from "next/navigation";
import { SupportWood } from "./wood";

export function SupportWoodMount() {
  const pathname = usePathname();
  if (pathname !== "/support") return null;
  return (
    <>
      {/* The owner's backdrop pick (2026-08-18): solid page behind /support,
          birds kept. Scoped here, so every other route keeps the photo. */}
      <style>{`.valley-tree { display: none; }`}</style>
      <SupportWood />
    </>
  );
}
