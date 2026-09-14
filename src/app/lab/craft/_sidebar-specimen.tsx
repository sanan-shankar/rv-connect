"use client";

/* ------------------------------------------------------------------ *
 *  A parameterised copy of the shipped desktop sidebar.
 *
 *  Every value in the `false` branch below is lifted verbatim from
 *  src/components/layout/sidebar.tsx as of 2026-07-25, so "Shipped" here
 *  really is what ships. Each flag flips exactly ONE property, so the
 *  causes can be attributed independently instead of being bundled into
 *  a single "looks nicer" claim.
 *
 *  Contrast figures in the comments are WCAG 2.1 relative-luminance
 *  ratios against the sidebar green #235C49.
 * ------------------------------------------------------------------ */

import {
  Newspaper,
  Notebook,
  Users,
  Images,
  Feather,
  MessagesSquare,
  HeartHandshake,
  Info,
  Settings,
} from "lucide-react";
import { Wordmark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";

const NAV = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Groups", icon: Users },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "Support", icon: HeartHandshake },
  { label: "About", icon: Info },
];

export type CraftFix = {
  /** opaque ink instead of a 70% alpha of #EBF3EE over the green */
  opaque: boolean;
  /** 14px instead of 14.5px */
  wholePx: boolean;
  /** strokeWidth 2 instead of 1.9 */
  wholeStroke: boolean;
  /** separate the hover and active steps, which are 0.1 apart today */
  ladder: boolean;
};

export const ALL_OFF: CraftFix = {
  opaque: false,
  wholePx: false,
  wholeStroke: false,
  ladder: false,
};
export const ALL_ON: CraftFix = {
  opaque: true,
  wholePx: true,
  wholeStroke: true,
  ladder: true,
};

export const FIXES: { k: keyof CraftFix; label: string; hint: string }[] = [
  { k: "opaque", label: "Opaque ink", hint: "#D3E2D9 instead of #EBF3EE at 70% alpha" },
  { k: "wholePx", label: "14px, not 14.5px", hint: "whole-pixel type" },
  { k: "wholeStroke", label: "Stroke 2, not 1.9", hint: "whole-pixel icon stroke" },
  { k: "ladder", label: "A real state ladder", hint: "pull hover and active apart" },
];

/* idle ink: shipped composites to #AFC6BD (4.31:1, under AA).
   #D3E2D9 is 5.80:1 and still clearly below the active row's white (7.78:1),
   so the hierarchy survives the contrast lift. */
const IDLE_ALPHA = "rgba(235, 243, 238, 0.70)";
const IDLE_OPAQUE = "#D3E2D9";
/* metadata ink: shipped is /55 => #91AFA4 at 3.29:1. #B4CBBE is 4.53:1. */
const META_ALPHA = "rgba(235, 243, 238, 0.55)";
const META_OPAQUE = "#B4CBBE";
/* the state ladder. Shipped hover (#2E6A55 at 55%) lands on #296450 = 1.124:1
   and shipped active (#2E6A55) on 1.226:1. Those two steps are 0.10 apart, so
   hovering reads as nothing and the active row reads as a hover. Pulling them
   to 1.23 and 1.47 gives three legible rungs. */
const HOVER_SHIPPED = "#296450";
const HOVER_FIXED = "#2E6A55";
const ACTIVE_SHIPPED = "#2E6A55";
const ACTIVE_FIXED = "#357760";

export function SidebarSpecimen({
  fix,
  active = "Catch-ups",
  /** render one row permanently in its hover state, since a screenshot cannot hover */
  hovering = "Letters",
  height = 492,
}: {
  fix: CraftFix;
  active?: string;
  hovering?: string | null;
  height?: number;
}) {
  const idleColor = fix.opaque ? IDLE_OPAQUE : IDLE_ALPHA;
  const metaColor = fix.opaque ? META_OPAQUE : META_ALPHA;
  const fontSize = fix.wholePx ? 14 : 14.5;
  const stroke = fix.wholeStroke ? 2 : 1.9;
  const hoverBg = fix.ladder ? HOVER_FIXED : HOVER_SHIPPED;
  const activeBg = fix.ladder ? ACTIVE_FIXED : ACTIVE_SHIPPED;

  return (
    <div
      className="flex w-[248px] shrink-0 flex-col gap-3 bg-[#235C49] px-4 pb-4 pt-5"
      style={{ height, fontFamily: "var(--font-body)" }}
    >
      <div className="flex justify-center">
        <Wordmark
          variant="two-plane"
          className="min-w-0"
          markClassName="shrink-0 text-[#EBF3EE]"
          textClassName="min-w-0 truncate text-[#EBF3EE]"
        />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const isActive = n.label === active;
          const isHover = !isActive && n.label === hovering;
          return (
            <span
              key={n.label}
              className="relative flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                fontSize: `${fontSize}px`,
                color: isActive ? "#FFFFFF" : idleColor,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {isActive && (
                <>
                  <span
                    className="absolute inset-0 z-0 rounded-xl"
                    style={{ background: activeBg }}
                  />
                  <span className="absolute left-[-8px] top-1.5 bottom-1.5 z-[1] w-[3px] rounded-sm bg-cinnamon" />
                </>
              )}
              {isHover && (
                <span
                  className="absolute inset-0 z-0 rounded-xl"
                  style={{ background: hoverBg }}
                />
              )}
              <n.icon
                className="relative z-[2] h-[18px] w-[18px] shrink-0"
                strokeWidth={stroke}
              />
              <span className="relative z-[2]">{n.label}</span>
            </span>
          );
        })}
      </nav>

      <div className="relative mt-auto">
        <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.07] p-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1">
            <BirdAvatar user={{ photoUrl: null, id: "sanan-second-look", name: "Sanan Shankar" }} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-none text-[#EBF3EE]">
                Sanan Shankar
              </div>
              <div
                className="mt-1 truncate text-[11px] leading-none"
                style={{ color: metaColor }}
              >
                sanan.v.shankar@g...
              </div>
            </div>
          </div>
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ color: idleColor }}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={stroke} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  A 3x crop of the same markup, so the difference is visible without
 *  putting your face against the monitor. It is a CSS scale on the real
 *  component, not a redrawn "enlarged" mock that could quietly cheat.
 * ------------------------------------------------------------------ */

const CROP_W = 210;
const CROP_H = 84;
const SCALE = 3;

export function ZoomCrop({ fix }: { fix: CraftFix }) {
  const idleColor = fix.opaque ? IDLE_OPAQUE : IDLE_ALPHA;
  const fontSize = fix.wholePx ? 14 : 14.5;
  const stroke = fix.wholeStroke ? 2 : 1.9;
  return (
    <div
      className="overflow-hidden rounded-xl bg-[#235C49]"
      style={{ height: CROP_H * SCALE }}
    >
      <div
        className="origin-top-left"
        style={{ transform: `scale(${SCALE})`, width: CROP_W, height: CROP_H }}
      >
        <div className="px-4 py-1" style={{ width: CROP_W, fontFamily: "var(--font-body)" }}>
          {[
            { l: "Directory", I: Notebook },
            { l: "Letters", I: Feather },
          ].map(({ l, I }) => (
            <span
              key={l}
              className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium"
              style={{ fontSize: `${fontSize}px`, color: idleColor }}
            >
              <I className="h-[18px] w-[18px] shrink-0" strokeWidth={stroke} />
              <span>{l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
