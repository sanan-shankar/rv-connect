"use client";

/* ------------------------------------------------------------------ *
 *  The same words, four containers.
 *
 *  A decision room. The owner wants an in-app guide, one chapter per
 *  area, reachable from somewhere so quiet that nobody who is not
 *  looking for it ever sees it. Before we can choose that somewhere we
 *  have to know what the door opens onto, because a hover that yanks
 *  you to another route and a hover that opens a sheet want different
 *  doors.
 *
 *  So: one real chapter, Catch-ups, because it is the hardest one to
 *  explain and he said so. Four presentations. Identical words in all
 *  four (see ./_content) so nothing about the writing can sway the
 *  pick. Placement is deliberately NOT decided here; every stage opens
 *  from a plain labelled button sitting outside the mock.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { DelightShell, Seg } from "../_kit";
import { StagePage, StagePanel, StageAnchored, StageIntercept, type View } from "./_stages";

export default function Page() {
  const [view, setView] = useState<View>("desktop");

  return (
    <DelightShell
      title="The same words, four containers"
      lede="One chapter, Catch-ups, shown four ways. It is built out of the product's own things rather than written out as a document: a Round card, the four windows drawn to their real lengths, the holding state you get on the quiet day, one answer with a bird on it. Identical in all four stages, so what changes between them is only the container and the room it gives you."
      css={GUIDE_CSS}
    >
      <div className="gd-viewswitch">
        <Seg
          options={[
            { v: "desktop" as View, label: "Desktop" },
            { v: "phone" as View, label: "Phone" },
          ]}
          value={view}
          onChange={setView}
        />
        <span>
          Worth doing both. Two of these four are the same picture on a phone, which is
          most of where this will be read.
        </span>
      </div>

      <h2 className="gd-section">A. The page</h2>
      <p className="gd-lead">
        You leave. Catch-ups is gone and the chapter has the screen to itself. Coming back
        is the back button. It has a real address, so it can go in an email to everyone who
        has still not worked out what a Round is.
      </p>
      <StagePage key={`page-${view}`} view={view} />

      <h2 className="gd-section">B. The panel</h2>
      <p className="gd-lead">
        Nothing moves. The chapter slides in beside the page and the Catch-ups you were
        looking at is still there behind it. Read a line, close it, try the thing, open it
        again. It carries an address too: I said earlier that panels cannot be linked to
        and that was wrong, so it is shown here with the query in the bar. Two things to
        watch. The band of windows loses its proportions at this width. And on Phone this
        stage and the one above become the same photograph.
      </p>
      <StagePanel key={`panel-${view}`} view={view} />

      <h2 className="gd-section">C. One long document, jumped into</h2>
      <p className="gd-lead">
        You land in the middle of a single document that covers every area, with Letters
        and Collection greyed above you. One page to write, one page to keep true, and
        people who came for one answer can fall into the next section. It is also the
        only one of the four where the thing you asked about arrives surrounded by six
        things you did not.
      </p>
      <StageAnchored key={`anchored-${view}`} view={view} />

      <h2 className="gd-section">D. The page, over the page</h2>
      <p className="gd-lead">
        Stage A floating over the app you were using. Full reading column, not a narrow
        sheet. The address bar says /guide/catchups the whole time it is open, so the link
        works when somebody opens it cold from an email, and closing it puts you back
        exactly where you stood. Next 16 does this with intercepting routes, which is a
        real feature and not a trick, though it is a known-fiddly one next to this app&apos;s
        route groups.
      </p>
      <StageIntercept key={`intercept-${view}`} view={view} />

      <h2 className="gd-section">What I would pick</h2>
      <p className="gd-lead">
        D, and A is the same file so it comes free. Watch the band of four windows as you
        move between the stages: at page width you can see at a glance that answering is
        the long part and the quiet day is a sliver, which is the entire thing that band
        exists to teach. At 404px it is still legible and it has stopped being a picture.
        The answer card goes the same way. If the chapter is going to be made of things
        rather than paragraphs, it needs the width, and B is the only one of the four that
        never has it. B also cannot answer &quot;what even is a Catch-up&quot; asked from
        the feed, because there is no Catch-ups page to open the panel from. C is the
        cheapest to keep true and the easiest to let go dull.
      </p>
    </DelightShell>
  );
}

const GUIDE_CSS = `
/* ---- room chrome ---- */
.gd-viewswitch { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.gd-viewswitch span { font-size:12px; color:var(--ink-soft); max-width:52ch; line-height:1.5; }
.gd-section { font-family:var(--font-display),Georgia,serif; font-size:19px; font-weight:700;
  letter-spacing:-.02em; margin:50px 0 0; color:var(--ink); }
.gd-lead { font-size:13.5px; line-height:1.62; color:var(--ink-soft); max-width:74ch; margin:8px 0 16px; }
.gd-trigger { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:0 0 12px; }
.gd-trigger button { border:1px solid var(--border); background:var(--surface); color:var(--ink);
  border-radius:999px; padding:7px 16px; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;
  transition:transform .16s var(--ease-pop); }
.gd-trigger button:hover { transform:translateY(-1px); }
.gd-trigger button:active { transform:translateY(0); }
.gd-trigger span { font-size:11.5px; color:var(--ink-soft); }

/* ---- the browser frame ---- */
.gd-frame { border:1px solid var(--border); border-radius:14px; overflow:hidden;
  background:var(--surface); box-shadow:0 14px 34px -22px rgba(20,26,20,.5); }
.gd-desktop { width:100%; }
.gd-phone { width:390px; max-width:100%; margin:0 auto; }
.gd-chrome { display:flex; align-items:center; gap:12px; height:36px; padding:0 12px;
  background:var(--surface-2); border-bottom:1px solid var(--border); }
.gd-dots { display:flex; gap:5px; flex:none; }
.gd-dots i { width:8px; height:8px; border-radius:999px; background:var(--border); }
.gd-url { flex:1; min-width:0; background:var(--bg); border-radius:999px; padding:3px 12px;
  font-size:11.5px; color:var(--ink-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gd-url b { color:var(--ink); font-weight:700; }
.gd-viewport { position:relative; height:560px; overflow:hidden; background:var(--bg); }
.gd-phone .gd-viewport { height:620px; }

/* ---- the app behind ---- */
.gd-app { display:flex; height:100%; background:var(--bg); }
.gd-layer { position:relative; height:100%; }
.gd-layer .gd-app { position:absolute; inset:0; }
.gd-rail { width:172px; flex:none; background:var(--sidebar); color:var(--sidebar-muted);
  padding:16px 12px; display:flex; flex-direction:column; gap:2px; font-size:12.5px; }
.gd-rail span { padding:8px 10px; border-radius:9px; }
.gd-rail span.on { background:rgba(255,255,255,.13); color:var(--sidebar-ink); font-weight:600; }
.gd-mark { width:20px; height:20px; border-radius:7px; background:var(--sidebar-ink); opacity:.85;
  margin:2px 0 14px 10px; flex:none; }
.gd-mark.dark { background:var(--primary); opacity:1; margin:0; }
.gd-appmain { flex:1; min-width:0; padding:22px 24px; }
.gd-apphead { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.gd-apphead h2 { font-family:var(--font-display),Georgia,serif; font-size:26px; font-weight:400;
  letter-spacing:-.02em; margin:0; color:var(--ink); }
.gd-cta { background:var(--primary); color:var(--primary-ink); border-radius:999px;
  padding:8px 15px; font-size:12.5px; font-weight:600; flex:none; }
.gd-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card);
  padding:15px 16px; margin-bottom:11px; display:grid; gap:4px; }
.gd-card-k { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); }
.gd-card strong { font-family:var(--font-display),Georgia,serif; font-size:17px; font-weight:600; color:var(--ink); }
.gd-card-s { font-size:13px; color:var(--ink-soft); }

/* ---- the quiet document shell (what /privacy already looks like) ---- */
.gd-docshell { height:100%; overflow-y:auto; background:var(--bg); }
.gd-docshell > header { display:flex; align-items:center; gap:9px; padding:13px 22px;
  border-bottom:1px solid var(--border); font-family:var(--font-display),Georgia,serif;
  font-size:14px; color:var(--ink); }
.gd-docshell > main { max-width:640px; margin:0 auto; padding:34px 26px 44px; }
.gd-docshell.wide > main { max-width:none; padding:0; }
.gd-docshell > footer { display:flex; gap:16px; flex-wrap:wrap; padding:15px 24px;
  border-top:1px solid var(--border); font-size:12.5px; color:var(--ink-soft); }
.gd-docshell > footer .on { color:var(--ink); font-weight:600; }

/* ---- B: the side panel ---- */
.gd-scrim { position:absolute; inset:0; background:rgba(30,30,27,.36); opacity:0;
  pointer-events:none; transition:opacity .26s linear; }
.gd-scrim.on { opacity:1; pointer-events:auto; }
.gd-panel { position:absolute; top:0; right:0; bottom:0; width:404px; max-width:100%;
  background:var(--surface); border-left:1px solid var(--border);
  box-shadow:-16px 0 44px -28px rgba(20,26,20,.6);
  transform:translateX(100%); transition:transform .34s var(--ease-spring); }
.gd-panel.on { transform:translateX(0); }
.gd-panel-scroll { height:100%; overflow-y:auto; padding:0 24px 40px; }
.gd-phone .gd-sheet-bar { margin:0 -20px 4px; }
.gd-phone .gd-panel { width:100%; border-left:0; border-top:1px solid var(--border);
  border-radius:18px 18px 0 0; top:34px; transform:translateY(100%); }
.gd-phone .gd-panel.on { transform:translateY(0); }
.gd-phone .gd-panel-scroll { padding:0 20px 36px; }
.gd-sheet-bar { position:sticky; top:0; z-index:3; height:44px; margin:0 -24px 4px;
  background:var(--surface); display:flex; justify-content:flex-end;
  align-items:center; padding:0 13px; }
.gd-sheet-bar.over { background:var(--bg); margin:0 -36px 8px; }
.gd-x { width:30px; height:30px; border-radius:999px; border:1px solid var(--border);
  background:transparent; color:var(--ink-soft); font:inherit; font-size:17px;
  line-height:1; cursor:pointer; }

/* ---- D: the page over the page ---- */
.gd-over { position:absolute; inset:30px 0 0; margin:0 auto; max-width:680px;
  background:var(--bg); border:1px solid var(--border); border-radius:20px 20px 0 0;
  box-shadow:0 -12px 46px -20px rgba(20,26,20,.55);
  opacity:0; transform:translateY(18px); pointer-events:none;
  transition:transform .34s var(--ease-spring), opacity .2s linear; }
.gd-over.on { opacity:1; transform:translateY(0); pointer-events:auto; }
.gd-over-scroll { height:100%; overflow-y:auto; padding:0 36px 44px; }
.gd-phone .gd-over { inset:22px 0 0; border-radius:18px 18px 0 0; }
.gd-phone .gd-over-scroll { padding:0 20px 36px; }
.gd-phone .gd-sheet-bar.over { margin:0 -20px 8px; }

/* ---- C: the long document ---- */
.gd-anchored { display:flex; gap:32px; max-width:880px; margin:0 auto; padding:30px 26px 44px; }
.gd-toc { width:148px; flex:none; display:flex; flex-direction:column; gap:7px;
  font-size:12.5px; color:var(--ink-soft); }
.gd-toc .on { color:var(--primary); font-weight:700; }
.gd-anchored-body { flex:1; min-width:0; max-width:640px; }
.gd-above { opacity:.4; padding-bottom:24px; margin-bottom:28px; border-bottom:1px solid var(--border); }
.gd-above h1 { font-family:var(--font-display),Georgia,serif; font-size:26px; font-weight:700;
  letter-spacing:-.025em; margin:0 0 18px; color:var(--ink); }
.gd-above h2 { font-family:var(--font-display),Georgia,serif; font-size:17px; font-weight:700;
  margin:16px 0 0; color:var(--ink); }
.gd-above p { font-size:14px; line-height:1.6; margin:5px 0 0; color:var(--ink-soft); }

/* ---- the chapter itself. identical markup everywhere it lands. ---- */
.gd-doc { color:var(--ink); }
.gd-doc p { font-size:15px; line-height:1.65; margin:12px 0 0;
  color:color-mix(in srgb, var(--ink) 88%, transparent); }
.gd-doc .gd-quiet { color:var(--ink-soft); }
.gd-doc h1 { font-family:var(--font-display),Georgia,serif; font-size:36px; font-weight:700;
  line-height:1.08; letter-spacing:-.03em; margin:0; text-wrap:balance; }
.gd-doc h2 { font-family:var(--font-display),Georgia,serif; font-size:23px; font-weight:700;
  letter-spacing:-.02em; margin:0; }
.gd-doc h3 { font-family:var(--font-display),Georgia,serif; font-size:17px; font-weight:700;
  letter-spacing:-.02em; margin:0; }
.gd-foot { font-size:13px; color:var(--ink-soft); margin-top:15px; }

/* opening spread */
.gd-open { display:flex; gap:34px; align-items:flex-start; flex-wrap:wrap; }
.gd-open-words { flex:1 1 290px; min-width:0; }
.gd-open-words h1 + p { margin-top:17px; }
.gd-open-thing { flex:1 1 260px; min-width:0; }

.gd-spread { margin-top:46px; }
.gd-two { display:flex; gap:30px; align-items:center; flex-wrap:wrap; }
.gd-two > * { flex:1 1 250px; min-width:0; }
.gd-ends { display:flex; gap:30px; flex-wrap:wrap; }
.gd-ends > div { flex:1 1 230px; min-width:0; }

/* a Round, as it sits on the page */
.gd-round { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card);
  padding:16px 17px; display:grid; gap:5px; box-shadow:0 14px 32px -24px rgba(20,26,20,.65); }
