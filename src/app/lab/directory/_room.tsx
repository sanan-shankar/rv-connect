"use client";

/* ------------------------------------------------------------------ *
 *  The directory, reconsidered.
 *
 *  One room, two halves: the chrome (search, filters, sort, the view
 *  switch) and the map. Everything is live against synthetic members at
 *  four sizes, and every claim about height, row count or object count
 *  is measured in the browser rather than asserted.
 *
 *  Nothing in this room is wired to the app. It reads no live data and
 *  writes no live file. `src/components/directory/*` and
 *  `src/components/common/filters/*` are untouched.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { LabShell, Rule, Tell, Ledger, Verdict, Controls, Pick } from "../_second-look-kit";
import {
  applyFilters, batchCounts, cityPoints, membersForScale, sortMembers,
  SCALES, EMPTY_FILTERS,
  type Filters, type SortKey,
} from "./_data";
import {
  ChromeBench, ChromeContent, ChromeNowrap, ChromeSentence, ChromeTyped,
  SortControl, STRESS, type Mode, type StressKey,
} from "./_chrome";
import { MapCircles, MapTiers, MapLabels, MapGazetteer, MapChoropleth, ObjectCount } from "./_maps";
import { Measured, ResultGrid } from "./_people";
import { CodeBlock, EXPORT_SHAPE, IMPORT_SHAPE, PROMPT, TaggingDemo } from "./_profession";

/** One independent filter/mode/sort state per concept, reset whenever the
 *  stress control changes, so all four start from the same place and can
 *  then be played with separately. */
function useConcept(stress: StressKey) {
  const seed = STRESS.find((s) => s.k === stress)!.f;
  const [filters, setFilters] = useState<Filters>(seed);
  const [mode, setMode] = useState<Mode>("list");
  const [sort, setSort] = useState<SortKey>("newest");
  const [seenStress, setSeenStress] = useState(stress);

  if (seenStress !== stress) {
    // Derive-during-render rather than an effect: an effect would paint one
    // frame of the previous filter set before correcting itself, and with
    // four concepts on screen that flash is very visible.
    setSeenStress(stress);
    setFilters(seed);
  }

  return {
    filters,
    set: (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })),
    onClearAll: () => setFilters(EMPTY_FILTERS),
    mode, setMode, sort, setSort,
  };
}

export type Density = "shipped" | "compact" | "row" | "ruled";

/**
 * The room. Its three knobs are deep-linkable, the same way /lab/profiles
 * takes `?v=`: `?n=2400&stress=worst&density=ruled` is a shareable state and
 * is how the screenshot script reaches the scales that matter.
 *
 * The query string is parsed by the SERVER component in page.tsx and handed
 * down as props. Two earlier attempts were wrong and are worth recording:
 * a lazy `useState` initialiser reading `window.location.search` hydration
 * errored on every parameterised load (this is a client component that Next
 * still renders on the server, so the two passes disagreed), and moving it
 * into an effect traded that for a `react-hooks/set-state-in-effect` error
 * plus a frame of the wrong scale. Reading it where the request already is
 * costs neither.
 */
