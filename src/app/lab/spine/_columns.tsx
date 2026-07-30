"use client";

/* ------------------------------------------------------------------ *
 *  Column geometry, derived from source rather than eyeballed.
 *
 *  At a 1440px viewport the shell (src/components/layout/app-shell.tsx)
 *  is:
 *    sidebar 248px, then `mx-auto w-full max-w-[1280px]` with
 *    `lg:px-9`  (36px) on the FEED branch (the one with a right rail), and
 *    `lg:px-10` (40px) on every other route.
 *  1440 - 248 = 1192, which is under the 1280 cap, so mx-auto adds nothing
 *  and the padding lands directly against the sidebar.
 *
 *  Each route then adds its own `mx-auto max-w-Nxl`, which centres a
 *  narrower column inside that box. Tailwind: 2xl=672, 3xl=768, 4xl=896,
 *  5xl=1024.
 * ------------------------------------------------------------------ */

export const VIEWPORT = 1440;
export const SIDEBAR = 248;

type Branch = "feed" | "plain";

export type RouteGeom = {
  route: string;
  /** the mx-auto max-w-* the page adds, in px; null = fills the box */
  cap: number | null;
  capName: string;
  branch: Branch;
  /** the page-title style actually rendered */
  title: { size: number; weight: 400 | 700; tracking: string; source: string };
};

/** everything below is quoted from the route files, 2026-07-25 */
export const ROUTES: RouteGeom[] = [
  {
    route: "/feed",
    cap: null,
    capName: "none (grid + 318px rail)",
    branch: "feed",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/catchups",
    cap: null,
    capName: "none",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/directory",
    cap: 1024,
    capName: "max-w-5xl",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/collection",
    cap: 1024,
    capName: "max-w-5xl",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/groups",
    cap: 896,
    capName: "max-w-4xl",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/letters",
    cap: 768,
    capName: "max-w-3xl",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "PageHeader" },
  },
  {
    route: "/support",
    cap: 768,
    capName: "max-w-3xl",
    branch: "plain",
    title: { size: 30, weight: 700, tracking: "-0.02em", source: "hand-rolled h1" },
  },
  {
    route: "/about",
    cap: 768,
    capName: "max-w-3xl",
    branch: "plain",
    title: { size: 30, weight: 700, tracking: "-0.02em", source: "hand-rolled h1" },
  },
  {
    route: "/settings",
    cap: 768,
    capName: "max-w-3xl",
    branch: "plain",
    title: {
      size: 30,
      weight: 700,
      tracking: "-0.025em",
      source: "hand-rolled h1, no tracking class",
    },
  },
  {
    route: "/admin",
    cap: 1024,
    capName: "max-w-5xl",
    branch: "plain",
    title: {
      size: 30,
      weight: 700,
      tracking: "-0.025em",
      source: "hand-rolled h1, no tracking class",
    },
  },
  {
    route: "/messages",
    cap: 672,
    capName: "max-w-2xl",
    branch: "plain",
    title: { size: 30, weight: 400, tracking: "-0.02em", source: "inline copy of PageHeader's h1" },
  },
];

export function geom(r: RouteGeom) {
  const pad = r.branch === "feed" ? 36 : 40;
  const boxLeft = SIDEBAR + pad;
  const boxWidth = VIEWPORT - SIDEBAR - pad * 2;
  if (r.cap === null) {
    // the feed splits its box into a content column plus a 318px rail (30px gap)
    const width = r.branch === "feed" ? boxWidth - 318 - 30 : boxWidth;
    return { left: boxLeft, width };
  }
  const cap = Math.min(r.cap, boxWidth);
  return { left: boxLeft + Math.round((boxWidth - cap) / 2), width: cap };
}

export const EDGES = [...new Set(ROUTES.map((r) => geom(r).left))].sort((a, b) => a - b);

/* ------------------------------------------------------------------ *
 *  The diagram. Every route's content column drawn to scale on one
 *  1440px screen, which is the view you can never get in the product
 *  because you only ever see one page at a time.
 * ------------------------------------------------------------------ */

const ROW_H = 21;
const GAP = 4;
const RAIL = 318;
const RAIL_GAP = 30;

/* The proposal: one 1024px column, one left edge, on every route. The feed
   keeps its rail by splitting that same 1024 rather than by being wider than
   everything else. */
export const UNI_CAP = 1024;
const UNI_PAD = 40;
export const UNI_LEFT =
  SIDEBAR + UNI_PAD + Math.round((VIEWPORT - SIDEBAR - UNI_PAD * 2 - UNI_CAP) / 2);

function bars(r: RouteGeom, unified: boolean) {
  if (unified) {
    return r.route === "/feed"
      ? { left: UNI_LEFT, width: UNI_CAP - RAIL - RAIL_GAP, rail: UNI_LEFT + UNI_CAP - RAIL }
      : { left: UNI_LEFT, width: UNI_CAP, rail: null };
  }
  const g = geom(r);
  return {
    left: g.left,
    width: g.width,
    rail: r.route === "/feed" ? g.left + g.width + RAIL_GAP : null,
  };
}

export function ColumnDiagram({
  unified,
  width = 1060,
}: {
  /** show the proposal (one column) instead of what ships */
  unified: boolean;
  width?: number;
}) {
  const s = width / VIEWPORT;
  const bodyH = ROUTES.length * (ROW_H + GAP);
  const edges = unified ? [UNI_LEFT] : EDGES;

  return (
    <div className="relative" style={{ width, height: bodyH + 34 }}>
      {/* the sidebar, to scale, so the left edge means something */}
      <div
        className="absolute top-0 rounded-l-[3px] bg-[#235C49]"
        style={{ left: 0, width: SIDEBAR * s, height: bodyH }}
      />

      {/* One guide per distinct left edge. /feed (284) and /catchups (288) are
          4px apart, which is 3px on this scale, so their labels are dropped to a
          second row rather than printed on top of each other. */}
      {edges.map((e, i) => {
        const collides = i > 0 && (e - edges[i - 1]) * s < 26;
        return (
          <div key={e}>
            <div
              className="absolute top-0"
              style={{
                left: e * s,
                height: bodyH + (collides ? 12 : 0),
                width: 1,
                backgroundImage: `repeating-linear-gradient(to bottom, ${
                  unified ? "#1F8A4C" : "#C2622F"
                } 0 3px, transparent 3px 7px)`,
              }}
            />
            <span
              className="absolute -translate-x-1/2 text-[9.5px] font-bold tabular-nums"
              style={{
                left: e * s,
                top: bodyH + (collides ? 17 : 5),
                color: unified ? "#1F8A4C" : "#C2622F",
              }}
            >
              {e}
            </span>
          </div>
        );
      })}

      {ROUTES.map((r, i) => {
        const b = bars(r, unified);
        return (
          <div key={r.route}>
            <div
              className="absolute flex items-center rounded-[3px] border border-border bg-card px-1.5 transition-[left,width] duration-500 ease-out"
              style={{
                top: i * (ROW_H + GAP),
                left: b.left * s,
                width: b.width * s,
                height: ROW_H,
              }}
            >
              <span className="truncate text-[10.5px] font-semibold text-foreground/80">
                {r.route}
              </span>
            </div>
            {b.rail !== null && (
              <div
                className="absolute flex items-center justify-center rounded-[3px] border border-dashed border-border transition-[left] duration-500 ease-out"
                style={{
                  top: i * (ROW_H + GAP),
                  left: b.rail * s,
                  width: RAIL * s,
                  height: ROW_H,
                }}
              >
                <span className="text-[9px] text-muted-foreground">rail</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