.gd-round-k { font-size:10.5px; font-weight:700; text-transform:uppercase;
  letter-spacing:.1em; color:var(--primary); }
.gd-round strong { font-family:var(--font-display),Georgia,serif; font-size:18px; font-weight:600; }
.gd-round-s { font-size:13px; color:var(--ink-soft); }
.gd-round-faces { display:flex; align-items:center; margin-top:9px; }
.gd-round-faces > *:not(i) { margin-right:-7px; border-radius:999px;
  box-shadow:0 0 0 3px var(--surface); }
.gd-round-faces i { margin-left:19px; font-style:normal; font-size:12px; color:var(--ink-soft); }

/* the four windows, to scale */
.gd-band { margin-top:22px; }
.gd-band-track { display:flex; gap:4px; height:38px; }
.gd-seg { border-radius:8px; min-width:6px; }
.gd-seg-ask { background:color-mix(in srgb, var(--primary) 24%, var(--surface)); }
.gd-seg-answer { background:var(--primary); }
.gd-seg-quiet { background:color-mix(in srgb, var(--cinnamon) 13%, var(--surface));
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--cinnamon) 26%, transparent); }
.gd-seg-out { flex:0 0 10px; background:var(--cinnamon); }
.gd-band-list { list-style:none; margin:14px 0 0; padding:0;
  display:grid; grid-template-columns:repeat(auto-fit,minmax(126px,1fr)); gap:12px 18px; }
