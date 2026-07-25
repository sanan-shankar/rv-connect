"use client";

import { useState } from "react";
import Link from "next/link";
import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Pick } from "../_kit";
import { PAIRINGS, ALL_FONT_VARS } from "./_fonts";
import { Specimen } from "./_specimen";

export default function TypeRoom() {
  const [k, setK] = useState(PAIRINGS[0].k);
  const p = PAIRINGS.find((x) => x.k === k)!;
  const compare = PAIRINGS.find((x) => x.k === (k === "today" ? "fraunces" : "today"))!;

  return (
    <div className={ALL_FONT_VARS}>
      <LabShell
        title="The font question"
        lede="You asked, half seriously, what would happen if you used the Apple font. The honest answer is that you cannot, legally, and that it would be the wrong choice anyway. The useful answer is that three mechanical things are wrong with the type today, and no font swap fixes any of them."
      >
        <Tell
          stats={[
            { n: "0", of: "italic files loaded, so all 9 italics in the app are browser shears" },
            { n: "4", of: "static weight files loaded for a font that is variable 200 to 900" },
            { n: "3", of: "styles in Libre Baskerville, and no bold italic master at all" },
            { n: "14", of: "uses of tabular-nums in components, and zero in the app routes" },
          ]}
        >
          <p>
            Fix those four first. They cost nothing, they are each one line, and until they are done
            you cannot fairly judge whether you like the typefaces, because you have never actually
            seen them properly rendered. The synthesised-italic proof is in the{" "}
            <Link
              href="/preview/delight/second-look/craft"
              className="font-semibold text-leaf underline decoration-leaf/40 underline-offset-2 transition-colors hover:decoration-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
            >
              craft room
            </Link>
            .
          </p>
          <p>
            Every specimen below is loaded properly: variable files, real italics, correct axes. So
            this is a fair fight, including for the one you already have.
          </p>
        </Tell>

        {/* ------------------------------------------------------ */}
        <Rule>The Apple font, answered</Rule>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-[15px] leading-[1.7]">
            <p>
              You mean SF Pro. Apple&apos;s licence restricts it to <b>creating mock-ups of user
              interfaces for software running on Apple operating systems</b>, and explicitly forbids
              using it to create website content. Self-hosting an SF woff2 is a licence violation.
              Apple&apos;s own developer forums say it plainly: you cannot use SF fonts in a web app.
            </p>
            <p>
              The legal route is the system stack,{" "}
              <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">
                -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, system-ui
              </code>
              , which renders SF on Apple devices because it is already installed there. Zero bytes,
              zero font loading flash, native hinting, and SF is genuinely superb engineering.
            </p>
            <p>
              Two things make it wrong here anyway. Your brand would become{" "}
              <b>a different typeface on every operating system</b>, so every spacing decision you
              make on a Mac is wrong on Windows and you can never see what most people see. And SF is
              the single strongest available signal of &quot;unstyled default&quot;. It reads as an
              iOS settings screen, which is the exact opposite of a boutique field journal.
            </p>
            <p className="text-muted-foreground">
              What you were actually reaching for is <b>crispness and optical sizing</b>. Both are
              available legally, and two of the options below have a real optical-size axis, which SF
              also has and Libre Baskerville does not.
            </p>
          </div>

          <Ledger
            firstCol="42%"
            cols={["", "SF Pro", "The legal answer"]}
            rows={[
              { k: "Self-host the file", v: ["licence violation", "not applicable"], bad: [0] },
              { k: "System stack", v: ["allowed", "different face per OS"], bad: [1] },
              { k: "Bytes shipped", v: ["0", "0"] },
              { k: "You can design to it", v: ["no", "no"], bad: [0, 1] },
              { k: "Optical sizing", v: ["yes", "yes"] },
              { k: "Reads as your brand", v: ["no, reads as iOS", "no"], bad: [0, 1] },
            ]}
          />
        </div>

        {/* ------------------------------------------------------ */}
        <Rule>What is actually wrong with Libre Baskerville as a heading</Rule>

        <p className="mb-6 max-w-[74ch] text-[15px] leading-[1.7]">
          Not taste. A category error. Its own stated brief is that it is{" "}
          <b>optimised for body text at around 16px</b>, based on ATF Baskerville with a taller
          x-height, wider counters and less contrast. All three of those are deliberate anti-display
          moves, and you are paying for all three at 30 to 40px.
        </p>

        <Ledger
          firstCol="30%"
          cols={["What they changed", "Why, for 16px body", "What it costs you at 34px"]}
          rows={[
            {
              k: "Taller x-height",
              v: ["legibility at small sizes", "flattens the long ascenders that make a Baskerville headline elegant, so it reads blocky"],
            },
            {
              k: "Wider counters, wide set",
              v: ["open shapes at 16px", "fewer words per line and worse breaks in narrow cards"],
            },
            {
              k: "Less contrast",
              v: ["survives screen rendering", "removes the thick-to-thin modulation that is the entire appeal of a Baskerville"],
            },
            {
              k: "Spacing tuned for 16px",
              v: ["correct letterfit at 16px", "why globals.css applies tracking-tight to every h1 through h4. That blanket negative tracking is a symptom, not a decision"],
              bad: [1],
            },
            {
              k: "Three styles, not variable",
              v: ["a small, honest family", "400 or 700 and nothing between, and no bold italic at all, ever"],
              bad: [1],
            },
          ]}
        />

        <p className="mt-5 max-w-[74ch] text-[15px] leading-[1.7]">
          It is the <b>safe</b> serif, not the <b>boutique</b> one. Its virtues are precisely the ones
          you do not need in a heading, and its costs are precisely the ones you do pay. Source Sans
          3, by contrast, is not the problem: it is a genuinely good humanist workhorse that is being
          loaded wrong and is a little characterless, having been drawn to disappear into Adobe&apos;s
          own application chrome.
        </p>

        {/* ------------------------------------------------------ */}
        <Rule>Five pairings, loaded properly</Rule>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Pick
            items={PAIRINGS.map((x) => ({ k: x.k, label: x.label }))}
            value={k}
            onChange={setK}
          />
          <span className="text-[13px] text-muted-foreground">
            The left specimen follows this control. The right one stays on{" "}
            {compare.label.toLowerCase()} so there is always a comparison.
          </span>
        </div>

        <Bench>
          <Mount
            tone={p.k === "today" ? "shipped" : "option"}
            label={`${p.head} + ${p.body}`}
            note={p.axes}
          >
            <Specimen p={p} />
          </Mount>
          <Mount
            tone="shipped"
            label={`${compare.head} + ${compare.body}`}
            note="Held fixed as the reference."
          >
            <Specimen p={compare} />
          </Mount>
        </Bench>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="relative pl-5">
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-leaf" />
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">
              Why {p.head} fits here
            </div>
            <p className="mt-2 text-[14.5px] leading-[1.65]">{p.why}</p>
          </div>
          <div className="relative pl-5">
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-heart" />
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-heart">
              The named risk
            </div>
            <p className="mt-2 text-[14.5px] leading-[1.65]">{p.risk}</p>
          </div>
        </div>

        {/* ------------------------------------------------------ */}
        <Rule>Crispness, separately from taste</Rule>

        <div className="grid max-w-[74ch] gap-4 text-[15px] leading-[1.7]">
          <p>
            <b>The body has <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">antialiased</code> on it globally</b>,
            which forces grayscale antialiasing everywhere. That is right for light text on the dark
            green sidebar, where it stops glyphs looking bloated. It is arguably backwards for dark
            ink on warm paper, where it thins strokes and costs you a little weight on a surface that
            is already low contrast. Worth trying scoped: keep it on the sidebar, drop it on the page.
          </p>
          <p>
            <b>Whole pixels.</b> A 1.9px icon stroke gets spread across two pixel columns at partial
            coverage, so the edge becomes a grey ramp. A 14.5px type size puts the hinted stems
            between pixels. There are 252 fractional sizes and 23 stroke widths in the app; that is
            the single biggest crispness lever and it has nothing to do with which font you pick.
          </p>
          <p>
            <b>Turn on the figures you already own.</b>{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">tabular-nums</code> appears 14
            times in components and zero times in the app routes, so every count, every date and
            every rupee figure jitters horizontally as the digits change. Every face on this page has
            tabular figures. Use them anywhere a number can update in place.
          </p>
        </div>

        <Verdict>
          <p>
            <b>Do the four mechanical fixes regardless of what you decide about the faces.</b> Load
            the italics, load Source Sans 3 as a variable font, put whole numbers on the type ladder,
            and switch on tabular figures. That is an afternoon, and it is most of the difference.
          </p>
          <p>
            <b>Then keep Source Sans 3 and change the heading face to Fraunces.</b> It is the only
            option that fixes the real defect rather than swapping one static serif for another: a
            genuine optical-size axis means spacing, contrast and weight all move together with size,
            so you can delete the blanket <code>tracking-tight</code> hack instead of tuning it. It
            has the thick-to-thin modulation Libre Baskerville gave up, it has weights between 400 and
            700, and it has a real bold italic. It is also the most distinctive of the five, which is
            what a boutique brand is for.
          </p>
          <p>
            <b>Runner-up: Newsreader.</b> It loses only because it is quieter. If, after living with
            Fraunces for a week, it reads as too fashionable, Newsreader gets you the same optical
            sizing and screen-reading pedigree with none of the personality risk. Instrument Serif is
            the most beautiful at 34px and the least useful everywhere else, and pairing it with Inter
            would make the most distinctive display face in the set sit on the most generic body face
            on the web.
          </p>
          <p className="text-muted-foreground">
            One honest caveat: I am recommending a change to a face you have already shipped and like.
            &quot;Today, fixed&quot; is a real contender and it is on the switcher above for that
            reason. If you flip between it and Fraunces and prefer what you have, that is a valid
            answer, and you will still have gained the four fixes.
          </p>
        </Verdict>
      </LabShell>
    </div>
  );
}
