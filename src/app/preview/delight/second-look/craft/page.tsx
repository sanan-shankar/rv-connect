"use client";

import { useState } from "react";
import Link from "next/link";
import { Feather } from "lucide-react";
import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Switches, Controls } from "../_kit";
import { trueBody, trueHead } from "./_italic-fonts";
import {
  SidebarSpecimen,
  ZoomCrop,
  ALL_OFF,
  ALL_ON,
  FIXES,
  type CraftFix,
} from "./_sidebar-specimen";

/* The browser's synthetic oblique, reproduced. A rasteriser with no italic face
   shears the roman by 20%, which is atan(0.2) = 11.3 degrees. Doing it with a
   transform rather than `font-style: italic` is deliberate: the real italic is
   loaded on this page and would otherwise win. */
function Sheared({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block origin-bottom-left [transform:skewX(-11.3deg)]">{children}</span>
  );
}

const STROKES = [
  0.9, 1.1, 1.25, 1.5, 1.6, 1.7, 1.75, 1.8, 1.9, 2, 2.2, 2.25, 2.3, 2.4, 2.5, 2.6, 2.75, 2.8, 3,
  3.2, 3.4, 3.8, 6,
];

const ALPHA_ROWS = [
  { cls: "text-muted-foreground", a: 1, n: 568, r: "4.40" },
  { cls: "text-muted-foreground/80", a: 0.8, n: 3, r: "3.06" },
  { cls: "text-muted-foreground/70", a: 0.7, n: 18, r: "2.61" },
  { cls: "text-muted-foreground/60", a: 0.6, n: 4, r: "2.23" },
  { cls: "text-muted-foreground/50", a: 0.5, n: 6, r: "1.91" },
  { cls: "text-muted-foreground/45", a: 0.45, n: 9, r: "1.78" },
];

