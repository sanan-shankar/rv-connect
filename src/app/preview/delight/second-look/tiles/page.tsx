"use client";

import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict } from "../_kit";
import {
  M,
  Measure,
  Ghost,
  Scorer,
  NScaling,
  NestingLadder,
  CatchupsShipped,
  CatchupsInset,
  LettersShipped,
  LettersRuled,
  SettingsShipped,
  SettingsInset,
} from "./_specimens";

/* Heights of the proposed specimens, measured off this page in the browser
   with getBoundingClientRect rather than estimated, same method as the
   shipped numbers in `M`. The shipped mocks below reproduce their live
   heights exactly: the Catch-ups column renders 512.3px here and 512.3px on
   /catchups, and each letter card renders 224.9px in both places. */
const NEW = {
  catchupInset: 251,
  lettersRuled: 451.8,
  lettersShipped2: 465.8,
  settingsInset: 431.5,
  settingsShipped: 721.5,
};

export default function TilesRoom() {
  return (
    <LabShell
      title="When a box earns its border"
      lede="Your words: why is everything in tiles, in the feed it kind of makes sense, but on Catch-ups there are tiles everywhere. Both halves of that are right. Here is the test that separates them, and three surfaces rebuilt to prove the test is not just taste."
    >
      <Tell
        stats={[
          { n: "4 of 4", of: "gates a feed post passes. The tile is correct there, on every count.", tone: "good" },
          { n: "0 of 4", of: "gates a settings field group passes. Seven of them are drawn as stacked cards." },
          { n: "91.3px", of: "the height of all five Catch-up tiles. Identical to the decimal. Three of them say nothing has happened." },
          { n: "224.9px", of: "the height of all six letter cards. 36% of that is the letter; the rest is chrome." },
          { n: "2", of: "places where the ruled-list pattern is already built and working. Both are in a 318px rail. Neither is in the column that needed it.", tone: "plain" },
        ]}
      >
        <p>
          A border is the strongest grouping tool in the box. Gestalt calls it{" "}
          <b>common region</b>, and it overrides proximity, similarity and alignment: two things
          inside one outline read as one unit even when everything else says they are not. That is
          why it works, and it is exactly why spending it on twelve identical rows leaves you nothing
          to say the thirteenth thing is different with.
        </p>
        <p>
          So the question is never &quot;does this look tidy in a box&quot;. Everything looks tidy in
          a box. The question is whether the box is <b>buying</b> anything, and there are four things
          it can buy. If it buys none of them, you have spent your loudest signal on silence.
        </p>
      </Tell>

      {/* ============================================================ */}
      <Rule nav="The four gates">The four gates</Rule>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-[18px] font-bold tracking-tight">
              01. Atomicity
            </h3>
            <p className="mt-1.5 max-w-[66ch] text-[17px] leading-[1.65]">
              Is the whole thing one target, or one object you act on as a unit: open it, drag it,
              dismiss it, reorder it? Atlassian&apos;s design system reserves its raised elevation
              for cards that <b>can be moved</b>, like a Jira or Trello card. The VA.gov design
              system states the inverse three ways, and they are worth memorising: &quot;A Card is
              not a Fieldset. A Card is not a Table row. A Card is not a Button or a Link.&quot; It
              adds, about that last one, &quot;do not use a Card to act as a large tap target&quot;.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-[18px] font-bold tracking-tight">02. Raggedness</h3>
            <p className="mt-1.5 max-w-[66ch] text-[17px] leading-[1.65]">
              Is the content unpredictable enough that alignment fails? Nielsen Norman Group gives
              the trigger for common region in one sentence: a boundary is the tool for{" "}
              <b>&quot;when needing to contain several different types of UI elements, or when
              adjusting the amount of whitespace between objects isn&apos;t possible&quot;</b>. Note
              the second clause. It is what saves a multi-column grid, where the gap between items
              and the gap inside an item are forced to be the same number. Edited copy of a
              consistent length does not need a box. User content of three words or three hundred,
              with or without a photo, does.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-[18px] font-bold tracking-tight">
              03. Heterogeneity of neighbours
            </h3>
            <p className="mt-1.5 max-w-[66ch] text-[17px] leading-[1.65]">
              Does this item sit next to an item of a <b>different kind</b>? Boxes separate unlike
              things. Twelve boxes around twelve like things is what Dave Rupert named the{" "}
              <b>hierarchy arms race</b>{" "}
              in &quot;Pitfalls of Card UIs&quot;: &quot;Once something is a card, it has a border,
              now everything else craves a border... A line gives prominence. Now everything wants
              prominence.&quot; The currency inflates until a border means nothing.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-[18px] font-bold tracking-tight">04. Portability</h3>
            <p className="mt-1.5 max-w-[66ch] text-[17px] leading-[1.65]">
              Will this exact unit re-render somewhere else: the feed, a profile, a group, search? A
              portable unit has to carry its own edges, because it cannot rely on the page it lands
              on to provide them. A thing that only ever appears in one list can borrow that
              list&apos;s structure for free.
            </p>
          </div>
        </div>

        <div className="self-start rounded-[16px] border border-border bg-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">
            The scoring
          </div>
          <dl className="mt-3 divide-y divide-border">
            <div className="pb-3">
              <dt className="font-heading text-[15px] font-bold tracking-tight">
                Two or more: tile
              </dt>
              <dd className="mt-1 text-[15px] leading-[1.55] text-muted-foreground">
                Border, 16px radius, elevation. It is paying for itself.
              </dd>
            </div>
            <div className="py-3">
              <dt className="font-heading text-[15px] font-bold tracking-tight">
                Exactly one: ruled list
              </dt>
              <dd className="mt-1 text-[15px] leading-[1.55] text-muted-foreground">
                One container around the whole group, hairline rows inside. The single gate that
                passed is usually atomicity, and a row is a perfectly good target.
              </dd>
            </div>
            <div className="pt-3">
              <dt className="font-heading text-[15px] font-bold tracking-tight">Zero: whitespace</dt>
              <dd className="mt-1 text-[15px] leading-[1.55] text-muted-foreground">
                A label, a gap, and nothing else. NN/g again: &quot;using whitespace alone to create
                clear groupings reduces the visual complexity of a design&quot;.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ============================================================ */}
      <Rule nav="Score it">Score it yourself</Rule>

      <p className="mb-7 max-w-[72ch] text-[17px] leading-[1.65]">
        Eight real surfaces from this app. Every gate below is answered from the source file or from
        a measurement taken off the running product at a 1440px viewport, not from an impression.
        Start with the feed, because if the rule cannot vindicate the place you already know tiles
        are right, it is not a rule, it is a preference.
      </p>

      <Scorer />

      {/* ============================================================ */}
      <Rule nav="N-scaling">Corollary one: value per border falls as N rises</Rule>

      <p className="mb-7 max-w-[72ch] text-[17px] leading-[1.65]">
        The cost of a border is linear in the count. The value is not: it collapses, because a
        boundary is a <b>difference</b>{" "}
        signal and identical neighbours have no difference to signal.
        One card on a page is almost always right. Card 37 of 40 identical items is almost always
        wrong. NN/g states the consequence: a vertical list &quot;is more scannable than cards
        because the positioning of the individual elements is fixed in size and more predictable for
        the eye&quot;, and &quot;cards take more space&quot;, so use a list for &quot;very homogenous
        items&quot;. Tufte got there first with data-ink: N identical borders down a column are
        gridlines behind a bar chart. Fine at low counts, chartjunk at high.
      </p>

      <NScaling />

      <p className="mt-6 max-w-[72ch] text-[17px] leading-[1.65] text-muted-foreground">
        At one item the two are almost the same drawing and the box is free. At forty the boxed
        column has spent 160 corners and 312px of gap to tell you forty times that a group is a
        group.
      </p>

      {/* ============================================================ */}
      <Rule nav="Move the box">Corollary two: move the box up one level</Rule>

      <p className="max-w-[72ch] text-[17px] leading-[1.65]">
        This is the part worth keeping. When a page feels noisy, the fix is almost never &quot;remove
        all the containers&quot;, which produces a wall of unanchored text. It is{" "}
        <b>one container per group with hairline rows inside, instead of one container per row</b>.
        The grouping survives, the count of borders drops from N to one, and the rows get a shared
        left edge that the boxed version never had. That is the iOS grouped list, which has been the
        shape of a settings screen since 2007.
      </p>
      <p className="mt-3 max-w-[72ch] text-[17px] leading-[1.65]">
        This app already contains two correct implementations, and each is one line of Tailwind.{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">
          [&amp;&gt;*:last-child]:pb-0 [&amp;&gt;a+a]:border-t [&amp;&gt;a+a]:border-border
        </code>{" "}
        in <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">fresh-off-the-press.tsx:40</code>,
        and the same line with{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">div+div</code> in{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">rail/directory-module.tsx:34</code>.
        Those are the only two hits in the repo. One of them sits 30px to the right of the column
        this room is about.
      </p>

      {/* ============================================================ */}
      <Rule nav="Catch-ups">Surface one · the Catch-ups index</Rule>

      <p className="mb-6 max-w-[72ch] text-[17px] leading-[1.65]">
        Five tiles, each <b>764 x 91.3px</b> on a 105.3px pitch, {M.catchupColumn}px of column. Each
        one carries a group name, one row of bird avatars, <b>one status line</b>, and one pill.
        Three of the five say &quot;No Catch-up here yet&quot; and get exactly the same 91.3px, the
        same border, the same elevation and the same button prominence as the two with a published
        Round. That is <b>273.8px of the 512.3px column</b> spent saying that nothing has happened.
      </p>
      <p className="mb-7 max-w-[72ch] text-[17px] leading-[1.65]">
        Meanwhile the 318px rail on the right renders the <b>same two published Rounds</b> with
        strictly more in them: the Round number, the group, the date, a quoted line from the Round,
        and a contributor count. Both are below, at true scale, from the live page.
      </p>
      <p className="mb-7 max-w-[72ch] text-[14px] leading-[1.65] text-muted-foreground">
        The card has exactly one branch that changes its height:{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[14px]">editionStatus</code> of{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[14px]">answering</code> adds a second
        avatar row and an N-of-M line, worth 38px (your-catchups-card.tsx:74). No group was answering
        when this was measured, which is why all five came back identical.
      </p>

      <Mount
        tone="shipped"
        flush
        note="Drawn at true CSS pixel size. Column 764px, gap 30px, rail 318px, exactly as /catchups renders at a 1440px viewport. The column measures 512.3px in both places."
      >
        <div className="overflow-x-auto px-4 py-5">
          <div className="flex gap-2" style={{ minWidth: 1112 + 20 }}>
            <Measure slim />
            <CatchupsShipped />
          </div>
        </div>
      </Mount>

      <div className="mt-6">
        <Ledger
          firstCol="30%"
          cols={["", "The 764px column", "The 318px rail"]}
          rows={[
            { k: "Width", v: ["764px", "318px"] },
            { k: "Height used by the two published Rounds", v: ["182.5px", "185.9px"] },
            { k: "Area used", v: ["139,430px²", "59,116px²"], bad: [0], good: [1] },
            {
              k: "Facts carried per Round",
              v: [
                "3: group, avatars, one status line",
                "5: group, Round number, date, a quoted line, contributor count",
              ],
              bad: [0],
              good: [1],
            },
            { k: "Area per fact", v: ["23,238px²", "5,912px²"], bad: [0], good: [1] },
            { k: "Space spent on groups with no Catch-up", v: ["273.8px, 3 rows of 5", "0px"], bad: [0], good: [1] },
          ]}
        />
        <p className="mt-3 text-[13px] leading-[1.6] text-muted-foreground">
          Areas are width times measured height. The rail spends <b>3.9x less area per fact</b> than
          the column beside it, and the column is the one with 764px to play with.
        </p>
      </div>

      <div className="mt-9">
        <Mount
          tone="pick"
          label="Proposed · inset-grouped list"
          note="251px against 512.3px, a 51% saving, while carrying five facts per Round instead of three. One container, a header outside it, hairline rows inside. The three dormant groups collapse to one line of chips."
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4" style={{ minWidth: 764 + 62 }}>
              <Measure n={`${NEW.catchupInset}px`} tone="good" />
              <Ghost
                at={M.catchupColumn}
                label={`the five tiles are still going here, ${M.catchupColumn}px`}
                right="261.3px returned"
              >
                <CatchupsInset />
              </Ghost>
            </div>
          </div>
        </Mount>
      </div>

      {/* ============================================================ */}
      <Rule nav="Letters">Surface two · the Letters index</Rule>

      <p className="mb-6 max-w-[72ch] text-[17px] leading-[1.65]">
        Six letters, six cards, every one of them <b>224.9px</b> tall on a 240.9px pitch. Not
        approximately: all six measured identical, because the title is cut at 80 characters and the
        preview is <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">line-clamp-2</code>.
        The layout deletes the variation that would have justified the box, then keeps the box.
      </p>

      <div className="mb-7 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="space-y-3 text-[17px] leading-[1.65]">
          <p>Inside those 224.9px:</p>
          <ul className="ml-5 max-w-[64ch] list-disc space-y-1.5 text-[16px] leading-[1.6] marker:text-muted-foreground">
            <li>
              <b>15.8px</b> of cinnamon eyebrow that says LETTER. You are on the Letters page. It
              says LETTER six times.
            </li>
            <li>
              <b>55px</b> of byline, sitting at the <b>bottom</b> under a rule. On an index, the
              author is one of the two reasons you click.
            </li>
            <li>
              <b>40px</b> of padding and <b>31.9px</b> of internal gaps, for <b>80.1px</b> of actual
              letter: one line of title and two lines of preview.
            </li>
          </ul>
          <p>
            36% of the card is the letter. And because every card is the same size, the index has no
            way to say that one of these is the piece of the month and one is a two-line note. The
            NIHR design system names this precisely: do not use cards &quot;when the order content is
            important, as cards deemphasise the ranking of content&quot;. Ranking is the entire job
            of an index.
          </p>
        </div>

        <Ledger
          cols={["Band", "Height"]}
          rows={[
            { k: "Eyebrow: LETTER · N MIN READ", v: ["15.8px"], flag: "bad" },
            { k: "Title, one line", v: ["33px"], flag: "good" },
            { k: "Preview, two clamped lines", v: ["47.1px"], flag: "good" },
            { k: "Rule plus byline block", v: ["55px"], flag: "bad" },
            { k: "Card padding", v: ["40px"], flag: "bad" },
            { k: "Internal gaps", v: ["31.9px"], flag: "bad" },
            { k: "Gap to the next card", v: ["15.9px"], flag: "bad" },
            { k: "Pitch per letter", v: ["240.9px"] },
          ]}
        />
      </div>

      <Mount
        tone="shipped"
        note="Two letters, true scale, 768px wide. Both cards render 224.9px here and 224.9px on /letters."
      >
        <div className="overflow-x-auto">
          <div className="flex gap-4" style={{ minWidth: 768 + 62 }}>
            <Measure n={`${NEW.lettersShipped2}px`} />
            <LettersShipped n={2} />
          </div>
        </div>
      </Mount>

      <div className="mt-9">
        <Mount
          tone="pick"
          label="Proposed · editorial ruled index"
          note="All six letters in 451.8px. The shipped index spends 465.8px on two. No boxes: the kicker appears only where it varies, the headline size carries rank, the author leads the dateline, a hairline separates."
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4" style={{ minWidth: 768 + 62 }}>
              <Measure n={`${NEW.lettersRuled}px`} tone="good" />
              <Ghost
                at={NEW.lettersShipped2}
                label={`the shipped index has managed two letters by here, ${NEW.lettersShipped2}px`}
                right="four more letters, 14px less"
              >
                <LettersRuled />
              </Ghost>
            </div>
          </div>
        </Mount>
      </div>

      <p className="mt-6 max-w-[72ch] text-[17px] leading-[1.65]">
        <b>451.8px for six, against 465.8px for two.</b> Same information, and the lead can now be
        visibly the lead: 27px for the piece of the month, 19px for the runner-up, 17px for the rest.
        Three things changed and none of them is decoration. The kicker went from a label that never
        varies (LETTER) to one that does (a city scope, a tribute). The headline got a size that
        carries rank. The byline moved from the bottom of a box to the entry itself, where an index
        puts it.
      </p>

      {/* ============================================================ */}
      <Rule nav="Settings">Surface three · Settings</Rule>

      <p className="mb-6 max-w-[72ch] text-[17px] leading-[1.65]">
        Eight cards stacked down a 3,092px page. Seven hold label-and-input pairs and score 0 of 4.
        The eighth is Danger zone: it sits outside the form, it is the only destructive thing on the
        screen, and it is the one card here that has earned its border. This is also where the
        nesting goes wrong. The two boxes inside the &quot;You&quot;
        card are filled with{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">bg-paper/50</code>, which is{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">#F6F2E8</code> at 50% over a card
        that is already <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">#F6F2E8</code>.
        It composites to the card colour <b>exactly</b>. The only thing separating an inner box from
        its container is one 1px hairline, so the box is a border with no region.
      </p>
      <p className="mb-7 max-w-[72ch] text-[17px] leading-[1.65]">
        And the radii run the wrong way. The card is{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">rounded-xl</code>, which in this
        repo is <b>20.8px</b>. The header-picture box inside it is 16px. The cover preview inside
        that is <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">rounded-xl</code> again,
        so <b>20.8px inside a 16px container</b>. Your own rule says an inner box is never the same
        radius as its container, let alone 4.8px rounder. The nine house-year rows further down are
        20.8px inside a 20.8px card, which breaks it the other way.
      </p>

      <Bench>
        <Mount tone="shipped" label="What ships" note="Card 20.8px, inner box 16px, cover 20.8px.">
          <div className="grid place-items-center py-2">
            <NestingLadder
              radii={[20.8, 16, 20.8]}
              labels={["Card, rounded-xl", "Header-picture box", "Cover preview, rounded-xl again"]}
              ok={false}
            />
          </div>
        </Mount>
        <Mount tone="pick" label="The rule you wrote" note="16, then 12, then 8. Each inner corner tucks inside the one around it.">
          <div className="grid place-items-center py-2">
            <NestingLadder
              radii={[16, 12, 8]}
              labels={["Container, the documented card radius", "Inner surface", "Thumbnail"]}
              ok
            />
          </div>
        </Mount>
      </Bench>

      <div className="mt-9 space-y-8">
        <Mount
          tone="shipped"
          note="Two of the seven field groups, true scale, 768px wide. Both boxes inside You are the same colour as You."
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4" style={{ minWidth: 768 + 62 }}>
              <Measure n={`${NEW.settingsShipped}px`} />
              <SettingsShipped />
            </div>
          </div>
        </Mount>
        <Mount
          tone="pick"
          label="Proposed · inset-grouped"
          note="The same two groups in 431.5px against 721.5px, a 40% saving. Group label outside the container, one hairline row per field, label left and control right, nothing nested."
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4" style={{ minWidth: 768 + 62 }}>
              <Measure n={`${NEW.settingsInset}px`} tone="good" />
              <Ghost
                at={NEW.settingsShipped}
                label={`the two shipped cards end here, ${NEW.settingsShipped}px`}
                right="290px returned"
              >
                <SettingsInset />
              </Ghost>
            </div>
          </div>
        </Mount>
      </div>

      <div className="mt-7 grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="font-heading text-[18px] font-bold tracking-tight">
            Why inset-grouped and not the GOV.UK summary list
          </h3>
          <p className="mt-2 max-w-[62ch] text-[17px] leading-[1.65]">
            The GOV.UK summary list is the obvious other candidate, and it is the better pattern for
            what it was built for: check-your-answers, where each line is key, value, and a
            &quot;Change&quot; link that takes you to a separate page for that one field. Settings
            here is not that. It is a live form with <b>one sticky save bar for all seven groups</b>,
            and the whole point is that you can fix your city, your job title and two house years in
            one pass and press Save once. A summary list turns that into seven round trips.
          </p>
          <p className="mt-3 max-w-[62ch] text-[17px] leading-[1.65] text-muted-foreground">
            Where the summary list does belong here: the profile you are looking at, and the
            admin&apos;s view of a member. Read-first, change-occasionally. That is a different
            screen.
          </p>
        </div>
        <div>
          <h3 className="font-heading text-[18px] font-bold tracking-tight">
            What the inset-grouped version actually fixes
          </h3>
          <ul className="ml-5 mt-2 max-w-[62ch] list-disc space-y-1.5 text-[16px] leading-[1.6] marker:text-muted-foreground">
            <li>
              <b>721.5px becomes 431.5px</b> for the two groups shown, a 40% saving, with nothing
              removed.
            </li>
            <li>
              Nested surfaces in those two groups go from three to zero. The Houses group, not shown,
              holds nine more at 20.8px inside a 20.8px card.
            </li>
            <li>Every radius now descends: 16 for the container, 12 for an input, then a circle.</li>
            <li>
              Labels get a shared left edge in a fixed 168px column, so the eye reads one line per
              field instead of a stack of label-above-input blocks.
            </li>
            <li>
              The group title leaves the container, which deletes the header band from all seven
              groups and lets the container start at its first real row.
            </li>
          </ul>
        </div>
      </div>

      {/* ============================================================ */}
      <Rule nav="The other side">The case for keeping tiles, put properly</Rule>

      <div className="grid max-w-[76ch] gap-4 text-[17px] leading-[1.65]">
        <p>
          The strongest argument against everything above is not that boxes look nicer. It is
          measured, and it is this: Tuch, Presslaber, Stoecklin, Opwis and Bargas-Avila (International
          Journal of Human-Computer Studies, 2012) showed 119 real websites to participants for{" "}
          <b>50 milliseconds</b> and found that both low visual complexity and high{" "}
          <b>prototypicality</b> produced a better aesthetic first impression. A follow-up got the
          same result at <b>17ms</b>. Prototypicality means &quot;looks like the other software in
          its category&quot;, and in 2026 a card grid is what a social product looks like. A ruled
          index is not wrong, but it is less prototypical, and that costs you something real in the
          first fiftieth of a second before anyone has read a word.
        </p>
        <p>
          The same study cuts both ways, because <b>visual complexity</b> had the larger effect of
          the two, and forty borders is complexity. It is a genuine tension, not a rhetorical one,
          and it is why the answer is a test rather than a ban.
        </p>
        <p>Three more arguments for tiles:</p>
        <ul className="ml-5 list-disc space-y-2 marker:text-muted-foreground">
          <li>
            <b>Tiles are forgiving.</b> A box absorbs content of any length without the layout
            looking broken. A ruled list looks bad the moment one row is four lines and its
            neighbours are one, which is exactly why the feed is a card feed.
          </li>
          <li>
            <b>Tiles are touch-safe by accident.</b> A 91.3px card is a 91.3px tap target. Ruled rows
            have to be given a minimum height deliberately, and if nobody does, you ship 32px rows.
          </li>
          <li>
            <b>Tiles are cheap to build and hard to break.</b> A card is a component with its own
            padding, so it composes anywhere. A ruled list needs someone to own the vertical rhythm,
            the divider inset, the hover region and the last-child padding. That is real design work
            that a card lets you skip, which is the honest reason it spread.
          </li>
        </ul>
        <p className="text-muted-foreground">
          So: keep the tiles on the feed, the Collection, the directory grid and the right rail. Four
          surfaces, all of them scoring two gates or more. That is not a compromise, it is the rule
          working.
        </p>
      </div>

      {/* ============================================================ */}
      <Rule nav="Decided">Every surface, decided</Rule>

      <Ledger
        firstCol="20%"
        cols={["Surface", "Gates", "Verdict", "What changes"]}
        rows={[
          {
            k: "Feed post",
            v: ["4 of 4", "Tile", "Nothing. This is the reference implementation."],
            good: [0, 1],
          },
          {
            k: "Right-rail module",
            v: ["3 of 4", "Tile", "Nothing. Keep RailCard as the one rail shell."],
            good: [0, 1],
          },
          {
            k: "Collection photo",
            v: ["2 of 4", "Tile", "Nothing. A 12px frame on a photo is the right weight."],
            good: [0, 1],
          },
          {
            k: "Directory person",
            v: ["2 of 4", "Tile", "Nothing. A list would save 8% of column and cost the 64px portrait."],
            good: [0, 1],
          },
          {
            k: "Catch-ups index",
            v: [
              "1 of 4",
              "Ruled list",
              "One container, hairline rows. Live Rounds express their state; the never-started groups become one line of chips.",
            ],
            bad: [0],
          },
          {
            k: "Letters index",
            v: [
              "1 of 4",
              "Ruled list",
              "Editorial index. Drop the LETTER eyebrow, vary the headline size, move the byline up, hairline between.",
            ],
            bad: [0],
          },
          {
            k: "Fresh off the press",
            v: ["1 of 4", "Ruled list", "Nothing. It already is one. Copy it."],
            good: [1],
          },
          {
            k: "Settings",
            v: [
              "0 of 4",
              "Ruled list",
              "Group label outside a single container, one hairline row per field, zero nested surfaces. Danger zone keeps its card.",
            ],
            bad: [0],
          },
        ]}
      />

      <p className="mt-4 max-w-[72ch] text-[15px] leading-[1.55] text-muted-foreground">
        Settings scores zero, which by the letter of the rule means whitespace alone. In practice a
        long form still wants one container per group so the rows have a shared edge to hang off, so
        it lands in the same place as the ones. The zero is worth knowing anyway: it is why eight
        cards felt like too much before anyone could say why.
      </p>

      <Verdict>
        <p>
          <b>The rule, in one line you can apply without me.</b> Count how many of the four a thing
          buys: is it one object you act on, is its content ragged or in a grid, is its neighbour a
          different kind of thing, does it render anywhere else. Two or more, draw the box. One,{" "}
          <code>ruled list</code>. Zero, whitespace.
        </p>
        <p>
          <b>The single most useful move is corollary two.</b> When a screen feels like too many
          tiles, do not delete the containers. Move the box up one level: one container around the
          group, hairlines inside. You get the grouping, you lose N minus one borders, and the rows
          gain an alignment they never had.
        </p>
        <p>
          <b>Three surfaces to change, in order of payoff.</b> Catch-ups first, because it is the one
          you noticed and it is the biggest win: {M.catchupColumn}px of column to say what{" "}
          {NEW.catchupInset}px says with more in it. Letters second, because ranking is the job of an
          index and identical cards cannot rank. Settings third, because it is the least visible but
          it is where the nesting rule is actually being broken in code.
        </p>
        <p className="text-muted-foreground">
          You were right that the feed is different. It is the only surface in the product that
          passes all four, and it should stay exactly as it is.
        </p>
      </Verdict>
    </LabShell>
  );
}
