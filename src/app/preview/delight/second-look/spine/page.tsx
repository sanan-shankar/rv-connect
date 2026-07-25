"use client";

import { useState } from "react";
import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Pick } from "../_kit";
import { ColumnDiagram, ROUTES, EDGES, geom, UNI_CAP } from "./_columns";

export default function SpineRoom() {
  const [mode, setMode] = useState<"today" | "one">("today");
  const unified = mode === "one";

  return (
    <LabShell
      title="Six different left edges"
      lede="Every page header in this app looks reasonable, because you only ever see one at a time. Put all eleven on the same screen and the content column walks 224px to the right and back as you navigate."
    >
      <Tell
        stats={[
          { n: "6", of: "distinct left edges across eleven routes" },
          { n: "224px", of: "between the leftmost route and the rightmost" },
          { n: "5", of: "different column caps: none, 5xl, 4xl, 3xl, 2xl" },
          { n: "4", of: "page-title implementations, in two different weights" },
          { n: "0", of: "of them matching the size the design system specifies" },
        ]}
      >
        <p>
          There is no page where this looks wrong. That is exactly why it survived: the error is
          <b> between</b> pages, and the product never shows you two at once. But your eye re-acquires
          the left edge on every navigation, and it lands somewhere different almost every time.
        </p>
        <p>
          The cause is that each route picked its own{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">mx-auto max-w-*</code>{" "}
          independently, and a centred column inside a shell that already has a 248px sidebar on one
          side moves its left edge every time the width changes.
        </p>
      </Tell>

      <Rule>All eleven routes on one screen</Rule>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Pick
          items={[
            { k: "today" as const, label: "What ships" },
            { k: "one" as const, label: "One spine" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <span className="text-[13px] text-muted-foreground">
          {unified
            ? `One column at ${UNI_CAP}px, one left edge. The feed splits it rather than being wider than everything else.`
            : `${EDGES.length} distinct left edges, spanning ${EDGES[EDGES.length - 1] - EDGES[0]}px.`}
        </span>
      </div>

      <Mount
        tone={unified ? "pick" : "shipped"}
        label={unified ? "Proposed" : "Shipped"}
        note="Drawn to scale at a 1440px viewport. The green block is the sidebar."
      >
        <div className="overflow-x-auto">
          <ColumnDiagram unified={unified} />
        </div>
      </Mount>

      <Rule>The measurements</Rule>

      <Ledger
        cols={["Route", "Column cap", "Left edge", "Column width"]}
        rows={ROUTES.map((r) => {
          const g = geom(r);
          return {
            k: r.route,
            v: [r.capName, `${g.left}px`, `${g.width}px`],
          };
        })}
      />

      <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.7] text-muted-foreground">
        The shell padding differs too: the feed branch uses{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">lg:px-9</code> and every other
        route uses <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">lg:px-10</code>. Nobody
        chose a 4px difference between the feed and the rest of the product.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule>And the titles are two different weights</Rule>

      <p className="mb-7 max-w-[70ch] text-[15px] leading-[1.7]">
        Six routes render their title through the shared{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">PageHeader</code>. Four hand-roll
        their own <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">&lt;h1&gt;</code>. The
        shared one never sets a weight, so it inherits <b>400</b>. The hand-rolled ones all set{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">font-bold</code>, so they render
        at <b>700</b>. Half the page titles in the product are a different weight from the other half,
        in a serif where 400 and 700 look nothing alike.
      </p>

      <Bench>
        <Mount
          tone="shipped"
          label="PageHeader · weight 400"
          note="Feed, Directory, Groups, Collection, Letters, Catch-ups, Messages"
        >
          <div className="space-y-3">
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: 30, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}
            >
              Collection
            </h3>
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: 30, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}
            >
              Your profile
            </h3>
          </div>
        </Mount>
        <Mount
          tone="shipped"
          label="Hand-rolled · weight 700"
          note="Support, About, Settings, Admin"
        >
          <div className="space-y-3">
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}
            >
              Collection
            </h3>
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1 }}
            >
              Your profile
            </h3>
          </div>
        </Mount>
      </Bench>

      <div className="mt-7">
        <Ledger
          cols={["Title source", "Routes", "Size", "Weight", "Tracking"]}
          rows={[
            {
              k: "PageHeader",
              v: [
                "Feed, Directory, Groups, Collection, Letters, Catch-ups",
                "30px",
                "400",
                "-0.02em",
              ],
            },
            { k: "Messages (inline copy)", v: ["Messages", "30px", "400", "-0.02em"] },
            { k: "Hand-rolled + tracking", v: ["Support, About", "30px", "700", "-0.02em"], bad: [2] },
            {
              k: "Hand-rolled, no tracking",
              v: ["Settings, Admin", "30px", "700", "-0.025em (from base layer)"],
              bad: [2],
            },
            {
              k: "DESIGN-SYSTEM.md says",
              v: ["all of them", "32px", "not specified", "-0.025em"],
              good: [1, 3],
            },
          ]}
        />
      </div>

      <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.7] text-muted-foreground">
        Note the last row. The spec says h1 is 32px at -0.025em. Not one of the four implementations
        matches it, including the shared component that exists to enforce it.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule>Why not just pick a width per page</Rule>

      <div className="grid max-w-[74ch] gap-5 text-[15px] leading-[1.7]">
        <p>
          The obvious defence of the current state is that different content wants different widths:
          a directory grid wants to be wide, an essay wants to be narrow. That is true about the{" "}
          <b>text</b>, and false about the <b>page</b>.
        </p>
        <p>
          A comfortable reading measure is roughly 65 to 75 characters. At 16px in Source Sans 3 that
          is about 620px. So <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">max-w-3xl</code>{" "}
          (768px) does not actually achieve a good measure on Letters or About either. It is a
          compromise that is too wide to read comfortably and too narrow to hold anything else, chosen
          because it felt about right.
        </p>
        <p>
          The correct control is a <b>measure cap on the paragraph</b>, not a width cap on the page.
          Cap the prose at 68ch and let the page stay one width, and both problems go away at once:
          the essay reads properly and the left edge stops moving.
        </p>
      </div>

      <Verdict>
        <p>
          <b>One page column: 1024px.</b> Every route, including Settings, Support, About and
          Messages. The feed keeps its right rail by splitting that 1024 rather than by being the one
          route that is wider than the others.
        </p>
        <p>
          <b>Prose gets a measure, not a page width.</b> A single <code>max-w-[68ch]</code> on the
          text element inside Letters, About and Support. That is the thing that was actually being
          asked for when someone reached for <code>max-w-3xl</code>.
        </p>
        <p>
          <b>Delete the four hand-rolled h1s.</b> They exist because <code>PageHeader</code> was easy
          to not import. Route Settings, Support, About and Admin through it, and fix the component to
          match the spec it was written to enforce: 32px, -0.025em, one weight.
        </p>
        <p className="text-muted-foreground">
          This is the cheapest change in the whole lab and the one you will feel on every single
          navigation, which is the definition of something worth doing.
        </p>
      </Verdict>
    </LabShell>
  );
}