.gd-band-list li { display:grid; grid-template-columns:9px 1fr; gap:2px 10px; align-items:baseline; }
.gd-band-list b { font-size:13px; font-weight:700; }
.gd-band-list em { font-style:normal; font-weight:500; font-size:12px; color:var(--ink-soft); }
.gd-band-list span { font-size:12px; line-height:1.4; color:var(--ink-soft); }
.gd-dot { grid-row:span 2; width:9px; height:9px; border-radius:999px;
  align-self:start; margin-top:5px; }
.gd-dot-ask { background:color-mix(in srgb, var(--primary) 34%, var(--surface)); }
.gd-dot-answer { background:var(--primary); }
.gd-dot-quiet { background:color-mix(in srgb, var(--cinnamon) 30%, var(--surface));
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--cinnamon) 40%, transparent); }
.gd-dot-out { background:var(--cinnamon); }

/* the quiet day, as it really looks */
.gd-holding { background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); padding:22px 20px; display:grid; gap:10px;
  align-content:center; min-height:158px; }
.gd-shimmer { height:11px; border-radius:999px;
  background:color-mix(in srgb, var(--primary) 14%, var(--surface-2));
  animation:gdpulse 2.6s ease-in-out infinite; }
.gd-shimmer.short { width:58%; animation-delay:.35s; }
.gd-holding p { margin-top:10px; text-align:center; font-size:13px; color:var(--ink-soft);
  font-family:var(--font-display),Georgia,serif; }
