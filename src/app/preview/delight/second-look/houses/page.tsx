"use client";

import { LabShell, Rule, Tell, Ledger, Mount, Verdict } from "../_kit";
import {
  ShippedEditor,
  DirectionRun,
  DirectionRollCall,
  DirectionQuiet,
  FAMILIES,
  houseTint,
} from "./_houses";

export default function HousesRoom() {
  return (
    <LabShell
      title="The houses picker, as a game"
      lede="You asked for this one by name. The surprise is that the shipped picker is already efficient: the auto-advance is one of the best-argued pieces of code in the app. What is wrong is the question it asks, five times, about a fact you only have once."
    >
      <Tell
        stats={[
          { n: "22", of: "houses, in one flat uncoloured list, in no searchable order" },
          { n: "5", of: "identical scans of that list to state one fact", tone: "plain" },
          { n: "0", of: "ways to say 'the same as last year'" },
          { n: "1", of: "click, in the best of the three alternatives below", tone: "good" },
        ]}
      >
        <p>
          A house history is not a list of years. It is a small number of <b>runs</b>, and for most
          people it is exactly one: you were in Neem, and then you left. The editor asks
          &quot;which house in 2014-15?&quot;, then &quot;which house in 2015-16?&quot;, and so on,
          which is the right question only for the rare person who moved every year.
        </p>
        <p>
          Credit where it is due first, because this must survive any rethink:{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">advanceHouseYear</code> opens
          the next unfilled year the moment you pick one, so there is no dismiss click between years.
          Somebody thought hard about that and wrote down why. Every option below keeps its spirit.
        </p>
      </Tell>

      {/* ---------------------------------------------------------- */}
      <Rule nav="The families">The list has structure the grid throws away</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        The 22 houses are not an arbitrary set. Six are literally colour names, nine are trees and
        flowers of the valley, six are mountains and rivers, and one is an ancient city. All 22 render
        as the same beige pill in owner order, so every pick is an unaided linear scan of a 22-target
        grid. Grouping them into the four families they already belong to turns that into a four-group
        scan, and the app <b>already owns</b> a per-house colour map (
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">houseTint()</code>, used in the
        onboarding journey chain) that this picker does not use.
      </p>

      <Mount tone="pick" label="The same 22, grouped and coloured" note="No new colour system: this is the app's existing houseTint(), applied where it was already needed.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FAMILIES.map((f) => (
            <div key={f.label}>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {f.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {f.houses.map((h) => (
                  <span
                    key={h}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1.5 pr-2.5 text-[14px] font-semibold"
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ background: houseTint(h) }}
                      aria-hidden
                    />
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Mount>

      <p className="mt-5 max-w-[74ch] text-[17px] leading-[1.65]">
        One caveat, because the swatches above do not quite hold up under counting. Six houses are
        literal colour names and get the right hex. The other sixteen hash into a pool of ten, so the
        22 houses resolve to only <b>12 distinct colours</b>, and <b>six of them share one magenta</b>{" "}
        (Neem, Raavi, Meru, Trishul, Takshila and Alamanda). In the profile journey chain, where a
        person has two or three spans, that almost never shows. In a 22-swatch palette it shows
        immediately.
      </p>
      <p className="mt-3 max-w-[74ch] text-[17px] leading-[1.65] text-muted-foreground">
        So the <b>grouping</b> is what does the work of finding a house, not the colour. The colour is
        for recognising your own house later, in the ribbon, where only one or two are on screen. If
        colour is ever meant to carry more than that, the pool needs to grow from ten to at least
        sixteen, which is a two-line change in{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">houses-step.tsx</code>.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Shipped">What ships, reproduced</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        Five academic years for someone who joined in 2014 and left in 2019. All four editors below
        are live and count your interactions. Try the honest common case first: <b>one house the
        whole time</b>. Then try it again as someone who moved once.
      </p>

      <Mount
        tone="shipped"
        note="The real flow, including the auto-advance. One click to open, then one per year."
      >
        <ShippedEditor />
      </Mount>

      {/* ---------------------------------------------------------- */}
      <Rule nav="A · the run">A · the run</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        Ask the question the data is actually shaped like. Your first pick paints the entire career,
        because that is what usually happened. If you moved, click the year you moved and pick again,
        and the run splits there. The ribbon is the answer and the input at the same time, so there is
        nothing to read back and check.
      </p>

      <Mount tone="pick" label="A · the run" note="One house throughout: 1 interaction. Two houses: 3.">
        <DirectionRun />
      </Mount>

      {/* ---------------------------------------------------------- */}
      <Rule nav="B · roll call">B · roll call</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        Keep the year-by-year rhythm, because being asked about each year in turn is oddly pleasant
        and it is how the school itself would have done it. What changes is that after the first
        answer, the likely one is a single large target with the house colour on it, not a 22-pill
        scan. This is slower than A and that is the point: it confirms each year out loud.
      </p>

      <Mount tone="option" label="B · roll call" note="One house throughout: 5. Only the first needs a scan.">
        <DirectionRollCall />
      </Mount>

      {/* ---------------------------------------------------------- */}
      <Rule nav="C · quiet">C · the quiet one</Rule>

      <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
        The counterweight, because some people will not want a game in a settings form at 11pm. Type
        two letters, press Enter. Every later year arrives pre-filled with the previous house, so
        Enter alone accepts it. It also happens that <b>two letters uniquely identifies all 22
        houses</b>: one letter collides seven times, two never collides at all.
      </p>

      <Mount tone="option" label="C · the quiet one" note="One house throughout: 2 letters and 5 Enters, no mouse at all.">
        <DirectionQuiet />
      </Mount>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Counted">Counted, not asserted</Rule>

      <Ledger
        firstCol="34%"
        cols={["", "Shipped", "A · run", "B · roll call", "C · quiet"]}
        rows={[
          {
            k: "One house, five years",
            v: ["6 clicks", "1 click", "5 clicks", "2 letters, 5 Enters"],
            bad: [0],
            good: [1],
          },
          {
            k: "Two houses, moved once",
            v: ["6 clicks", "3 clicks", "6 clicks", "4 letters, 5 Enters"],
            bad: [0],
            good: [1],
          },
          {
            k: "Scans of the 22-item list",
            v: ["5", "1", "1", "0"],
            bad: [0],
            good: [3],
          },
          {
            k: "Answer visible while answering",
            v: ["no, the panel covers the rows", "yes", "yes", "yes"],
            bad: [0],
          },
          {
            k: "Works with no mouse",
            v: ["partly", "partly", "partly", "fully"],
            good: [3],
          },
          {
            k: "Handles 'I cannot remember'",
            v: ["no", "yes", "yes", "not yet"],
            bad: [0],
          },
        ]}
      />

      <p className="mt-5 max-w-[74ch] text-[17px] leading-[1.65] text-muted-foreground">
        The shipped count is not bad, which is exactly why this never got looked at. Six clicks for
        five years is a reasonable-sounding number. The cost is not in the clicks, it is in the five
        identical 22-target scans hiding inside them, and in the fact that a person who was in one
        house for their whole childhood has to answer as though they were not.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Mobile">On mobile</Rule>

      <div className="grid max-w-[74ch] gap-4 text-[17px] leading-[1.65]">
        <p>
          <b>A</b> degrades best. Measured at a 390px viewport, the five year cells come out{" "}
          <b>57 by 65px</b> each, comfortably over the 44px touch minimum, and the palette reflows to
          two family columns. The split gesture is a tap, not a drag, specifically so it works with a
          thumb. Six or seven school years would still fit; more than that should scroll the ribbon
          rather than shrink the cells.
        </p>
        <p>
          <b>B</b> is arguably the best on a phone, because the primary target is one big pill rather
          than a grid, and the shipped picker&apos;s worst mobile problem (a popover that covers the
          rows it is asking about) does not exist when the answer is a single button.
        </p>
        <p>
          <b>C</b> is desktop-first by definition. On a phone the type-ahead still works but the
          keyboard covers half the screen, so it should not be the default there.
        </p>
      </div>

      <Verdict>
        <p>
          <b>Ship A, the run.</b> It is the only one that changes the question rather than decorating
          it, it is one interaction for the common case, and the ribbon doubles as the readback so
          there is nothing to verify afterwards. It also matches what the profile already draws: a
          person&apos;s houses render as a chain of tinted spans, so the editor and the display would
          finally be the same picture.
        </p>
        <p>
          <b>Steal the big &quot;Neem again&quot; target from B</b> for the case where someone starts
          splitting a lot: once a run is broken into three or more pieces, the year-by-year confirm is
          the friendlier mode, and it is the better mobile fallback.
        </p>
        <p>
          <b>Steal the type-ahead from C</b> as the keyboard path for A. Two letters resolving all 22
          houses is too good a fact to leave on the floor, and it makes the picker fully operable
          without a pointing device, which the shipped one is not.
        </p>
        <p>
          <b>Group and colour the palette regardless of which one wins.</b> That is a change to the
          existing picker on its own, costs nothing, reuses{" "}
          <code>houseTint()</code> which already exists, and removes the 22-target scan from every
          route through this feature.
        </p>
        <p className="text-muted-foreground">
          Keep the auto-advance. Keep the pre-seeded year rows from yearJoined and yearLeft, which
          mean nobody ever types a year. Those two decisions are why this was already good, and none
          of the above touches them.
        </p>
      </Verdict>
    </LabShell>
  );
}
