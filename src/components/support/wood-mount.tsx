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
 * And the backdrop travels with it: the solid page is a property of the
 * support room, so the one component that knows the route hides the valley
 * layer rather than leaving that to a style tag inside the page, where it
 * would flash during the same entrance.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SupportWood } from "./wood";

export function SupportWoodMount({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  /* TEMPORARY DECISION AID (owner, 2026-08-18): flips /support between the
     two candidate backdrops, "solid page + birds" and "valley photo, no
     birds", so he can compare them live. Admin eyes only; hard-code the
     winner and delete the button, this state and the aviary=false branch
     once he calls it. */
  const [aviary, setAviary] = useState(true);

  if (pathname !== "/support") return null;
  return (
    <>
      {aviary ? (
        <>
          <style>{`.valley-tree { display: none; }`}</style>
          <SupportWood />
        </>
      ) : null}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setAviary((v) => !v)}
          className="state-layer fixed bottom-[var(--space-m)] right-[var(--space-m)] z-40 inline-flex items-center rounded-full border border-border bg-card px-[var(--space-m)] py-[var(--space-s)] text-xs font-semibold text-muted-foreground shadow-[0_6px_16px_-12px_rgb(36_26_18/0.5)] transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {aviary ? "Try: tree, no birds" : "Try: solid + birds"}
        </button>
      )}
    </>
  );
}