@keyframes gdpulse { 0%,100% { opacity:.45; } 50% { opacity:1; } }

/* one answer from a published Round */
.gd-answer { margin-top:22px; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); overflow:hidden; }
.gd-answer-q { display:block; padding:12px 18px; background:var(--surface-2);
  border-bottom:1px solid var(--border); font-family:var(--font-display),Georgia,serif;
  font-size:14.5px; color:var(--ink); }
.gd-answer-body { display:flex; gap:13px; padding:16px 18px 18px; }
.gd-answer-who { display:block; font-size:13.5px; font-weight:700; }
.gd-answer-who i { margin-left:7px; font-style:normal; font-weight:500;
  font-size:12.5px; color:var(--ink-soft); }
.gd-answer-body p { margin-top:6px; font-size:14.5px; line-height:1.6; }

/* the chapter lands, and hands you back to the product */
.gd-close { margin-top:46px; padding-top:22px; border-top:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.gd-close > span { font-size:13.5px; color:var(--ink-soft); }
.gd-go { background:var(--primary); color:var(--primary-ink); text-decoration:none;
  border-radius:999px; padding:10px 20px; font-size:13.5px; font-weight:600;
  transition:transform .16s var(--ease-pop); }
.gd-go:hover { transform:translateY(-1px); }
.gd-go:active { transform:translateY(0); }
.delight.reduce .gd-go { transition:none; }

/* reduced motion: the two-tier contract. position still changes, it just stops travelling. */
.delight.reduce .gd-panel,
.delight.reduce .gd-over,
.delight.reduce .gd-scrim,
.delight.reduce .gd-trigger button { transition:none; }
.delight.reduce .gd-shimmer { animation:none; opacity:.7; }
`;
