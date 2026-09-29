"use client";

import { useState } from "react";
import Link from "@/components/common/link";
import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Pick, Controls } from "../_second-look-kit";
import { PAIRINGS, ALL_FONT_VARS, SHIPPED_KB } from "./_fonts";
import {
  Specimen,
  ItalicBench,
  WeightLadder,
  DigitJitter,
  OpticalDemo,
  OpticalRatio,
  SystemStackDemo,
  FactList,
} from "./_specimens";

const CODE =
  "rounded bg-mist px-1.5 py-0.5 text-[15px] text-foreground";

export default function TypeRoom() {
  const [k, setK] = useState(PAIRINGS[0].k);
  const p = PAIRINGS.find((x) => x.k === k)!;

  return (
    <div className={ALL_FONT_VARS}>
      <LabShell
        title="The font question"
        lede="You asked, half seriously, what would happen if you used the Apple font. You cannot, the licence is explicit, and it would be the wrong call anyway. The useful part is what turned up on the way to that answer: two mechanical faults in how the type is loaded, which no font swap would fix, and a third that only a different heading face can fix."
      >
        <Tell
          stats={[
            { n: "0", of: "italic font files loaded, in a product that renders italics" },
            { n: "101.0", of: "KB of font shipped today, as six static files with no italic", tone: "plain" as const },
            {
              n: "+18.6",
              of: "KB to load the same two families properly, and get every weight plus two real italics",
              tone: "good" as const,
            },
            { n: "18", of: "heading weights the app asks for that the loaded files cannot supply" },
            { n: "20.7", of: "px a five-digit number moves as its digits change, in the heading face" },
          ]}
        >
          <p>
            Everything in this room was measured off the font binaries in{" "}
            <code className={CODE}>google/fonts</code>, not read off a spec sheet. Set widths are
            advance-width sums. Contrast is the thickest run through a lowercase <b>o</b> divided by
            the thinnest, off a 600px render. Byte counts are <code className={CODE}>content-length</code>{" "}
            on the actual latin woff2 that Google serves.
          </p>
          <p>
            Fix faults one and two first. They are four lines in{" "}
            <code className={CODE}>src/app/layout.tsx</code> and they cost 18.6 KB. Until that is
            done you cannot fairly judge whether you like the typefaces, because you have never seen
            either of them rendered properly. Fault three is in the drawing, not the delivery, and
            only a different heading face fixes it.
          </p>
          <p>
            Then the taste question, which has a real answer and it is not the one you would expect.
            Libre Baskerville is not a bad typeface. It is a <b>body</b> typeface, and it says so
            itself, in the description that ships with the file. Every property that makes it good at
            16px is a property you are paying for at 30px, and the negative letter-spacing in{" "}
            <code className={CODE}>globals.css</code> is the compensation.
          </p>
          <p>
            Five alternatives are rendered live further down, in the real faces, at the real sizes
            the product uses. One of them is doing nothing but loading what you already have
            correctly, and it is a serious contender.
          </p>
        </Tell>

        {/* ============================================================ */}
        <Rule nav="No italics">Fault one · no italic file is ever downloaded</Rule>

        <div className="mb-8 grid gap-x-12 gap-y-4 text-[17px] leading-[1.65] lg:grid-cols-2">
          <p>
            Both loaders in <code className={CODE}>src/app/layout.tsx</code> omit{" "}
            <code className={CODE}>style</code>. next/font defaults that to{" "}
            <code className={CODE}>[&quot;normal&quot;]</code>, so only roman files are requested and
            no italic exists at runtime. Four places hard-code an{" "}
            <code className={CODE}>italic</code> class, and on top of that every{" "}
            <code className={CODE}>*word*</code> a member types in a post or a letter comes back from{" "}
            <code className={CODE}>renderRichText</code> as an{" "}
            <code className={CODE}>&lt;em&gt;</code>, so italics also appear in user content across
            the feed, post detail and letters.
          </p>
          <div className="space-y-4">
            <p>
              What renders instead is a synthesised oblique: the browser shears the roman by 20%,
              which is <code className={CODE}>atan(0.2) = 11.31deg</code>. A real italic is not a
              slanted roman. It is a different alphabet, narrower, with different joins, drawn at 15
              degrees in Libre Baskerville and 11 in Source Sans 3.
            </p>
            <p className="text-muted-foreground">
              Both families ship true italics and you already own them. Source Sans 3 has one across
              the whole 200 to 900 range. Libre Baskerville has one across 400 to 700.
            </p>
          </div>
        </div>

        <Bench>
          <Mount tone="shipped" label="What ships" note="The roman, sheared 11.31 degrees.">
            <ItalicBench real={false} />
          </Mount>
          <Mount tone="pick" label="The real files" note="Same two families, downloaded.">
            <ItalicBench real />
          </Mount>
        </Bench>

        <div className="mt-6 grid gap-x-12 gap-y-4 lg:grid-cols-2">
          <p className="text-[17px] leading-[1.65]">
            Look at the <b>a</b>, the <b>f</b> and the <b>g</b>. In the sheared sample they are the
            upright letters leaning over: two-storey <b>a</b>, an <b>f</b> that stops at the
            baseline, a <b>g</b> with both bowls, and every advance identical to the roman. In the
            real one they are different letters with different widths. At 30px the phrase beside
            this sets <b>8.9px narrower</b> in the Libre Baskerville italic than in its roman, and{" "}
            <b>2.8px wider</b> in the Source Sans 3 italic. A real italic is redrawn, not squeezed,
            so it does not reliably go one way.
          </p>
          <p className="text-[15px] leading-[1.6] text-muted-foreground">
            How this demo is built, because it matters. next/font emits its faces under the real
            family name, not a hashed one, so loading the true italic anywhere on this page makes it
            available to everything on the page, including the specimen that is meant to show you
            what ships. The &quot;what ships&quot; specimen therefore reproduces the synthesis directly with
            a transform, and pins its weights to 400 and 700, rather than asking for{" "}
            <code className={CODE}>font-style: italic</code> and being quietly upgraded.
          </p>
        </div>

        {/* ============================================================ */}
        <Rule nav="Loaded as statics">Fault two · both families are variable, and both load as statics</Rule>

        <div className="grid items-start gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="space-y-4 text-[17px] leading-[1.65]">
            <p>
              <code className={CODE}>
                weight: [&quot;400&quot;, &quot;500&quot;, &quot;600&quot;, &quot;700&quot;]
              </code>{" "}
              on Source Sans 3 and{" "}
              <code className={CODE}>weight: [&quot;400&quot;, &quot;700&quot;]</code> on Libre
              Baskerville. Both are variable fonts. Passing a weight array is the one thing that opts
              you out of the variable file: in{" "}
              <code className={CODE}>validate-google-font-function-call.js</code>, the only path that
              reaches <code className={CODE}>weights.push(&apos;variable&apos;)</code> is the one
              where no weight was given at all.
            </p>
            <p>
              So the app downloads <b>six static files where four would carry strictly more</b>. The
              honest accounting: the swap saves 5.3 KB on Source Sans 3, where four statics are
              already more expensive than one variable file plus its italic, and costs 24.0 KB on
              Libre Baskerville, where two statics are cheap. Net <b>18.6 KB heavier</b>, in exchange
              for every intermediate weight in both families and two real italics.
            </p>
            <p className="text-muted-foreground">
              Libre Baskerville shipped for years as three static styles with no Bold Italic. As of
              v24 it is a variable font: wght 400 to 700 in both roman and italic, with a Bold Italic
              named instance, which is what{" "}
              <code className={CODE}>next/font</code>&apos;s own font-data lists. The app is throwing
              all of that away.
            </p>
          </div>

          <Ledger
            firstCol="34%"
            cols={["", "What ships today", "Loaded properly"]}
            rows={[
              {
                k: "Source Sans 3",
                v: ["4 statics, 61.2 KB", "1 variable + 1 italic, 55.9 KB"],
                good: [1],
              },
              {
                k: "Libre Baskerville",
                v: ["2 statics, 39.7 KB", "1 variable + 1 italic, 63.7 KB"],
                bad: [1],
              },
              { k: "Total latin woff2", v: ["101.0 KB", "119.6 KB, up 18.6"], bad: [1] },
              { k: "Italic styles", v: ["0", "2, both real"], bad: [0], good: [1] },
              {
                k: "Body weights",
                v: ["4: 400, 500, 600, 700", "every value, 200 to 900"],
                good: [1],
              },
              {
                k: "Heading weights",
                v: ["2: 400 and 700", "every value, 400 to 700"],
                bad: [0],
                good: [1],
              },
            ]}
          />
        </div>

        <div className="mt-11">
          <div className="mb-6 grid gap-x-12 gap-y-4 text-[17px] leading-[1.65] lg:grid-cols-2">
            <p>
              The cost is not only bytes. 118 places in the app write{" "}
              <code className={CODE}>font-heading</code>, and 18 of them ask for a weight the two
              loaded files cannot supply. CSS font matching does not fail loudly, it picks the
              nearest available file: a request for 500 resolves down to 400, a request for 600
              resolves up to 700.
            </p>
            <p>
              So <code className={CODE}>font-heading font-medium</code> in the shared{" "}
              <code className={CODE}>Card</code>, <code className={CODE}>Dialog</code> and{" "}
              <code className={CODE}>Sheet</code> titles is rendering identically to{" "}
              <code className={CODE}>font-normal</code>, and the{" "}
              <code className={CODE}>font-semibold</code> on every Catch-up card title and the
              rail&apos;s letter titles is rendering identically to{" "}
              <code className={CODE}>font-bold</code>. Two of the four steps on the heading ladder do
              not exist.
            </p>
          </div>

          <Bench>
            <Mount tone="shipped" label="Two static files" note="What each class actually renders.">
              <WeightLadder variable={false} />
            </Mount>
            <Mount tone="pick" label="One variable file" note="Same classes, nothing else changed.">
              <WeightLadder variable />
            </Mount>
          </Bench>
        </div>

        {/* ============================================================ */}
        <Rule nav="Jumping digits">Fault three · numbers in the heading face cannot be made to line up</Rule>

        <div className="mb-6 grid gap-x-12 gap-y-4 text-[17px] leading-[1.65] lg:grid-cols-2">
          <p>
            Libre Baskerville&apos;s digits are proportional and it has no{" "}
            <code className={CODE}>tnum</code> feature, so there is nothing to switch on. Its zero is
            755 units wide and its one is 436, a spread of <b>31.9% of the em</b>. Two places set
            live numbers in it: the weekly counts in{" "}
            <code className={CODE}>pulse-module.tsx</code> at 17px, and the admission number in{" "}
            <code className={CODE}>admission-stamp.tsx</code> at 20px, inside a bordered box that
            centres its contents.
          </p>
          <p className="text-muted-foreground">
            This is the one fault on the page that loading the file correctly does not fix. It is a
            property of the drawing, not of the delivery. The only two ways out are to stop setting
            numbers in the heading face, or to change the heading face. Of the five options further
            down, exactly one has tabular figures.
          </p>
        </div>

        <Bench>
          <Mount tone="shipped" label="Libre Baskerville 700" note="Five real admission numbers, 20px.">
            <DigitJitter face="libre" />
          </Mount>
          <Mount tone="pick" label="Source Sans 3 600" note="The same five, same size.">
            <DigitJitter face="source" />
          </Mount>
        </Bench>

        <div className="mt-6 grid gap-x-12 gap-y-4 text-[17px] leading-[1.65] lg:grid-cols-2">
          <p>
            There is a related surprise. <code className={CODE}>tabular-nums</code> appears 15 times
            in <code className={CODE}>src/components</code> and zero times in{" "}
            <code className={CODE}>src/app/(main)</code>, and{" "}
            <b>all 15 of them are doing nothing at all</b>. Tailwind compiles the class to{" "}
            <code className={CODE}>font-variant-numeric: tabular-nums</code>, which asks for the
            OpenType <code className={CODE}>tnum</code> feature, and Source Sans 3 has no such
            feature because it does not need one: all ten of its digits are already 472 units wide.
          </p>
          <p className="text-muted-foreground">
            So nothing jitters in the body face today, by luck rather than by decision. That matters
            for what comes next: three of the four alternative body faces below (Public Sans, Inter,
            Figtree) default to proportional figures, so those 15 dead classes become load-bearing
            the moment you switch, and every other place that shows a number without one starts to
            move.
          </p>
        </div>

        {/* ============================================================ */}
        <Rule nav="Is Libre right?">So: is Libre Baskerville right for headings?</Rule>

        <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-[17px] leading-[1.65]">
            <p>
              The case against is a category error, not taste. Here is its own description, in the
              designer&apos;s words, shipped with the font:
            </p>
            <blockquote className="relative rounded-[12px] bg-mist py-3.5 pl-5 pr-4 text-[16px] leading-[1.6]">
              <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-cinnamon" />
              Libre Baskerville is a web font optimized for body text (typically 16px.) It is based
              on the American Type Founder&apos;s Baskerville from 1941, but it has a taller
              x-height, wider counters and a little less contrast, that allow it to work well for
              reading on-screen.
            </blockquote>
            <p>
              Every one of those three changes is a deliberate anti-display move, made to help a
              16px paragraph. The app sets it as large as 40px, where all three work against you,
              and as small as 11.5px, where a face drawn for 16px is also not right. Between those
              it takes 17 different sizes.
            </p>
            <p>
              That is what the blanket <code className={CODE}>tracking-tight</code> on{" "}
              <code className={CODE}>h1, h2, h3, h4</code> in{" "}
              <code className={CODE}>globals.css</code> is for. It applies a flat{" "}
              <code className={CODE}>-0.025em</code> at every size, which is a linear correction for
              a non-linear problem: letterfit drawn for 16px is too loose at 40px and too tight at
              11px, and one number cannot be right for both.
            </p>
          </div>

          <Ledger
            firstCol="36%"
            cols={["Measured at 30px, wght 600 or 700", "Libre Baskerville", "Best of the five"]}
            rows={[
              {
                k: "Set width of a 30-char line",
                v: ["473.9px", "388.9px, Newsreader"],
                bad: [0],
                good: [1],
              },
              { k: "x-height rendered", v: ["15.90px", "13.45px, Newsreader"], bad: [0] },
              {
                k: "Stroke contrast, thick over thin",
                v: ["2.69", "3.12, Newsreader"],
                bad: [0],
                good: [1],
              },
              {
                k: "Digit spread, share of em",
                v: ["31.9%", "0%, Newsreader"],
                bad: [0],
                good: [1],
              },
              { k: "Optical size axis", v: ["none", "9 to 144, Fraunces"], bad: [0], good: [1] },
              { k: "Real small caps", v: ["no", "yes, Literata"], bad: [0], good: [1] },
              { k: "Weight range", v: ["400 to 700", "100 to 900, Fraunces"], bad: [0] },
            ]}
          />
        </div>

        <div className="mt-7 grid gap-x-12 gap-y-4 text-[17px] leading-[1.65] lg:grid-cols-2">
          <p>
            The set width is the one with a daily cost. At 30px the same headline is{" "}
            <b>85 pixels longer</b> in Libre Baskerville than in Newsreader, which in a 318px rail
            card is the difference between two lines and three, on every card, forever. It is the
            safe serif, not the boutique one, and its virtues are precisely the ones a heading does
            not need.
          </p>
          <p className="text-muted-foreground">
            One correction to the received wisdom, since I measured it rather than repeating it:
            Libre Baskerville&apos;s extenders are <b>not</b> unusually short. Its ascender rises
            0.566 of an x-height above the x-height, better than Literata at 0.498 and Instrument
            Serif at 0.451. The problem is not squashed ascenders. It is that the whole drawing sits
            large on the em, so at a nominal 30px it renders 18% taller in the lowercase and 22%
            wider than a face designed for that size, and blockier as a direct result.
          </p>
        </div>

        {/* ============================================================ */}
        <Rule nav="Optical size">What an optical size axis actually buys</Rule>

        <p className="mb-6 max-w-[74ch] text-[17px] leading-[1.65]">
          This is the legitimate version of what you were asking for when you said SF. A face with an{" "}
          <code className={CODE}>opsz</code> axis contains a continuum of
          drawings, not one drawing scaled. Small sizes get open counters, low contrast and loose
          spacing. Large sizes get tight spacing and dramatic thick-to-thin. The browser drives the
          axis automatically, because <code className={CODE}>font-optical-sizing: auto</code> is the
          CSS default. Below is Newsreader at 30px and weight 600, with only the axis moving.
        </p>

        <OpticalDemo />

        <div className="mt-7 grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="space-y-4 text-[17px] leading-[1.65]">
            <p>
              From opsz 6 to opsz 72 the same line goes from 498.3px to 424.7px wide and from 1.57
              contrast to 5.11, <b>with no change to font-size, weight or letter-spacing</b>. That is
              what <code className={CODE}>tracking-tight</code> is trying and failing to approximate
              with one number. The grey line underneath is Libre Baskerville, which has one drawing
              and holds it at 473.9px and 2.69 whether it is a masthead or a timestamp.
            </p>
            <p>
              You do not have to drive the axis by hand.{" "}
              <code className={CODE}>font-optical-sizing: auto</code> is the CSS initial value, so
              the browser sets opsz to the used font size on its own. The table beside this measures
              that in your browser rather than quoting it: it sets the same line at 12px and again at
              60px, a 5x change, and divides. A face with one drawing scores exactly <b>5.000</b>. A
              face with a working axis scores less, because the 60px drawing is narrower than five of
              the 12px drawing.
            </p>
            <p className="text-muted-foreground">
              A trap if you go this way. next/font only puts an axis in the Google URL if you name
              it: <code className={CODE}>get-font-axes.js</code> filters on{" "}
              <code className={CODE}>selectedVariableAxes.includes(tag)</code>. Load Newsreader
              without <code className={CODE}>axes: [&quot;opsz&quot;]</code> and you get the file
              pinned at its default optical size of 16, the body drawing, at every size on the site.
              You would pay for the font and get none of the reason you chose it. The axis also costs
              real bytes: 152.6 KB for Newsreader, 114.4 KB for Literata, 65.3 KB for Fraunces.
            </p>
          </div>

          <div className="min-w-0">
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Line at 60px, divided by line at 12px
            </div>
            <OpticalRatio />
            <p className="mt-2.5 text-[14px] leading-[1.55] text-muted-foreground">
              Computed on load, in your browser, after the five families have finished downloading.
              The two faces with no axis are the control: they cannot score anything but 5.000.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        <Rule nav="Source Sans 3">Source Sans 3, in fairness</Rule>

        <div className="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="space-y-3 text-[17px] leading-[1.65]">
            <p>
              Not the problem. A humanist sans by Paul D. Hunt, Adobe&apos;s first open-source
              typeface, and by some distance the best-equipped face in this whole comparison: true
              italics across the full weight range, real small caps and small-cap capitals, oldstyle
              figures, a slashed zero, ten stylistic sets, nineteen character variants, tabular
              figures by default, and a wght axis from 200 to 900. The app uses none of that except
              the roman at four weights.
            </p>
            <p>
              Two honest limitations. It has <b>no optical size axis</b>, so one drawing serves 10.5px
              metadata and 20px subheads, which is the same structural fault as Libre Baskerville and
              nobody notices because a sans hides it better. And it has <b>no character</b>, by
              design: it was drawn to disappear into Adobe application chrome. Against a warm paper
              field-journal register it reads as <i>application</i> rather than <i>journal</i>.
            </p>
            <p className="text-muted-foreground">
              That is a reason to be relaxed about keeping it. If the display face carries the
              personality, a quiet body face is an asset, not a liability. Two of the five pairings
              below keep it for exactly that reason.
            </p>
          </div>

          <div>
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              What is inside the file
            </div>
            <FactList
              rows={[
                { k: "True italic, 200 to 900", v: "yes", tone: "good" },
                { k: "Tabular figures", v: "by default", tone: "good" },
                { k: "Real small caps (smcp, c2sc)", v: "yes", tone: "good" },
                { k: "Slashed zero (zero)", v: "yes", tone: "good" },
                { k: "Oldstyle figures (onum)", v: "yes", tone: "good" },
                { k: "Stylistic sets and char variants", v: "10 and 19", tone: "good" },
                { k: "Optical size axis", v: "no", tone: "bad" },
              ]}
            />
          </div>
        </div>

        {/* ============================================================ */}
        <Rule nav="The Apple font">The Apple font, answered</Rule>

        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-[17px] leading-[1.65]">
            <p>
              You mean SF Pro. The answer is no, and it is not a close call. Apple&apos;s own licence,
              in the file you agree to when you download it:
            </p>
            <blockquote className="relative rounded-[12px] bg-mist py-3.5 pl-5 pr-4 text-[16px] leading-[1.6]">
              <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-heart" />
              THE APPLE SF PRO FONT IS TO BE USED SOLELY FOR CREATING MOCK-UPS OF USER INTERFACES TO
              BE USED IN SOFTWARE PRODUCTS RUNNING ON APPLE&apos;S iOS, iPadOS, macOS OR tvOS
              OPERATING SYSTEMS, AS APPLICABLE.
            </blockquote>
            <p>
              And the matching clause in the Apple Design Resources licence, section 2.B, which I
              pulled out of the PDF rather than quoting from a blog:
            </p>
            <blockquote className="relative rounded-[12px] bg-mist py-3.5 pl-5 pr-4 text-[16px] leading-[1.6]">
              <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-heart" />
              Except as expressly provided for herein, you may not use the Apple Design Resources to
              create, develop, display or otherwise distribute any documentation, artwork,{" "}
              <b>website content</b> or any other work product.
            </blockquote>
            <p>
              Self-hosting an <code className={CODE}>SF-Pro.woff2</code> is a licence violation, full
              stop. Apple staff say the same thing on their own forums, in plain language: &quot;The
              restriction on San Francisco font is that if you download the font, any use would only
              be allowed for UI mockups. So don&apos;t download the font and add to your app bundle.
              Use the tags above for web pages.&quot;
            </p>
            <p>
              The legal route is the one they point at: the system stack. Zero bytes, zero font
              loading flash, native hinting. It is rendering the sample below labelled &quot;the
              system stack&quot;, on your machine, right now.
            </p>
          </div>

          <div className="min-w-0 space-y-6">
            <SystemStackDemo />
            <Ledger
              firstCol="46%"
              cols={["", "Self-hosted SF", "The system stack"]}
              rows={[
                { k: "Legal", v: ["no", "yes"], bad: [0], good: [1] },
                { k: "Font bytes shipped", v: ["a whole family", "0"], good: [1] },
                { k: "Optical sizing", v: ["yes", "yes"] },
                { k: "Same face for every visitor", v: ["yes", "no"], bad: [1] },
                { k: "You can design to it", v: ["yes", "no"], bad: [1] },
                { k: "Reads as your brand", v: ["no", "no"], bad: [0, 1] },
              ]}
            />
          </div>
        </div>

        <p className="mt-6 max-w-[74ch] text-[17px] leading-[1.65]">
          Two things kill the system stack here, and neither is legal. The first is that{" "}
          <b>your brand becomes a different typeface on every operating system</b>. The same
          thirty-character line is 225.7px in SF and 211.8px in Roboto at 16px, a 6.6% difference on
          one line, so a card you tuned on a Mac breaks differently on an Android tablet and you can
          never see what most people see.
          The second is that SF is the single strongest available signal of <i>unstyled default</i>.
          It is the typeface of an iOS settings screen. A boutique field journal for a Krishnamurti
          school is the exact thing it cannot say.
        </p>
        <p className="mt-3 max-w-[74ch] text-[17px] leading-[1.65] text-muted-foreground">
          What you were actually reaching for is <b>crispness and optical sizing</b>, which is real
          and which SF genuinely has: its own axis runs opsz 17 to 96. Both are available legally,
          and three of the five display faces below have the optical size axis that Libre Baskerville
          does not.
        </p>

        {/* ============================================================ */}
        <Rule nav="Five pairings">Five pairings, all free, all loaded honestly</Rule>

        <Controls>
          <Pick items={PAIRINGS.map((x) => ({ k: x.k, label: x.label }))} value={k} onChange={setK} />
          <span className="max-w-[54ch] text-[13px] leading-[1.5] text-muted-foreground">
            The second specimen follows this control. The first is held on exactly what ships today:
            static weights, sheared italics, no steps in between.
          </span>
        </Controls>

        <Bench>
          <Mount
            tone="shipped"
            label="What ships today"
            note={`Six static files, no italic. ${SHIPPED_KB} KB.`}
          >
            <Specimen p={PAIRINGS[0]} shipped />
          </Mount>
          <Mount
            tone={p.k === "fraunces" ? "pick" : "option"}
            label={`${p.head} + ${p.body}`}
            note={`Variable, true italics. ${p.kb} KB.`}
          >
            <Specimen p={p} />
          </Mount>
        </Bench>

        <p className="mt-4 text-[13px] leading-[1.55] text-muted-foreground">
          <b className="font-semibold text-foreground">{p.head}:</b> {p.axes}
        </p>

        <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative pl-5">
            <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-leaf" />
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">
              Why {p.head} fits this brand
            </div>
            <p className="mt-2 text-[16px] leading-[1.6]">{p.why}</p>
          </div>
          <div className="relative pl-5">
            <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-heart" />
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-heart">
              The named risk
            </div>
            <p className="mt-2 text-[16px] leading-[1.6]">{p.risk}</p>
          </div>
        </div>

        <div className="mt-9">
          <Ledger
            firstCol="24%"
            cols={["Pairing", "Latin woff2", "Headline width", "Contrast", "Heading digits"]}
            rows={[
              {
                k: "What ships today",
                v: [`${SHIPPED_KB} KB`, "473.9px", "2.69", "proportional, no fix"],
                bad: [3],
              },
              ...PAIRINGS.map((x) => ({
                k: `${x.head} + ${x.body}`,
                v: [
                  `${x.kb} KB`,
                  `${x.setWidth}px`,
                  `${x.contrast}`,
                  x.digitSpread === 0 ? "tabular" : `proportional, ${x.digitSpread}% spread`,
                ],
                good: x.kb < SHIPPED_KB ? [0] : x.digitSpread === 0 ? [3] : undefined,
                bad: x.kb > 250 ? [0] : undefined,
              })),
            ]}
          />
          <p className="mt-4 max-w-[74ch] text-[15px] leading-[1.6] text-muted-foreground">
            Byte counts are <code className={CODE}>content-length</code> on the latin woff2 Google
            actually serves, roman plus true italic, with the axes each option would ship with. Every
            loader here passes <code className={CODE}>subsets: [&quot;latin&quot;]</code>, so the
            cyrillic and greek cuts are never fetched and are not in these numbers. Fraunces is
            costed without SOFT and WONK, which add 118.4 KB for a look that will date. Instrument
            Serif has no optical size axis to buy. Inter has one, 14 to 32, and is costed and loaded
            here without it: that saves 51.5 KB and pins it at 14, which is the trap described above,
            taken deliberately and named.
          </p>
        </div>

        {/* ============================================================ */}
        <Rule nav="Crispness">Crispness, which is a separate question from taste</Rule>

        <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-[17px] leading-[1.65]">
            <p>
              <b>The global antialiasing setting.</b>{" "}
              <code className={CODE}>&lt;body className=&quot;... antialiased&quot;&gt;</code>{" "}
              compiles to <code className={CODE}>-webkit-font-smoothing: antialiased</code> plus{" "}
              <code className={CODE}>-moz-osx-font-smoothing: grayscale</code>. The received wisdom is
              that it is correct for light-on-dark and wrong for dark-on-light, because the lighter
              rasterisation thins the stems, and dark ink on warm paper is the case that needs the
              weight.
            </p>
            <p>
              That is true as far as it goes, and it is not the important fact. The important fact is
              that <b>this property does nothing at all outside macOS</b>. Not Windows, not Android,
              not Linux, not even Safari on iOS. So it is not a rendering decision for your members.
              It is a rendering decision for you, on the machine you design on.
            </p>
            <p>
              Which flips the recommendation. The macOS default renders the same type heavier than{" "}
              <code className={CODE}>antialiased</code> does, so removing the class would make your
              Mac render the app heavier than the majority of your members will ever see it, and
              every weight judgement you make would be tuned to a rendering nobody else gets.{" "}
              <b>Keep it.</b> If the type reads thin,
              that is the ink, not the smoothing: the craft room has{" "}
              <code className={CODE}>--muted-foreground</code> at 4.40:1 on card, below AA.
            </p>
          </div>

          <div className="space-y-3 text-[17px] leading-[1.65]">
            <p>
              <b>Whole pixels, which is the real lever.</b> A 1.9px icon stroke cannot be drawn: the
              renderer spreads it across two pixel columns at partial coverage, so the edge becomes a
              grey ramp instead of an edge. A 14.5px type size puts the font&apos;s hinted stem
              positions between pixels for the same reason. The app has{" "}
              <b>86 fractional type sizes across six values</b> and{" "}
              <b>47 explicit stroke widths across sixteen values</b>, and the single most common
              stroke in the product is <b>1.9</b>, used 15 times, against 8 uses of the whole number
              2. On a Retina display this halves the problem. On the external 1080p monitor most
              people use, it is the whole problem.
            </p>
            <p>
              <b>Features worth switching on, none of which cost a byte.</b>{" "}
              <code className={CODE}>font-variant-numeric: slashed-zero</code> on admission numbers
              and IDs, because Source Sans 3 has a <code className={CODE}>zero</code> feature and an
              admission number is exactly where 0 and O get confused. And real small caps: all{" "}
              <b>50</b> uppercase labels in the shipped app are{" "}
              <code className={CODE}>uppercase</code> plus positive tracking, 43 of them at 10.5 or
              11px, which is a hand-built imitation of small caps in which the capitals are too heavy
              for the line beside them. Source Sans 3 has genuine{" "}
              <code className={CODE}>smcp</code> and <code className={CODE}>c2sc</code>, drawn at the
              right weight. Libre Baskerville has neither, which is one more thing the heading face
              cannot do.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        <Verdict>
          <p>
            <b>Do the loading fixes this week, whatever you decide about the faces.</b> Delete
            the two <code>weight</code> arrays, add{" "}
            <code>style: [&quot;normal&quot;, &quot;italic&quot;]</code> to both loaders. Two lines
            out, two lines in, one file. You get real italics, every weight from 200 to 900 in the
            body and 400 to
            700 in the heading, and the 18 mis-resolving heading weights fixed, for{" "}
            <b>18.6 KB</b>. That is the whole cost, and it is the only change in this room that
            carries no design risk at all.
          </p>
          <p>
            <b>Then change the heading face to Fraunces, and keep Source Sans 3.</b> Three of the
            five display faces have an optical size axis. Fraunces has the widest by a distance, 9 to
            144 against 6 to 72 and 7 to 72, and it is the cheapest of the three: 145.6 KB against
            Literata&apos;s 218.3 and Newsreader&apos;s 272.4. An axis that wide means spacing and
            contrast move with size the way
            they are supposed to, so you can delete the blanket <code>tracking-tight</code> hack
            instead of tuning it. It sets 10% narrower than what you have, at higher contrast, with
            weights between 400 and 700 that actually exist, and it is the only face here with a
            distinct voice that is still a serious reading face. Ship it with{" "}
            <code>axes: [&quot;opsz&quot;]</code> and without SOFT or WONK: 201.5 KB, which is 100.5
            KB more than the app ships today. That is the real price, and it is the strongest
            argument against this recommendation.
          </p>
          <p>
            <b>Runner-up: keep Libre Baskerville and just fix it.</b>{" "}
            Not Newsreader, which is the better typeface but costs 326.1 KB, is the heaviest option
            here, and is quieter than the face it would replace, which is the wrong direction if the
            complaint is that the brand lacks character. &quot;Today, fixed&quot; loses to Fraunces
            on the axis, on set width (473.9px against 426.3) and on contrast (2.69 against 2.90). It
            wins on the two things a decision usually turns on: it is 81.9 KB lighter and it is zero
            design risk, because you already like it. If you flip the control above between the two and prefer
            what you have, take it. That is a real answer and you still bank both loading fixes.
          </p>
          <p>
            <b>Not Instrument Serif, and not Literata.</b> Instrument Serif is the most beautiful
            thing on this page at 30px and the least useful everywhere else: one weight means the
            serif can only appear on page titles, and pairing the most distinctive display face in
            the set with Inter puts your brand voice on the most common interface font on the web.
            Literata measures worse than the face it would replace on the thing that matters most
            here, contrast, at 2.30 against 2.69.
          </p>
          <p className="text-muted-foreground">
            One thing I could not settle. Every number here is measured on a Mac at 2x. Fraunces at
            opsz 9 on a 1080p Windows machine is the case I have no evidence for, and it is the case
            most of your members are in. Before committing, put the two candidates on a real 1x
            screen and look at an 11px label. That is the only test that would change my answer.
          </p>
        </Verdict>

        <p className="mt-8 text-[15px] leading-[1.6] text-muted-foreground">
          Related:{" "}
          <Link
            href="/lab/craft"
            className="rounded-sm font-semibold text-leaf underline decoration-leaf/40 underline-offset-2 transition-colors hover:decoration-leaf active:text-leaf/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            the craft room
          </Link>{" "}
          covers the ink contrast and the fractional sizes in full. It states that Libre Baskerville
          has no Bold Italic master, which was true of the original three-style release and is no
          longer true: Google Fonts now ships it as a variable font, wght 400 to 700 in both styles,
          with a real Bold Italic named instance. That makes the case for loading it properly
          stronger, not weaker.
        </p>
      </LabShell>
    </div>
  );
}
