"use client";

import { DemoRows } from "../_houses";

/**
 * Bare render target for the two <iframe> frames on the room page. No
 * LabShell chrome here on purpose: an iframe carries its own real window, so
 * loading it at a 390px CSS width makes the mobile HousePicker (which reads
 * `window.matchMedia`) genuinely behave as it would on a phone, including
 * the bottom sheet being `position: fixed` to THIS frame's viewport rather
 * than the outer room page's.
 */
export default function HousesDemoPage() {
  return (
    <div className="min-h-dvh bg-background p-4">
      {/* Left-aligned and capped, not centered: this mirrors the real settings
          form's column width and leaves clear room to the trigger's right for
          the desktop popover to open into, the same as production. A row that
          spans the full iframe width would leave the popover nowhere to flip
          to on EITHER side and force it into the mobile-style fallback, which
          would misrepresent the real (wider) production layout. */}
      <div className="max-w-[620px]">
        <DemoRows />
      </div>
    </div>
  );
}