export default function DirectoryRoom({
  initialScale = 120,
  initialStress = "two",
  initialDensity = "row",
}: {
  initialScale?: number;
  initialStress?: StressKey;
  initialDensity?: Density;
}) {
  const [scaleN, setScaleN] = useState<number>(initialScale);
  const [stress, setStress] = useState<StressKey>(initialStress);
  const [density, setDensity] = useState<Density>(initialDensity);

  const members = useMemo(() => membersForScale(scaleN), [scaleN]);
  const points = useMemo(() => cityPoints(members), [members]);
  const batches = useMemo(() => batchCounts(members), [members]);

  const a = useConcept(stress);
  const b = useConcept(stress);
  const c = useConcept(stress);
  const d = useConcept(stress);

  const countFor = (f: Filters) => applyFilters(members, f).length;

  // The people section always shows the same twelve so the density figures
  // compare like with like.
  const sample = useMemo(() => sortMembers(members, "newest").slice(0, 12), [members]);

  const [mapSort, setMapSort] = useState<SortKey>("newest");
  const [pickedCity, setPickedCity] = useState<string | null>(null);

  return (
    <LabShell
      title="The directory, reconsidered"
      lede="Your words: for any selection of filters the UI is absolutely cursed. That turned out to be true for a structural reason, and the same read found a filter that cannot match anybody in the database. Two halves here: the chrome, and the map."
    >
      <style>{`
        @keyframes labPopIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .lab-pop-in { animation: labPopIn 140ms var(--ease-pop); }
      `}</style>

      <Tell
        stats={[
          { n: "40 to 142px", of: "how much vertical space the toolbar takes as you go from no filters to four. Setting one filter costs 50px." },
          { n: "3", of: "control rows at 1440 with four filters set. Two of them are right-aligned against a left-aligned one." },
          { n: "275px", of: "of empty space on line one, at 1440 with the two filters in your screenshot, while the sort and filter controls sit alone on line two." },
          { n: "50px", of: "the search box jumps sideways the instant a filter appears, because a back arrow takes its place." },
          { n: "0 of 21", of: "members the Profession filter can match. Not a bug in the query. Nothing in the column is a profession.", tone: "bad" },
          { n: "3", of: "separate places a set filter is drawn at once: the bar pill, the empty-state chip row, and a count on More filters.", tone: "plain" },
        ]}
      >
        <p>
          The bar is not badly styled. It is <b>structurally unable</b> to hold its shape. Line 353 of{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">directory-client.tsx</code> is a{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">flex-wrap</code> row containing an{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">ml-auto</code> subgroup. Those two
          together produce your screenshot on their own, with no help from anything else.
        </p>
        <p>
          A set pill is wider than an idle one, because it grows from{" "}
          <b>Profession</b> to <b>Profession: Technology ×</b>. So picking a filter widens line one, the
          right-hand group no longer fits, it wraps, and <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">ml-auto</code>{" "}
          then slams it to the far right of the new line. That is the random gap in the middle: it is
          not random, it is <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">ml-auto</code> on
          a wrapped line, and it is 275px wide.
        </p>
        <p>
          Everything else follows from the same place. More filters cannot open in the bar, so it opens a
          third row. The view switch cannot sit in the bar, so it takes a fourth. The count takes a
          fifth. By the time you have four filters set, the page spends 291px before the first person
          appears.
        </p>
      </Tell>

      <Rule nav="Measured">The bar, measured</Rule>
      <p className="mb-6 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Read off the live page with{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">scripts/qa/_dir-chrome-probe.mjs</code>,
        which walks every input and button in the toolbar and groups them by their top edge. A row here
        means a row you can see.
      </p>
      <Ledger
        cols={["Filters set", "1440", "1280", "1024", "Where the first person starts"]}
        firstCol="26%"
        rows={[
          { k: "None", v: ["40px, 1 row", "40px, 1 row", "90px, 2 rows", "189px"], bad: [2] },
          { k: "One", v: ["90px, 2 rows", "90px, 2 rows", "90px, 2 rows", "239px"], bad: [0, 1, 2] },
          { k: "Two (your screenshot)", v: ["90px, 2 rows", "90px, 2 rows", "90px, 2 rows", "239px"], bad: [0, 1, 2] },
          { k: "Four plus a query", v: ["142px, 3 rows", "142px, 3 rows", "142px, 3 rows", "291px"], bad: [0, 1, 2, 3] },
        ]}
      />
      <p className="mt-5 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">
        The 1024 row is the one worth staring at: with <b>nothing selected at all</b>, the bar is already
        two rows. The single-row state everyone designs against only exists above about 1090px and only
        while the directory is untouched.
      </p>
      <p className="mt-3 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">
        One small thing the probe caught in passing: the button renders as{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">More filters· 1</code>, with no space
        before the dot. JSX drops the newline between the label and the{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">{"{count}"}</code> expression, so the
        two strings concatenate.
      </p>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="Four chromes">Four ways to hold it</Rule>
      <p className="mb-4 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        All four are live. Flip the stress control and watch which ones change height. That is the whole
        test: a design that grows a row when you pick a filter will always, eventually, produce your
        screenshot.
      </p>

      {/* Each Controls bar is wrapped in its own block. A sticky element is
          released by its PARENT scrolling out of view, and all three bars were
          direct children of one long <main>, so they stayed pinned at the same
          top-[100px] for the whole page and stacked on top of each other. */}
      <div className="relative">
      <Controls>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Stress</span>
          <Pick
            items={STRESS.map((s) => ({ k: s.k, label: s.label }))}
            value={stress}
            onChange={setStress}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Members</span>
          <Pick
            items={SCALES.map((s) => ({ k: String(s.n), label: s.label }))}
            value={String(scaleN)}
            onChange={(k) => setScaleN(Number(k))}
          />
        </div>
      </Controls>

      <div className="space-y-8">
        <ChromeBench
          label="A · Nowrap"
          tone="option"
          note="the smallest possible repair, here to be beaten"
        >
          <ChromeNowrap {...a} members={members} count={countFor(a.filters)} />
        </ChromeBench>

        <ChromeBench
          label="B · The sentence"
          tone="pick"
          note="filters cost zero rows, because the count line was always there"
        >
          <ChromeSentence {...b} members={members} count={countFor(b.filters)} />
        </ChromeBench>

        <ChromeBench
          label="C · The content filters itself"
          tone="option"
          note="no filter control at all; you narrow by touching what you can see"
        >
          <ChromeContent {...c} members={members} count={countFor(c.filters)} />
        </ChromeBench>

        <ChromeBench
          label="D · Type to filter"
          tone="option"
          note='a layer on top of B. Try "ben", "tech", "2009", "lon"'
        >
          <ChromeTyped {...d} members={members} count={countFor(d.filters)} />
        </ChromeBench>
      </div>

      <Rule nav="Narrow">The same two, at the widths that actually break</Rule>
      <p className="mb-5 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        A and B are the same height at 1440, so the argument for B has to be made somewhere else. Here
        it is. These are the real column widths the probe measured: <b>696px</b> is what the directory
        column is at a 1024 laptop, and <b>350px</b> is a phone. Set the stress to four filters and watch
        A run off its own edge while B holds. A spends its width on pills; B spends it on the search box
        and keeps the facets in a panel, which is why one of them has somewhere to put a sixth facet and
        the other does not.
      </p>
      {/* The 696 pair is STACKED, not two-up. The room's measure is 1240 with
          36px gutters, so a two-column grid gives each column about 584px, and
          a 696px specimen inside one would be clipped by its own bench: the
          concept would look broken because of the page holding it, which is
          the one thing a comparison bench must never do. The 350 pair fits
          two-up with room to spare. */}
      <div className="space-y-8">
        <ChromeBench label="A · Nowrap, at 696" tone="option" width={696}>
          <ChromeNowrap {...a} members={members} count={countFor(a.filters)} />
        </ChromeBench>
        <ChromeBench label="B · The sentence, at 696" tone="pick" width={696}>
          <ChromeSentence {...b} members={members} count={countFor(b.filters)} />
        </ChromeBench>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <ChromeBench label="A · Nowrap, at 350" tone="option" width={350}>
          <ChromeNowrap {...a} members={members} count={countFor(a.filters)} narrow />
        </ChromeBench>
        <ChromeBench label="B · The sentence, at 350" tone="pick" width={350}>
          <ChromeSentence {...b} members={members} count={countFor(b.filters)} narrow />
        </ChromeBench>
      </div>

      <div className="mt-10">
        <Ledger
          cols={["", "Rows, nothing set", "Rows, four set", "Grows when you filter?", "Room for a sixth facet?"]}
          firstCol="24%"
          rows={[
            { k: "Shipped", v: ["1 (2 at 1024)", "3", "Yes, by 102px", "No"], bad: [2, 3] },
            { k: "A · Nowrap", v: ["2", "2", "No", "No, the pills are the budget"], good: [2], bad: [3] },
            { k: "B · The sentence", v: ["2", "2", "No", "Yes, the panel scrolls"], good: [2, 3] },
            { k: "C · Content", v: ["2 (3 idle)", "2", "No", "Yes, but undiscoverable"], good: [2] },
            { k: "D · Typed", v: ["2", "2", "No", "Yes"], good: [2, 3] },
          ]}
        />
      </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="Back button">The back arrow, and why it goes away</Rule>
      <p className="max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Your description was exact: pick a batch, a People tab appears, the search box slides right to
        make room for an arrow, and the arrow does not take you back, it resets everything. All three
        are the same mistake, which is that <b>the view switch is being used as navigation</b>.
      </p>
      <p className="mt-3 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        In every concept above, Map, Batches and List are three <b>views of one result set</b>, not three
        places. The set of segments never changes, so nothing pops in and nothing reorders. Narrowing to
        a batch is a filter like any other, so it appears as a token in the count line and you undo it by
        clicking its ×. There is nothing to go back from, so there is no arrow to make room for, so the
        search box never moves. The 50px sideways jump has no cause left.
      </p>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="Sort">Sort, without the colon</Rule>
      <p className="mb-5 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Two separate things were wrong. The label read like a database column, and the list carried four
        options that are really two options and a direction. Name A-Z and Name Z-A go, as you said. What
        is left is three keys, and the trigger stays an icon until you move off the default, so the
        control costs nothing until it is doing something.
      </p>
      <div className="flex flex-wrap items-start gap-10">
        <div>
          <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Shipped</div>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-secondary px-4 text-[13px] font-medium text-foreground">
            Sort: Batch newest first
            <svg viewBox="0 0 12 12" className="size-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 4.5 6 7.5 9 4.5" /></svg>
          </span>
          <p className="mt-3 max-w-[30ch] text-[14px] leading-snug text-muted-foreground">
            186px of bar to say one word. Five options, two of which you do not want.
          </p>
        </div>
        <div>
          <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-leaf">Proposed</div>
          <div className="flex items-center gap-3">
            <SortControl value={mapSort} onChange={setMapSort} />
            <span className="text-[13.5px] text-muted-foreground">
              {mapSort === "newest" ? "resting: 44px, icon only" : "changed: it says so"}
            </span>
          </div>
          <p className="mt-3 max-w-[34ch] text-[14px] leading-snug text-muted-foreground">
            Open it. Recently joined, Batch newest, Batch oldest, Name. The tick marks the current one,
            so the trigger does not have to.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="People">The people, more compact</Rule>
      <p className="mb-5 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Your note: the cards are too big, there is too much white space, and the bird should sit beside
        the name rather than above it. Here are four densities on the same twelve people, each printing
        what it actually costs.
      </p>

      <div className="relative">
      <Controls>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Density</span>
          <Pick
            items={[
              { k: "shipped" as const, label: "Shipped card" },
              { k: "compact" as const, label: "Compact card" },
              { k: "row" as const, label: "Row" },
              { k: "ruled" as const, label: "Ruled list" },
            ]}
            value={density}
            onChange={setDensity}
          />
        </div>
      </Controls>

      <div className="rounded-2xl border border-border bg-mist p-5">
        <Measured
          label={
            density === "shipped" ? "Shipped card"
              : density === "compact" ? "Compact card, avatar left"
                : density === "row" ? "Row, no box"
                  : "Ruled list, columns"
          }
          count={12}
        >
          <ResultGrid members={sample} variant={density} />
        </Measured>
      </div>
      <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">
        The shipped card puts a 64px avatar above centred text; the avatar is a profile-header size doing
        list work, and centring guarantees the name, the batch and the city all start at a different x,
        so a column of them cannot be scanned. Every alternative moves the bird left and the text beside
        it, which is what you asked for and also what makes a vertical scan possible.
      </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="The map">The map, five ways</Rule>
      <p className="mb-5 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Your worry is a scaling one, so the number under each map is the one that matters: how many
        separate things it puts on screen that you could aim at. Push the member count up and watch which
        designs hold still. A design whose object count is bounded by the <b>zoom level</b> cannot become
        unmanageable. A design whose object count tracks the <b>data</b> always will.
      </p>

      <div className="relative">
      <Controls>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Members</span>
          <Pick
            items={SCALES.map((s) => ({ k: String(s.n), label: s.label }))}
            value={String(scaleN)}
            onChange={(k) => setScaleN(Number(k))}
          />
        </div>
        <span className="text-[13.5px] text-muted-foreground">
          {members.length} members across <b className="font-semibold text-foreground">{points.length}</b> places
          {pickedCity && (
            <>
              {" · picked "}
              <b className="font-semibold text-canopy">{pickedCity}</b>
            </>
          )}
        </span>
      </Controls>

      <div className="space-y-10">
        <ObjectCount label="1 · Counted circles, repaired">
          <MapCircles points={points} onPick={setPickedCity} />
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            The shipped family with its stated failures addressed: discs are pushed apart by a
            relaxation pass (with a hairline back to the true coordinate whenever that moved a pin
            further than its own radius, so the map never quietly lies), counts moved out of the disc
            onto a paper chip so they stay legible at any size, and a 44px hit area behind every marker.
            At 32 and 120 members it is a real improvement on what ships.
          </p>
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            Now push the member count to <b>2400</b> and look at south India. The separation pass runs
            four iterations, and past a certain density four is not enough: the discs go back to
            touching, the counts crowd, and the leader lines start crossing. More iterations do not
            rescue it, they just move the pile somewhere else, because the pass is being asked to fit
            more ink into the region than the region has room for. That is the ceiling of the whole
            approach, and it is the thing you were right to be suspicious of.
          </p>
        </ObjectCount>

        <ObjectCount label="2 · Semantic tiers">
          <MapTiers points={points} onPick={setPickedCity} />
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            Countries, then regions, then cities. Zoom in twice and watch the legend change. The object
            count barely moves between 32 members and 2400, because it is set by which tier you are on,
            not by how many people signed up. That is the direct answer to your worry. The cost is one
            concept to learn, and it is a concept every map application has taught already.
          </p>
        </ObjectCount>

        <ObjectCount label="3 · Label priority">
          <MapLabels points={points} onPick={setPickedCity} />
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            No clusters at all. Places are sorted by size and a name is drawn only where its box does not
            collide with one already placed; everything else keeps a bare dot until you zoom and the
            boxes pull apart. This is what a real map does, it is the closest of the five to a field
            journal, and it is the only one where you can read the place names without clicking anything.
            The badge tells you how many of the places are currently named, because a map that silently
            drops 300 names is worse than one that admits it is showing 40 of 340.
          </p>
        </ObjectCount>

        <ObjectCount label="4 · The gazetteer">
          <MapGazetteer points={points} onPick={setPickedCity} />
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            The list is the object and the map is the locator. Hover a row and it lights on the map. The
            argument is blunt: almost nobody opens this to explore a globe, they open it to find out who
            is in one particular place, and a list answers that instantly, sorts, searches, has perfect
            touch targets at every size, and does not change one design decision between 30 places and
            3000. The map earns its keep by making the spread felt rather than read.
          </p>
        </ObjectCount>

        <ObjectCount label="5 · Country shading">
          <MapChoropleth points={points} />
          <p className="mt-3 max-w-[74ch] text-[15px] leading-[1.55] text-muted-foreground">
            Here to be rejected with evidence. Its object count is fixed at about 180 forever, which is
            the property everything else is chasing, and it fails on a different axis: this community is
            roughly 70% Indian, so the map is one dark blob and forty pale outlines, and the question
            people actually ask, which is who is in Bengaluru, is invisible at the only zoom it has.
            Sub-national shading would fix it and needs an India-states TopoJSON we do not ship.
          </p>
        </ObjectCount>
      </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="Top cities">The Top cities strip</Rule>
      <p className="max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        You said you were not sure why it is there. Neither am I, in its current form: it is the five
        biggest pins on the map directly above it, rendered a second time as pills, and clicking one
        applies a city filter that the map could have applied itself. Concept 4 dissolves it by making
        the ranked list the map&apos;s companion permanently, which is the same information doing a real
        job instead of a decorative one. In concepts 1 to 3 it should just go.
      </p>

      {/* ---------------------------------------------------------------- */}
      <Rule nav="Profession">Profession returns nothing, and why</Rule>
      <p className="mb-5 max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
        Your screenshot says <b>0 results</b> for Technology in Bengaluru. That is not a coincidence of
        the data. The Profession filter runs{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">where.workplace = &quot;Technology&quot;</code>,
        an exact match against a fourteen-item list. But{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">workplace</code> is labelled{" "}
        <b>Industry</b> in the old onboarding, <b>Organisation</b> in the current one, and <b>Where</b> in
        settings, with the placeholder &quot;e.g. Tata Consultancy Services&quot;. Two of those three
        write free text. So the column holds company names, and the filter is looking for industries.
      </p>
      <TaggingDemo />

      <div className="mt-8 space-y-5">
        <p className="max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
          Your instinct about batching this through a model is right, and the live rows show why a lookup
          table would not have done: <b>Cmi</b> is Chennai Mathematical Institute, and one member has
          misspelt Delaware. Neither exact nor fuzzy matching reaches either. Two changes make the pass
          worth running.
        </p>
        <p className="max-w-[68ch] text-[17px] leading-[1.65] text-muted-foreground">
          First, tag onto <b>new columns</b>, never over{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">workplace</code>. That column is
          the member&apos;s own words about where they work and it should keep saying Krea University on
          their profile. Second, use <b>two axes</b>. One column cannot carry both what world someone is
          in and where they are in it, and trying to make it is how this broke. Thirteen of the
          twenty-one members are students; a fourteen-item profession list has no honest way to say that.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CodeBlock title="1 · Export" body={EXPORT_SHAPE} />
        <CodeBlock title="3 · Import" body={IMPORT_SHAPE} />
      </div>
      <div className="mt-4">
        <CodeBlock title="2 · The prompt you paste alongside the JSONL" body={PROMPT} />
      </div>
      <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">
        The three scripts are not written yet, deliberately: you asked for this session to stay inside
        the lab, and an export script plus two new schema columns is a real change to the app. Say the
        word and they are an hour of work.
      </p>

      {/* ---------------------------------------------------------------- */}
      <Verdict>
        <p>
          <b>Chrome: build B, with D added later.</b> Two rows, and the second one is the count line the
          page already rendered, so a filter costs zero vertical space no matter how many you set. That
          is the only property that makes your screenshot structurally impossible rather than merely
          unlikely, and it is the reason to prefer it over A, which is a genuine twenty-line improvement
          that still cannot absorb a sixth facet. Graft in one idea from C: the map and the batch tiles
          should <b>be</b> filter controls, so clicking a city sets{" "}
          <code>city=</code> instead of opening a modal that dead-ends.
        </p>
        <p>
          <b>Map: build 3, with 4 beside it.</b> Label priority is the only one of the five that is both
          bounded and beautiful, it removes clusters entirely so there is no cluster-versus-city
          ambiguity and nothing to overlap, and it is the closest to the field-journal register the brand
          asks for. Pair it with the gazetteer list, which is where the touch targets and the scale
          actually live, and which quietly replaces Top cities. Tiers (2) is the runner-up and the one to
          reach for if you decide the map must stay disc-based.
        </p>
        <p>
          <b>Delete outright:</b> the House facet, the Top cities strip in its current form, Name A-Z and
          Name Z-A, and the back arrow. The arrow has no job once views stop being places.
        </p>
        <p>
          <b>Before any of this ships,</b> the profession column needs the tagging pass, or the facet
          keeps returning zero for everybody. That is not a polish item; it is the reason your screenshot
          had nothing in it.
        </p>
        <p className="text-[15px] text-muted-foreground">
          Nothing here is wired to the app. <code>src/components/directory/*</code> and{" "}
          <code>src/components/common/filters/*</code> are untouched, which also keeps this clear of the
          session working on the map.
        </p>
      </Verdict>

      {/* A quiet appendix so the batch data is not a claim without a specimen. */}
      <Rule nav="Appendix">Appendix: the batch grid at scale</Rule>
      <p className="mb-4 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">
        {batches.length} year tiles at {members.length} members. The long tail of one-person years is
        real and is the reason a flat grid of equal tiles reads badly: sixty tiles that each say
        &quot;1 person&quot; are sixty identical objects.
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
        {batches.map((b) => (
          <div
            key={b.year}
            className="rounded-[var(--radius-md)] border border-border bg-card px-2 py-2 text-center"
          >
            <div className="font-heading text-[15px] font-bold tabular-nums leading-none text-foreground">
              &apos;{String(b.year).slice(-2)}
            </div>
            <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{b.count}</div>
          </div>
        ))}
      </div>
    </LabShell>
  );
}
