import { readFileSync } from "fs";
import { join } from "path";
import { ARCHETYPES } from "@/components/common/bird-avatar-v2";

// Always re-read the adjust file per request so the scripts/dev/centroid.mjs convergence loop sees fresh values
// (a static JSON import would be cached by the dev server between iterations).
export const dynamic = "force-dynamic";

function transformFor(adj?: { x?: number; y?: number; s?: number }): string | undefined {
  if (!adj) return undefined;
  const s = adj.s ?? 1;
  const x = adj.x ?? 0;
  const y = adj.y ?? 0;
  return `translate(${x} ${y}) translate(50 50) scale(${s}) translate(-50 -50)`;
}

/**
 * Dev-only harness for the optical-centering script (scripts/dev/centroid.mjs). Renders ONE bird glyph alone
 * on a transparent background at 600x600 (viewBox 0..100) so the script can rasterize it and
 * compute the true pixel centroid + bounding box. No disc, no chrome.
 */
export default async function CentroidProbe({
  searchParams,
}: {
  searchParams: Promise<{ i?: string; flip?: string; pad?: string }>;
}) {
  const sp = await searchParams;
  const i = ((Number(sp?.i ?? 0) % ARCHETYPES.length) + ARCHETYPES.length) % ARCHETYPES.length;
  const a = ARCHETYPES[i];
  const adjustMap = JSON.parse(
    readFileSync(join(process.cwd(), "src/components/common/bird-adjust.json"), "utf8"),
  ) as Record<string, { x?: number; y?: number; s?: number }>;
  // Mirrors BirdGlyphV2's own flip: an outer group around the (already-adjusted) bird, not folded
  // into transformFor's scale -- scripts/dev/generate-bird-photos.mjs needs both poses of each
  // archetype and this is the one place that draws a bird outside that component.
  const flip = sp?.flip === "1";
  // pad=1 widens the frame by 12.5 units a side: a Kingfisher's bill or a Coucal's tail runs past
  // the 100-unit box, which an avatar clips at its own edge unseen, but a contact photo shows the
  // bird inside a disc where that cut would float in mid-air.
  const viewBox = sp?.pad === "1" ? "-12.5 -12.5 125 125" : "0 0 100 100";
  const inner = <g transform={transformFor(adjustMap[a.name])}>{a.draw()}</g>;
  return (
    <div
      data-count={ARCHETYPES.length}
      data-name={a.name}
      style={{ margin: 0, padding: 0, background: "transparent", width: 600, height: 600 }}
    >
      <svg width={600} height={600} viewBox={viewBox} style={{ display: "block" }}>
        {flip ? <g transform="translate(100 0) scale(-1 1)">{inner}</g> : inner}
      </svg>
    </div>
  );
}
