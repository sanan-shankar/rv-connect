"use client";

import { LabShell, Rule, Tell, Mount, Verdict } from "../_second-look-kit";

export default function HousesRoom() {
  return (
    <LabShell
      title="The houses picker, refined"
      lede="Same interaction the owner liked: year rows, tap a year, pick a house, auto-advance to the next unfilled one. Nothing about the question changed. What changed is where the panel sits on a phone, the radii around it, and how the panel lays out its 22 houses."
    >
      <Tell
        label="What this pass touched"
        tone="leaf"
        stats={[
          { n: "0", of: "new colours. No per-house tint, no family grouping -- one calm neutral row, selected reads canopy.", tone: "plain" },
          { n: "1", of: "shell swap: below 1024px the panel is now a bottom sheet, not a popover that opened over the rows it was asking about." },
          { n: "44px", of: "minimum touch target through the panel, up from 40.", tone: "good" },
          { n: "16 / 12 / 8", of: "the radius ladder that now actually holds: group, picker, year chip.", tone: "good" },
        ]}
      >
        <p>
          The previous version of this room proposed a different question entirely: runs instead of
          years, a four-family colour taxonomy, a type-ahead alternative. The owner said no to all three in
          one sitting -- the shipped, year-by-year flow with auto-advance is what they wanted, they just
          wanted it to look and feel considered, and to stop covering the row it was asking about on a
          phone. That is the whole brief for this pass. Nothing below is a new interaction; it is the same
          one, refined.
        </p>
      </Tell>

      <Rule nav="Live">Live, side by side</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        Both frames below are the real, shipped{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">HousePicker</code>, each loaded in its
        own iframe rather than a CSS trick, because the picker reads the real{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">window</code> width to decide its
        shell: an iframe carries its own window, so a 390px one is a genuine phone-width viewport and a
        1040px one is a genuine desktop one, side placement and bottom sheet included. Try the honest
        common case in each: tap 2014-15, pick a house, watch the panel close and the next row open on its
        own.
      </p>

      <div className="space-y-8">
        <Mount
          tone="shipped"
          label="Desktop · 1040px"
          note="The panel still opens to the side here -- that placement was never the problem, so it did not change. Scrolls horizontally below the breakpoint where this room's own column gets narrower than the frame."
        >
          <div className="overflow-x-auto">
            <iframe
              src="/lab/houses/demo"
              style={{ width: 1040 }}
              className="h-[420px] rounded-[calc(var(--radius)-4px)] border border-border bg-background"
              title="Houses picker, desktop"
            />
          </div>
        </Mount>
        <Mount
          tone="pick"
          label="Mobile · 390px"
          note="Bottom sheet, not a popover. The row stays visible above it, and the sheet restates the year as its own title."
        >
          <iframe
            src="/lab/houses/demo"
            style={{ width: 390 }}
            className="mx-auto h-[560px] rounded-[calc(var(--radius)-4px)] border border-border bg-background"
            title="Houses picker, mobile"
          />
        </Mount>
      </div>

      <Rule nav="What changed">What actually changed</Rule>

      <div className="grid max-w-[76ch] gap-3 text-[17px] leading-[1.65]">
        <p>
          <b>Where the panel sits on a phone.</b> Below 1024px the panel used to open as a popover
          anchored under the trigger, side=&quot;bottom&quot;, which with 22 houses to show routinely ran past
          the bottom of the screen and sat on top of the very rows it was asking about -- the exact
          complaint. It is now the same bottom sheet the Directory and Collection filters already use
          (shared, not rebuilt): fixed to the viewport, its own scroll, a backdrop, and the year restated as
          the sheet&apos;s own title so the question is never ambiguous even if the row underneath has
          scrolled out of view.
        </p>
        <p>
          <b>The eye follows.</b> Opening a year -- including the auto-advance jump straight to the next
          unfilled one -- now scrolls that row into view, so the run visibly moves forward instead of the
          next question just appearing somewhere you have to go hunting for.
        </p>
        <p>
          <b>The radii.</b> The settings and onboarding rows around this picker used to nest a 20.8px tile
          inside a 20.8px card, around a 16px year box, around a 12px picker, around a pill: radii running
          in every direction at once. It is now a strict ladder -- 16px group, 12px picker, 8px year chip,
          8.8px rows inside the panel -- and no two nested surfaces share a number.
        </p>
        <p>
          <b>The panel body.</b> The 22 houses used to render as a two-column wall of bordered pills; they
          are now two quiet columns of plain text rows in the canonical order, flowing down the first
          column then the second. No idle border, no idle fill -- hover lifts, and a picked house reads
          canopy with a small leading check. The trigger shows the answer as plain text
          (&quot;Alamanda · Jacaranda&quot;) instead of nested pills, so a two-house year never wraps the
          row. Touch targets stay 44px minimum throughout, up from 40.
        </p>
        <p className="text-muted-foreground">
          <b>What did not change:</b> the question (year by year), the auto-advance, the flat uncoloured
          list in the owner&apos;s canonical order, and the &quot;Not listed?&quot; free-text escape hatch.
        </p>
      </div>

      <Verdict>
        <p>
          The picker asks the same question it always did, in the same order, with the same auto-advance.
          What changed is narrower than a redesign: a phone no longer has to fight the panel to see what it
          is answering, the radii finally form one system instead of four competing ones, and the panel
          reads as one intentional list instead of a wall of lozenges.
        </p>
      </Verdict>
    </LabShell>
  );
}