export default function CraftRoom() {
  const [fix, setFix] = useState<CraftFix>(ALL_OFF);
  const toggle = (k: keyof CraftFix) => setFix((f) => ({ ...f, [k]: !f[k] }));
  const on = Object.values(fix).filter(Boolean).length;

  return (
    <LabShell
      title="Why the sidebar looks 1080p"
      lede="You said the preview sidebar looked like 4K next to ours, and you could not say why. There are four causes, they are all measurable, and none of them is the thing you would have guessed. Fixing them does not change one shape."
    >
      <Tell
        stats={[
          { n: "4.31:1", of: "contrast on the idle nav label. AA needs 4.5." },
          { n: "568", of: "uses of one muted ink that fails AA on every surface in the app" },
          { n: "252", of: "type sizes landing on half a pixel, across 11 distinct values" },
          { n: "23", of: "different icon stroke widths, from 0.9 to 6" },
          { n: "0", of: "italic font files loaded, for 9 italics in the shipped app" },
          { n: "6", of: "static font files shipped, for two families that are both variable" },
        ]}
      >
        <p>
          Nothing is misaligned. The type is the right size, the icons are the right icons, the green
          is the right green. The sidebar is soft for reasons that live <b>underneath</b> the design:
          a colour that is 70% transparent, two values that land on half a pixel, and a state ladder
          whose rungs are 0.1 apart.
        </p>
        <p>
          Every number below is a WCAG relative-luminance ratio against the sidebar green{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">#235C49</code>, computed rather
          than eyeballed.
        </p>
      </Tell>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Alpha ink">Cause one · the ink is 70% transparent</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        Idle nav rows are painted with{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">text-sidebar-foreground/70</code>.
        On a neutral page an alpha is a harmless way to say &quot;quieter&quot;. On a saturated green
        it is not: the glyph gets 30% of the background mixed into it, so it does not just dim, it
        <b> desaturates toward the surface it sits on</b>. That is the exact perceptual signature of
        a low-resolution screen.
      </p>

      <Ledger
        firstCol="26%"
        cols={["Sidebar element", "Shipped", "Resolves to", "Ratio", "Proposed", "New ratio"]}
        rows={[
          {
            k: "Idle nav label",
            v: ["#EBF3EE at 70%", "#AFC6BD", "4.31 · under AA", "#D3E2D9", "5.80"],
            bad: [2],
            good: [4],
          },
          {
            k: "Account email line",
            v: ["#EBF3EE at 55%", "#91AFA4", "3.29 · well under AA", "#B4CBBE", "4.53"],
            bad: [2],
            good: [4],
          },
          { k: "Active nav label", v: ["#FFFFFF", "#FFFFFF", "7.78", "unchanged", "7.78"] },
          { k: "Wordmark", v: ["#EBF3EE", "#EBF3EE", "6.89", "unchanged", "6.89"] },
        ]}
      />

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65] text-muted-foreground">
        Both alpha values fail AA for normal text. The proposed inks are opaque, pass, and are still
        two full steps below the active row, so nothing about the hierarchy changes. It is the same
        design, correctly mixed.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Half pixels">Cause two and three · half-pixel values</Rule>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="max-w-[62ch] text-[17px] leading-[1.65]">
            The nav sets{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">text-[16px]</code> and{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">strokeWidth=&#123;1.9&#125;</code>.
            Both are landing on half a device pixel at 1x.
          </p>
          <p className="mt-3 max-w-[62ch] text-[17px] leading-[1.65]">
            A 1.9px stroke cannot be drawn: the renderer spreads it across two pixel columns at
            partial coverage, so every icon edge is a soft grey ramp instead of an edge. At 14.5px the
            font&apos;s hinted stem positions fall between pixels for the same reason. On a Retina
            display it halves rather than removes the problem, and on the external 1x monitor most
            people use, it is the whole problem.
          </p>
          <p className="mt-3 max-w-[62ch] text-[17px] leading-[1.65] text-muted-foreground">
            Neither value was chosen for a reason. 14.5 is 14 that someone nudged; 1.9 is 2 that
            someone nudged.
          </p>
        </div>

        <Ledger
          cols={["Property", "Shipped", "Proposed"]}
          rows={[
            { k: "Nav label size", v: ["14.5px", "14px"], flag: "bad" },
            { k: "Icon stroke", v: ["1.9", "2"], flag: "bad" },
            { k: "Icon box", v: ["18 x 18px", "unchanged"] },
            { k: "Row padding", v: ["12px / 10px", "unchanged"] },
            { k: "Rail width", v: ["248px", "unchanged"] },
          ]}
        />
      </div>

      {/* ---------------------------------------------------------- */}
      <Rule nav="State ladder">Cause four · hover and active are the same colour</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        Hover paints{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">bg-sidebar-accent/55</code>, which
        composites to <b>1.124:1</b> against the rail. Active paints the same colour at full strength:{" "}
        <b>1.226:1</b>. Those two states are one tenth of a ratio apart. In practice the nav has one
        state, not three, and the cinnamon edge is carrying the entire job of saying where you are.
        Pull them to 1.23 and 1.47 and you get three rungs you can actually feel.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Try it">Attribute it yourself</Rule>

      <Controls>
        <Switches
          items={FIXES.map((f) => ({ k: f.k as string, label: f.label, hint: f.hint }))}
          value={fix as unknown as Record<string, boolean>}
          onChange={(k) => toggle(k as keyof CraftFix)}
        />
        <button
          type="button"
          onClick={() => setFix(on === 4 ? ALL_OFF : ALL_ON)}
          className="rounded-full bg-[#235C49] px-4 py-1.5 text-[14px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1E5040] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
        >
          {on === 4 ? "Reset to shipped" : "Turn all four on"}
        </button>
      </Controls>

      <Bench>
        <Mount tone="shipped" note="Exactly what is in main today." flush>
          {/* against the real page background, because that is the only place a
              sidebar is ever seen and the green needs something to sit against */}
          <div className="flex bg-[#E7E1D3]">
            <SidebarSpecimen fix={ALL_OFF} />
            <div className="flex-1" />
          </div>
        </Mount>
        <Mount
          tone={on === 0 ? "option" : "pick"}
          label={on === 0 ? "Nothing on yet" : `${on} of 4 on`}
          note={
            on === 0
              ? "Flip a switch above. Same shapes, same spacing, same icons."
              : "Not one shape, size, colour family or icon has changed."
          }
          flush
        >
          <div className="flex bg-[#E7E1D3]">
            <SidebarSpecimen fix={fix} />
            <div className="flex-1" />
          </div>
        </Mount>
      </Bench>

      <div className="mt-10">
        <Rule nav="At 3x">The same two rows at 3x</Rule>
        <Bench>
          <Mount tone="shipped" note="Alpha ink, 14.5px, stroke 1.9. Look at the icon edges.">
            <ZoomCrop fix={ALL_OFF} />
          </Mount>
          <Mount tone="pick" note="Opaque ink, 14px, stroke 2.">
            <ZoomCrop fix={ALL_ON} />
          </Mount>
        </Bench>
      </div>

      {/* ---------------------------------------------------------- */}
      <Rule nav="The disease">The sidebar was the symptom</Rule>

      <p className="max-w-[70ch] text-[17px] leading-[1.65]">
        You noticed it on the sidebar because that is the only large saturated surface in the
        product, and alpha ink misbehaves most over saturated colour. But all three habits are
        everywhere, and once you go looking, the craft layer underneath this app has never been
        audited once. Below is every number, counted rather than estimated.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="568 uses">The colour used 568 times fails AA</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">--muted-foreground: #6E7268</code>{" "}
        is the second most-used colour in the product: <b>568 usages across 159 files</b>. Every
        subtitle, every timestamp, every meta line, every helper text. On the card surface it is{" "}
        <b>4.40:1</b>. On the page background it is <b>3.77:1</b>. AA for normal text is 4.5. It
        passes on exactly one surface in the app, pure white, which is reserved for modals.
      </p>

      <Bench>
        <Mount tone="shipped" note="#6E7268 on card #F6F2E8 and page #E7E1D3.">
          <div className="space-y-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-[15px] leading-[1.6]" style={{ color: "#6E7268" }}>
                Longer pieces from the valley. Essays, tributes, travelogues.
              </p>
              <p className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-heart">
                4.40:1 · fails AA
              </p>
            </div>
            <div className="rounded-xl bg-background p-4">
              <p className="text-[15px] leading-[1.6]" style={{ color: "#6E7268" }}>
                Longer pieces from the valley. Essays, tributes, travelogues.
              </p>
              <p className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-heart">
                3.77:1 · fails AA
              </p>
            </div>
          </div>
        </Mount>
        <Mount tone="pick" label="Proposed #5E6259" note="One hex changed. Passes on both surfaces.">
          <div className="space-y-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-[15px] leading-[1.6]" style={{ color: "#5E6259" }}>
                Longer pieces from the valley. Essays, tributes, travelogues.
              </p>
              <p className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-leaf">
                5.58:1 · passes
              </p>
            </div>
            <div className="rounded-xl bg-background p-4">
              <p className="text-[15px] leading-[1.6]" style={{ color: "#5E6259" }}>
                Longer pieces from the valley. Essays, tributes, travelogues.
              </p>
              <p className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-leaf">
                4.78:1 · passes
              </p>
            </div>
          </div>
        </Mount>
      </Bench>

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65] text-muted-foreground">
        It is still obviously secondary. Muted was never supposed to mean hard to read, and darkening
        it by four steps costs the design nothing.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Compounded">Then an alpha gets applied on top of it</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        About a hundred places take a token that is already below AA and make it more transparent.
        This is the compounding version of the sidebar mistake, and some of the results are not
        text so much as a suggestion of text.
      </p>

      <Mount tone="shipped" note="Every one of these patterns is in the shipped app right now, on the card surface.">
        <div className="space-y-2.5">
          {ALPHA_ROWS.map((row) => (
            <div key={row.cls} className="flex items-baseline gap-4 rounded-lg bg-card px-4 py-2.5">
              <span
                className="min-w-0 flex-1 truncate text-[14px]"
                style={{ color: `rgba(110, 114, 104, ${row.a})` }}
              >
                Batch of &apos;04 · Bengaluru · joined 2 weeks ago
              </span>
              <code className="shrink-0 text-[13px] text-foreground/70">{row.cls}</code>
              <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">
                {row.n}x
              </span>
              <span
                className="w-12 shrink-0 text-right text-[12px] font-bold tabular-nums"
                style={{ color: Number(row.r) >= 4.5 ? "#1F8A4C" : "#E03A33" }}
              >
                {row.r}
              </span>
            </div>
          ))}
        </div>
      </Mount>

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65] text-muted-foreground">
        The bottom row is 1.78:1. That is roughly the contrast of a watermark. It is used nine times
        for content, not decoration.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="44 sizes">Forty-four type sizes, eleven of them on half a pixel</Rule>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div>
          <p className="max-w-[62ch] text-[17px] leading-[1.65]">
            The app uses <b>44 distinct bracketed pixel sizes</b>, on top of Tailwind&apos;s own
            scale. Eleven of them are fractional, and those eleven account for <b>252 usages</b>. The
            design system documents a six-step ladder. Nothing enforces it, so the ladder is decorative.
          </p>
          <p className="mt-3 max-w-[62ch] text-[17px] leading-[1.65]">
            The tell is that the fractional sizes come in pairs with their whole neighbours: 10 and
            10.5, 11 and 11.5, 12 and 12.5, 13 and 13.5, all the way up. Nobody designed a scale with
            half-steps. Each half-step is one moment where a size felt marginally wrong and got
            nudged instead of the scale getting fixed.
          </p>
        </div>

        <Ledger
          cols={["Fractional size", "Uses"]}
          rows={[
            { k: "text-[12px]", v: ["52"] },
            { k: "text-[15px]", v: ["48"] },
            { k: "text-[14px]", v: ["43"] },
            { k: "text-[17px]", v: ["34"] },
            { k: "text-[13px]", v: ["32"] },
            { k: "text-[16px]", v: ["25"] },
            { k: "text-[18px]", v: ["11"] },
            { k: "9.5, 17.5, 18.5, 19.5", v: ["7"] },
            { k: "Total", v: ["252"], flag: "bad" },
          ]}
        />
      </div>

      {/* ---------------------------------------------------------- */}
      <Rule nav="23 strokes">Twenty-three icon stroke widths</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        89 explicit <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">strokeWidth</code>{" "}
        props, <b>23 distinct values</b>, ranging from 0.9 to 6. Only 15 of the 89 are the whole
        number 2. The most common single value is <b>1.9</b>, used 16 times. There is no rule here at
        all, and the visual result is that icons sitting next to each other are drawn at different
        weights for no reason.
      </p>

      <Mount tone="shipped" note="All at 24px. Every one of these values is in the shipped app.">
        <div className="flex flex-wrap items-end gap-x-7 gap-y-5">
          {STROKES.map((w) => (
            <div key={w} className="flex flex-col items-center gap-1.5">
              <Feather className="h-6 w-6 text-foreground" strokeWidth={w} />
              <span
                className={`text-[11px] tabular-nums ${
                  w === 2 ? "font-bold text-leaf" : "text-muted-foreground"
                }`}
              >
                {w}
              </span>
            </div>
          ))}
        </div>
      </Mount>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Fake italics">Every italic in the app is fake</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        Neither font loader in{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">src/app/layout.tsx</code> requests
        an italic style, so no italic file is ever downloaded. The nine italics in the shipped app
        (35 across the repo) are all <b>synthesised obliques</b>: the browser shears the roman by
        about 11 degrees. A real italic is a different set of letterforms, not a slanted one.
      </p>

      <div className={`${trueBody.variable} ${trueHead.variable}`}>
        <Bench>
          <Mount
            tone="shipped"
            label="What ships · synthesised"
            note="The roman letterforms, sheared. This is what a browser does when you ask for an italic it does not have."
          >
            <p className="text-[21px] leading-[1.5]">
              <Sheared>a memory from the valley</Sheared>
            </p>
            <p className="mt-3 font-heading text-[24px] leading-[1.35]">
              <Sheared>That Beautiful Walk</Sheared>
            </p>
          </Mount>
          <Mount
            tone="pick"
            label="The real italics"
            note="Same two families, same sizes. Drawn letterforms, not slanted ones."
          >
            <p
              className="text-[21px] italic leading-[1.5]"
              style={{ fontFamily: "var(--sl-true-body)" }}
            >
              a memory from the valley
            </p>
            <p
              className="mt-3 text-[24px] italic leading-[1.35]"
              style={{ fontFamily: "var(--sl-true-head)" }}
            >
              That Beautiful Walk
            </p>
          </Mount>
        </Bench>
      </div>

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65]">
        Look at the <b>a</b> and the <b>f</b>. On the left they are the upright letters leaning over:
        a two-storey <b>a</b>, an <b>f</b> that stops at the baseline. On the right they are different
        letters: a single-storey <b>a</b>, an <b>f</b> with a descending tail, rounder joins. That is
        the difference between a slant and an italic.
      </p>
      <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.6] text-muted-foreground">
        A note on how this demo is built, because it matters. Loading the real italic on this page
        registers it globally under the family name{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[14px]">Libre Baskerville</code>, which
        would silently upgrade the &quot;shipped&quot; side too and make the comparison a lie. So the
        left specimen reproduces the browser&apos;s synthesis directly: the roman face at{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[14px]">skewX(-11.3deg)</code>, which is
        the 20% shear a rasteriser applies when no italic face exists. The right specimen is the real
        file.
      </p>

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65]">
        There is a second, larger version of the same mistake sitting next to it.{" "}
        <b>Both families are variable fonts</b>, and the app loads neither as one. Libre Baskerville
        has a wght axis from 400 to 700 across both roman and italic; Source Sans 3 runs 200 to 900.
        Passing a{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">weight</code> array to next/font
        is the single thing that opts out of the variable file, and{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">layout.tsx</code> passes one to
        both. So the product downloads <b>six static files</b> where four variable ones would carry
        strictly more, including every weight in between and the italics.
      </p>
      <p className="mt-3 max-w-[70ch] text-[17px] leading-[1.65] text-muted-foreground">
        Worth correcting an old belief here, because it is written down in a few places: Libre
        Baskerville used to ship as three static styles with no Bold Italic. That has not been true
        for a while. It is variable now, with a real Bold Italic, which makes loading it as two
        static files a straight loss. The byte counts are in the{" "}
        <Link
          href="/preview/delight/second-look/type"
          className="font-semibold text-leaf underline decoration-leaf/40 underline-offset-2 transition-colors hover:decoration-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
        >
          font room
        </Link>
        .
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule nav="Radii">And the radius names do not mean what they say</Rule>

      <p className="mb-6 max-w-[70ch] text-[17px] leading-[1.65]">
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">--radius: 1rem</code> and every
        step is a multiplier off it. That redefines the whole Tailwind radius scale, so the familiar
        class names silently mean different numbers here than they do in every other project and in
        every reference anyone looks up.
      </p>

      <Ledger
        cols={["Class", "Stock Tailwind", "In this app", "Consequence"]}
        rows={[
          { k: "rounded-md", v: ["6px", "12px", "matches the input radius, by luck"] },
          { k: "rounded-lg", v: ["8px", "16px", "this is the documented card radius"], good: [1] },
          {
            k: "rounded-xl",
            v: ["12px", "20.8px", "what shadcn Card uses, so Card is 4.8px off spec"],
            bad: [1],
          },
          {
            k: "rounded-2xl",
            v: ["16px", "27.2px", "reached for when someone wants the 16px card, gets 27.2"],
            bad: [1],
          },
          { k: "rounded-3xl", v: ["24px", "33.6px", ""] },
        ]}
      />

      <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.65]">
        The practical damage: the design system says cards are 16px, 87 hand-rolled cards write{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">rounded-[var(--radius)]</code> and
        get it, and the shared <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">Card</code>{" "}
        component writes <code className="rounded bg-mist px-1.5 py-0.5 text-[15px]">rounded-xl</code>{" "}
        and gets 20.8px. Two card radii ship side by side, and the one in the shared component is the
        wrong one.
      </p>

      <Verdict>
        <p>
          <b>The sidebar fix is four values.</b> Idle ink <code>#D3E2D9</code>, metadata ink{" "}
          <code>#B4CBBE</code>, label size <code>14px</code>, icon stroke <code>2</code>, and separate
          hover <code>#2E6A55</code> from active <code>#357760</code>. Keep the cinnamon edge, keep
          248px, keep your icons. The preview you admired changed those too, and it was wrong to.
        </p>
        <p>
          <b>The real fix is a craft layer nobody has ever set.</b> Six rules, each of which is a
          one-line lint check:
        </p>
        <ol className="ml-5 list-decimal space-y-1.5 text-[16px] leading-[1.6] marker:text-muted-foreground">
          <li>
            Text colour is an opaque token. No <code>/NN</code> alpha on a text colour, ever.
          </li>
          <li>
            Darken <code>--muted-foreground</code> to <code>#5E6259</code>. One hex, 568 usages, two
            failing surfaces fixed.
          </li>
          <li>Type sizes are whole pixels, from a ladder of about eight steps.</li>
          <li>
            Icon <code>strokeWidth</code> is 2, or 1.5 for a documented decorative case. Nothing else.
          </li>
          <li>Load the italics. Load Source Sans 3 as the variable font it is.</li>
          <li>
            Stop multiplying the radius scale. Set the steps to real numbers so{" "}
            <code>rounded-lg</code> means 16 and <code>Card</code> stops disagreeing with the spec.
          </li>
        </ol>
        <p className="text-muted-foreground">
          None of this changes a single layout. It is the difference you saw and could not name, and
          it is the cheapest quality available in the whole product.
        </p>
      </Verdict>
    </LabShell>
  );
}
