"use client";

/* ------------------------------------------------------------------ *
 *  Composer, the lineup. A decision page: several fully-interactive
 *  composers, each isolating one axis of the rework, so the owner can
 *  pick a direction before we build it for real. None of these import
 *  the production CreatePostForm; every variant is a lightweight local
 *  mock (see ./_variants) so they can differ structurally, and posting
 *  is faked. Built on the shared DelightShell + DemoCard patterns.
 * ------------------------------------------------------------------ */

import { DelightShell, DemoGrid, DemoCard } from "../_kit";
import {
  GrowComposer,
  FmtBoxed,
  FmtPlain,
  FmtReveal,
  PackPlusPills,
  PackInline,
  PackMenu,
  CtaBar,
  CtaWeld,
  COMPOSER_CSS,
} from "./_variants";

export default function Page() {
  return (
    <DelightShell
      title="Composer, the lineup"
      lede="Directions to choose between before the rework. Every composer here is live: click to open it, type to wake the Post button, select text and hit B / I / U / S, then click the warm backdrop to fold it away. The axes are separated so you can mix and match: pick an expansion, a toolbar, a packaging, and a header treatment."
      css={COMPOSER_CSS}
    >
      {/* (a) expansion / compression */}
      <h2 className="cx-section">Expansion &amp; compression</h2>
      <p className="cx-lead">
        How the box comes alive from the resting pill, and folds back. The footer is identical across all three,
        so the only thing changing is the motion. Open one, then click the backdrop to watch it retract.
      </p>
      <DemoGrid>
        <DemoCard
          title="A. Grow and fade"
          note="The shipped motion. The box springs down from the pill to its natural height while the editor fades in. One clean downward growth, one clean fold back."
          span={3}
          pad={false}
        >
          <GrowComposer mode="grow" />
        </DemoCard>
        <DemoCard
          title="B. Staged reveal"
          note="The box grows to make room first, then the toolbar and actions slide up a beat later. Reads as two steps: clear the space, then furnish it."
          span={3}
          pad={false}
        >
          <GrowComposer mode="staged" />
        </DemoCard>
        <DemoCard
          title="C. Pop from the pill"
          note="The editor pops out of the pill as one piece, a small scale and settle. The most characterful of the three; the box still measures its real height so nothing jumps."
          span={3}
          pad={false}
        >
          <GrowComposer mode="scale" />
        </DemoCard>
      </DemoGrid>

      {/* (b) formatting toolbar */}
      <h2 className="cx-section">Formatting toolbar</h2>
      <p className="cx-lead">
        The same B / I / U / S controls, presented three ways. All use the grow-and-fade expansion, so here the
        only difference is how loud the formatting reads.
      </p>
      <DemoGrid>
        <DemoCard
          title="A. Boxed and tinted (today)"
          note="Today's treatment. The four controls live in a bordered, tinted group and the active mark fills canopy. Clear, but it pulls the eye."
          span={3}
          pad={false}
        >
          <GrowComposer FmtComp={FmtBoxed} />
        </DemoCard>
        <DemoCard
          title="B. Plain icons"
          note="Same four controls with no box and no fill. Active is a small canopy underline instead of a filled chip. Lighter, less busy at rest."
          span={3}
          pad={false}
        >
          <GrowComposer FmtComp={FmtPlain} />
        </DemoCard>
        <DemoCard
          title="C. Tucked behind Aa"
          note="A minimal footer. Formatting stays hidden until you tap Aa, then a plain row slides in. Best for people who mostly just type."
          span={3}
          pad={false}
        >
          <GrowComposer FmtComp={FmtReveal} />
        </DemoCard>
      </DemoGrid>

      {/* (c) poll + letter packaging */}
      <h2 className="cx-section">Poll and Letter, better packaged</h2>
      <p className="cx-lead">
        The word &ldquo;More&rdquo; is gone. Add poll and Write as a Letter stay tucked out of the way but read
        clearly. There are no tags anywhere.
      </p>
      <DemoGrid>
        <DemoCard
          title="A. Plus morphs into labelled pills"
          note="A single plus. Tap it and it turns, revealing Add poll and Write as a Letter as labelled pills. Tucked away, but legible the moment you look."
          span={3}
          pad={false}
        >
          <GrowComposer PackComp={PackPlusPills} />
        </DemoCard>
        <DemoCard
          title="B. Two actions, inline and low emphasis"
          note="No menu at all. Add poll and Write as a Letter sit in the footer at low emphasis, one tap each. Nothing hidden, nothing shouting."
          span={3}
          pad={false}
        >
          <GrowComposer PackComp={PackInline} />
        </DemoCard>
        <DemoCard
          title="C. A plain plus with a labelled menu"
          note="The middle path: a plain plus opens a small labelled menu. The same tucking as today, without the word More on the trigger."
          span={3}
          pad={false}
        >
          <GrowComposer PackComp={PackMenu} />
        </DemoCard>
      </DemoGrid>

      {/* (d) composer absorbs the New post CTA */}
      <h2 className="cx-section">The composer is the New post button</h2>
      <p className="cx-lead">
        Search and notifications move to the right, and the composer itself becomes the obvious way to start a
        post, so there is no separate, redundant New post button. The search circle and the bell here are mock
        props to show the header idea; they are not wired to the real header.
      </p>
      <DemoGrid>
        <DemoCard
          title="A. The bar is the call to action"
          note="No separate button. The composer bar is a canopy call to action in its own right; search and the bell sit to its right. Click it to write, and it opens in place."
          span={3}
          pad={false}
        >
          <CtaBar />
        </DemoCard>
        <DemoCard
          title="B. A welded compose button"
          note="The bar stays a calm input, with a canopy compose button welded to its end as the explicit New post affordance. Search and the bell follow on the right."
          span={3}
          pad={false}
        >
          <CtaWeld />
        </DemoCard>
      </DemoGrid>

      <div className="cx-closing">
        These are knobs, not packages. A shipped composer is one choice from each row, for example{" "}
        <b>grow and fade</b> plus <b>plain icons</b> plus <b>plus-into-pills</b>, with the header treatment
        applied if we absorb the New post button. Tell me the four you want and I will build that single composer
        into the real feed.
      </div>
    </DelightShell>
  );
}
