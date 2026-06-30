"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Newspaper, ImageIcon } from "lucide-react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  FadeRise,
  Seg,
  SPRINGS,
  motion,
  PeaksMark,
} from "../_kit";
import { AnimatePresence } from "motion/react";

/* ---- shared mock data ---- */
// The real left rail: Feed, Directory, Letters, Catch-ups, Collection.
const NAV = ["Feed", "Directory", "Letters", "Catch-ups", "Collection"] as const;

type FeedV = "recent" | "popular" | "following";
// mutable (not `as const`) so it satisfies the kit Seg `options` array type
const FEED_VIEWS: { v: FeedV; label: string }[] = [
  { v: "recent", label: "Recent" },
  { v: "popular", label: "Popular" },
  { v: "following", label: "Following" },
];

const FEED_COPY: Record<FeedV, { title: string; body: string }> = {
  recent: { title: "Just now", body: "The newest notes from the valley, freshest first." },
  popular: { title: "Most loved", body: "What the years keep coming back to read again." },
  following: { title: "Your circle", body: "Only the people and groups you have chosen to follow." },
};

const TABS = [
  { v: "posts", label: "Posts" },
  { v: "about", label: "About" },
  { v: "photos", label: "Photos" },
] as const;
type TabV = (typeof TABS)[number]["v"];

const PANELS: Record<TabV, { title: string; body: string }> = {
  posts: { title: "Posts", body: "Notes from the valley, shared by the class of every year." },
  about: { title: "About", body: "A quiet place under the rocks, where the wind still carries old names." },
  photos: { title: "Photos", body: "Mornings on the study circle, the banyan, the long walk to assembly." },
};

// One shared spring for the traveling sidebar marker. Slightly underdamped so the
// pill settles with a hair of weight instead of snapping dead, but never wobbles.
const NAV_MARKER_SPRING = { type: "spring" as const, stiffness: 480, damping: 38, mass: 0.9 };

/* ================================================================== *
 * 1. Sliding sidebar marker (must-have)
 *    Two elements share a layoutId so the cinnamon edge bar AND the
 *    soft pill travel together to the newly selected row. The old
 *    marker glides, it never pops.
 * ================================================================== */
function SidebarMarkerDemo() {
  const [active, setActive] = useState<(typeof NAV)[number]>("Feed");
  return (
    <div className="dlt-shell">
      <nav className="dlt-sidebar" aria-label="Primary">
        <div className="dlt-sb-brand">
          <PeaksMark size={18} />
          <span>Rishi Valley</span>
        </div>
        {NAV.map((item) => {
          const on = item === active;
          return (
            <button
              key={item}
              type="button"
              aria-current={on ? "page" : undefined}
              className={`dlt-navrow${on ? " on" : ""}`}
              onClick={() => setActive(item)}
            >
              {on && (
                <>
                  {/* the soft pill and the cinnamon edge are two layoutId children;
                      both glide to the active row on the same spring */}
                  <motion.span layoutId="dltNavPill" className="dlt-navpill" transition={NAV_MARKER_SPRING} />
                  <motion.span layoutId="dltNavBar" className="dlt-navbar" transition={NAV_MARKER_SPRING} />
                </>
              )}
              <span className="dlt-navdot" aria-hidden />
              <span className="dlt-navlabel">{item}</span>
            </button>
          );
        })}
      </nav>
      <div className="dlt-pane dlt-pane-quiet">
        <p className="dlt-pane-kicker">Now viewing</p>
        {/* the heading cross-rises to underline that the marker drove a real change */}
        <div className="dlt-pane-titlewrap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={active}
              className="dlt-pane-title v2-display"
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={SPRINGS.gentle}
            >
              {active}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 2. Segmented control thumb (must-have)
 *    Feature the kit Seg thumb on its own. It slides via layoutId.
 *    Switching the feed sub-view cross-fades the panel beneath it.
 * ================================================================== */
function FeedSegDemo() {
  const [view, setView] = useState<FeedV>("recent");
  const copy = FEED_COPY[view];
  return (
    <div className="dlt-segdemo">
      <div className="dlt-segdemo-head">
        <Seg options={FEED_VIEWS} value={view} onChange={setView} />
      </div>
      <div className="dlt-segdemo-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="dlt-segpanel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <p className="dlt-segpanel-title v2-display">{copy.title}</p>
            <p className="dlt-body-sm">{copy.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 2b. Profile-tab underline that stretches between tabs (kept; the
 *     underline is a second, smaller layoutId study to complement the
 *     seg thumb without crowding it).
 * ================================================================== */
function TabUnderlineDemo() {
  const [tab, setTab] = useState<TabV>("posts");
  const panel = PANELS[tab];
  return (
    <div className="dlt-tabsdemo">
      <div className="dlt-tabrow">
        {TABS.map((t) => {
          const on = t.v === tab;
          return (
            <button key={t.v} type="button" className={`dlt-tab${on ? " on" : ""}`} onClick={() => setTab(t.v)}>
              {t.label}
              {on && <motion.span layoutId="dltTabUnderline" className="dlt-tabline" transition={SPRINGS.snappy} />}
            </button>
          );
        })}
      </div>
      <div className="dlt-tabbody">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <p className="dlt-body-sm">{panel.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 3. Content cross-fade + size (must-have)
 *    Switching views: the outgoing panel fades and eases DOWN in scale
 *    a touch; the incoming panel rises a few pixels and scales UP into
 *    place. Quick and clean, one panel at a time (mode="wait").
 * ================================================================== */
function CrossFadeDemo() {
  const [view, setView] = useState<TabV>("posts");
  const panel = PANELS[view];
  return (
    <div className="dlt-crossfade">
      <div className="dlt-viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="dlt-viewcard"
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <p className="dlt-view-title v2-display">{panel.title}</p>
            <p className="dlt-body-sm">{panel.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="dlt-switchrow">
        {TABS.map((t) => (
          <button
            key={t.v}
            type="button"
            className={`v2-chip${t.v === view ? " on" : ""}`}
            onClick={() => setView(t.v)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== *
 * 4. Letters vs feed entrance (KEEP as is per owner)
 * ================================================================== */
function LettersVsFeedDemo() {
  const [key, setKey] = useState(0);
  return (
    <div className="dlt-vs">
      <div className="dlt-vs-pair" key={key}>
        {/* Letters: tipped top edge that settles, title a beat later */}
        <div className="dlt-vs-col">
          <div className="dlt-vs-tag">Letters</div>
          <motion.div
            className="dlt-letter"
            initial={{ rotateX: 4, opacity: 0.5 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={SPRINGS.settle}
          >
            <motion.p
              className="dlt-letter-title v2-display"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRINGS.gentle, delay: 0.22 }}
            >
              A letter home
            </motion.p>
            <span className="dlt-letter-line" />
            <span className="dlt-letter-line short" />
          </motion.div>
        </div>
        {/* Feed: plain FadeRise */}
        <div className="dlt-vs-col">
          <div className="dlt-vs-tag">Feed</div>
          <FadeRise>
            <div className="dlt-feedcard">
              <p className="dlt-body-sm">A quick note from the field.</p>
              <span className="dlt-letter-line" />
            </div>
          </FadeRise>
        </div>
      </div>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setKey((k) => k + 1)}>
        Open both
      </SpringPress>
    </div>
  );
}

/* ================================================================== *
 * 5. Landing coordinated load (must-have)
 *    Bad way: hero text paints instantly, then the image "loads" late
 *    and pops in by itself (jarring). Good way: hold the whole hero
 *    until the image is ready, then reveal text and image together as
 *    one intentional unit.
 *
 *    "Loading" is mocked with a timer kicked off by Replay. Both lanes
 *    start blank, then play their own choreography. SSR-safe: the
 *    static markup carries no entrance state; everything is gated on a
 *    client-only `phase` set inside useEffect.
 * ================================================================== */
type LoadPhase = "idle" | "loading" | "ready";

function CoordinatedLoadDemo() {
  const [phase, setPhase] = useState<LoadPhase>("idle");
  // the bad lane reveals text the instant we start, then the image arrives late.
  // the good lane keeps both hidden until the image is ready, then reveals as one.
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const replay = () => {
    clear();
    setPhase("loading");
    // image becomes "ready" after a beat (mock network)
    timers.current.push(window.setTimeout(() => setPhase("ready"), 850));
  };

  useEffect(() => () => clear(), []);

  // bad lane: text is shown as soon as loading begins; image waits for ready.
  const badTextReady = phase !== "idle";
  const badImgReady = phase === "ready";
  // good lane: nothing until ready, then everything together.
  const goodReady = phase === "ready";

  return (
    <div className="dlt-load">
      <div className="dlt-load-lanes">
        <div className="dlt-load-lane">
          <div className="dlt-load-tag bad">Text first, image pops</div>
          <div className="dlt-load-frame">
            <div className="dlt-hero bad">
              <div className="dlt-hero-text">
                <motion.p
                  className="dlt-hero-h v2-display"
                  initial={false}
                  animate={{ opacity: badTextReady ? 1 : 0, y: badTextReady ? 0 : 10 }}
                  transition={SPRINGS.gentle}
                >
                  Find your year.
                </motion.p>
                <motion.span
                  className="dlt-hero-sub"
                  initial={false}
                  animate={{ opacity: badTextReady ? 1 : 0, y: badTextReady ? 0 : 8 }}
                  transition={SPRINGS.gentle}
                />
              </div>
              <div className="dlt-hero-img">
                {phase === "loading" && <span className="dlt-hero-spin" aria-hidden />}
                <motion.div
                  className="dlt-hero-fill"
                  initial={false}
                  animate={{ opacity: badImgReady ? 1 : 0, scale: badImgReady ? 1 : 0.86 }}
                  transition={badImgReady ? { duration: 0.24, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.1 }}
                >
                  <ImageIcon size={18} strokeWidth={1.6} />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        <div className="dlt-load-lane">
          <div className="dlt-load-tag good">Hold, then reveal as one</div>
          <div className="dlt-load-frame">
            {phase === "loading" && (
              <div className="dlt-load-hold">
                <span className="dlt-hero-spin" aria-hidden />
              </div>
            )}
            <motion.div
              className="dlt-hero good"
              initial={false}
              // the whole hero reveals together: one transform, one fade
              animate={{ opacity: goodReady ? 1 : 0, y: goodReady ? 0 : 12 }}
              transition={{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="dlt-hero-text">
                <p className="dlt-hero-h v2-display">Find your year.</p>
                <span className="dlt-hero-sub" />
              </div>
              <div className="dlt-hero-img">
                <div className="dlt-hero-fill solid">
                  <ImageIcon size={18} strokeWidth={1.6} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={replay}>
        {phase === "idle" ? "Load the page" : "Replay load"}
      </SpringPress>
    </div>
  );
}

/* ================================================================== *
 * 6. Landing to login, one held logo (must-have, owner loved the bounce)
 *    The backdrop and the logo STAY PUT. The hero copy slides off to
 *    the left while the login card slides in from the right, on the
 *    gentle (slightly underdamped) spring so it lands with a small
 *    bounce. It should read as the same page, logo anchored.
 * ================================================================== */
function LateralPassDemo() {
  const [onLogin, setOnLogin] = useState(false);
  return (
    <div className="dlt-pass">
      <div className="dlt-pass-scene">
        {/* held backdrop + logo: never animated, anchors the illusion */}
        <div className="dlt-pass-bg" />
        <div className="dlt-pass-logo">
          <PeaksMark size={30} />
          <span className="dlt-pass-logo-word">Rishi Valley</span>
        </div>

        {/* hero copy slides left out */}
        <motion.div
          className="dlt-pass-hero"
          initial={false}
          animate={onLogin ? { x: "-58%", opacity: 0 } : { x: "0%", opacity: 1 }}
          transition={SPRINGS.gentle}
          style={{ pointerEvents: onLogin ? "none" : "auto" }}
        >
          <p className="dlt-pass-h v2-display">Find your year.</p>
          <p className="dlt-body-sm">The valley keeps a place for everyone.</p>
        </motion.div>

        {/* login card slides in from right, lands with the gentle-spring bounce */}
        <motion.div
          className="dlt-pass-login"
          initial={false}
          animate={onLogin ? { x: "0%", opacity: 1 } : { x: "62%", opacity: 0 }}
          transition={SPRINGS.gentle}
          style={{ pointerEvents: onLogin ? "auto" : "none" }}
        >
          <p className="dlt-pass-h sm v2-display">Welcome back</p>
          <div className="v2-input dlt-fakefield">you@rishivalley.in</div>
          <div className="v2-btn v2-btn-primary sm dlt-fakebtn">Sign in</div>
        </motion.div>
      </div>
      <div className="dlt-pass-controls">
        {onLogin ? (
          <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setOnLogin(false)}>
            <ArrowLeft size={15} /> Back to landing
          </SpringPress>
        ) : (
          <SpringPress className="v2-btn v2-btn-primary sm" onClick={() => setOnLogin(true)}>
            Sign in
          </SpringPress>
        )}
        <span className="dlt-pass-hint">The backdrop and logo stay put. Only the panels pass.</span>
      </div>
    </div>
  );
}

/* ================================================================== */
export default function Page() {
  return (
    <DelightShell
      title="Navigation & transitions"
      lede="How the valley moves between places. The sidebar marker glides, the seg thumb slides, panels cross-fade, and a held logo carries you from the landing into login."
      css={CSS}
    >
      <DemoGrid>
        <DemoCard
          title="Sliding sidebar marker"
          note="The active pill and its cinnamon edge glide together to the row you pick. They travel, they never pop. Click any row."
          span={1}
        >
          <SidebarMarkerDemo />
        </DemoCard>

        <DemoCard
          title="Segmented control thumb"
          note="The kit seg thumb slides between feed sub-views on a shared layoutId, and the panel beneath cross-fades. Tap Recent, Popular, Following."
          span={1}
        >
          <FeedSegDemo />
        </DemoCard>

        <DemoCard
          title="Content cross-fade and size"
          note="The frame holds still. The old panel fades and eases down a hair; the new one rises and scales up into place. Tap the chips."
          span={1}
        >
          <CrossFadeDemo />
        </DemoCard>

        <DemoCard
          title="Profile tab underline"
          note="A companion to the seg thumb: the underline stretches from tab to tab on the same spring while the body cross-fades."
          span={1}
        >
          <TabUnderlineDemo />
        </DemoCard>

        <DemoCard
          title="Letters vs feed entrance"
          note="A Letter tips its top edge and the title arrives a beat later; the feed simply rises. Two distinct entrances, kept as is."
          span={1}
        >
          <LettersVsFeedDemo />
        </DemoCard>

        <DemoCard
          title="Background stays static"
          note="The valley photo behind the app does not move. Parallax was tried and dropped; nothing invisible ships here."
          span={1}
        >
          <StaticBackgroundNote />
        </DemoCard>

        <DemoCard
          title="Coordinated landing load"
          note="Left: text paints first, then the image pops in late. Right: hold until the image is ready, then reveal hero and image together. Hit Load."
          span={3}
        >
          <CoordinatedLoadDemo />
        </DemoCard>

        <DemoCard
          title="Landing to login, one held logo"
          note="One backdrop, one logo held in place. The hero slides left out, the login card slides in from the right and lands with a small bounce."
          span={3}
        >
          <LateralPassDemo />
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}

/* tiny labeled note that replaces the removed parallax demo */
function StaticBackgroundNote() {
  return (
    <div className="dlt-staticnote">
      <div className="dlt-staticnote-photo" aria-hidden>
        <Newspaper size={22} strokeWidth={1.5} />
      </div>
      <p className="dlt-staticnote-title v2-display">No parallax</p>
      <p className="dlt-body-sm dlt-staticnote-body">
        In the app the background is a single still photograph of the valley. A drifting parallax was hard
        to notice and never earned its keep, so it was removed rather than shipped invisible.
      </p>
    </div>
  );
}

const CSS = `
/* ---- shared small bits ---- */
.delight .dlt-body-sm { font-size:12.5px; color:var(--ink-soft); line-height:1.5; margin:0; }

/* 1. sidebar marker ------------------------------------------------ */
.delight .dlt-shell { display:flex; width:100%; height:218px; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:var(--surface-2); }
.delight .dlt-sidebar { width:140px; flex:0 0 auto; background:var(--sidebar); padding:12px 8px; display:flex; flex-direction:column; gap:2px; }
.delight .dlt-sb-brand { display:flex; align-items:center; gap:6px; color:var(--sidebar-ink); font-size:11px; font-weight:700; padding:2px 8px 10px; }
.delight .dlt-navrow { position:relative; display:flex; align-items:center; gap:9px; height:30px; padding:0 10px; border:0; background:transparent; cursor:pointer; font:inherit; font-size:12.5px; font-weight:600; color:var(--sidebar-muted); border-radius:8px; text-align:left; }
.delight .dlt-navrow:hover:not(.on) { color:color-mix(in srgb, var(--sidebar-ink) 70%, var(--sidebar-muted)); }
.delight .dlt-navrow.on { color:var(--sidebar-ink); }
.delight .dlt-navpill { position:absolute; inset:0; border-radius:8px; background:color-mix(in srgb, var(--sidebar-ink) 14%, transparent); z-index:0; }
.delight .dlt-navbar { position:absolute; left:-8px; top:6px; bottom:6px; width:3px; border-radius:3px; background:var(--cinnamon); z-index:1; }
.delight .dlt-navdot { position:relative; z-index:2; width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.55; flex:0 0 auto; }
.delight .dlt-navrow.on .dlt-navdot { opacity:.9; }
.delight .dlt-navlabel { position:relative; z-index:2; }
.delight .dlt-pane { flex:1; padding:18px; display:flex; flex-direction:column; justify-content:center; }
.delight .dlt-pane-quiet { background:var(--surface); }
.delight .dlt-pane-kicker { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 4px; }
.delight .dlt-pane-titlewrap { position:relative; height:30px; }
.delight .dlt-pane-title { position:absolute; left:0; top:0; font-size:26px; margin:0; line-height:1.05; }

/* 2. seg thumb demo ------------------------------------------------ */
.delight .dlt-segdemo { width:100%; display:flex; flex-direction:column; gap:14px; align-items:center; }
.delight .dlt-segdemo-head { display:flex; justify-content:center; }
.delight .dlt-segdemo .dl-seg { transform:scale(1.06); transform-origin:center; }
.delight .dlt-segdemo-body { position:relative; width:100%; min-height:64px; }
.delight .dlt-segpanel { position:absolute; inset:0; display:flex; flex-direction:column; gap:5px; align-items:center; text-align:center; justify-content:center; }
.delight .dlt-segpanel-title { font-size:19px; margin:0; }

/* 2b. profile tabs -------------------------------------------------- */
.delight .dlt-tabsdemo { width:100%; display:flex; flex-direction:column; gap:14px; }
.delight .dlt-tabrow { display:flex; gap:18px; border-bottom:1px solid var(--border); }
.delight .dlt-tab { position:relative; border:0; background:transparent; cursor:pointer; font:inherit; font-size:13px; font-weight:600; color:var(--ink-soft); padding:0 0 9px; }
.delight .dlt-tab.on { color:var(--ink); }
.delight .dlt-tabline { position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px; background:var(--primary); }
.delight .dlt-tabbody { min-height:38px; }

/* 3. cross-fade ---------------------------------------------------- */
.delight .dlt-crossfade { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-viewport { position:relative; height:96px; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); overflow:hidden; }
.delight .dlt-viewcard { position:absolute; inset:0; padding:14px 16px; display:flex; flex-direction:column; gap:5px; justify-content:center; transform-origin:center; }
.delight .dlt-view-title { font-size:18px; margin:0; }
.delight .dlt-switchrow { display:flex; gap:6px; }
.delight .v2-chip.on { background:color-mix(in srgb, var(--primary) 12%, var(--surface)); color:var(--primary); }

/* 4. letters vs feed ----------------------------------------------- */
.delight .dlt-vs { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-vs-pair { display:grid; grid-template-columns:1fr 1fr; gap:12px; perspective:700px; }
.delight .dlt-vs-col { display:flex; flex-direction:column; gap:7px; }
.delight .dlt-vs-tag { font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-soft); }
.delight .dlt-letter { transform-origin:top center; background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:13px 14px; display:flex; flex-direction:column; gap:8px; box-shadow:0 10px 22px -18px rgba(0,0,0,.5); }
.delight .dlt-letter-title { font-size:16px; margin:0; }
.delight .dlt-letter-line { height:7px; border-radius:4px; background:color-mix(in srgb, var(--ink-soft) 22%, transparent); }
.delight .dlt-letter-line.short { width:62%; }
.delight .dlt-feedcard { background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:13px 14px; display:flex; flex-direction:column; gap:8px; }

/* 5. coordinated load --------------------------------------------- */
.delight .dlt-load { width:100%; display:flex; flex-direction:column; gap:14px; align-items:flex-start; }
.delight .dlt-load-lanes { display:grid; grid-template-columns:1fr 1fr; gap:14px; width:100%; }
.delight .dlt-load-lane { display:flex; flex-direction:column; gap:8px; }
.delight .dlt-load-tag { font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; }
.delight .dlt-load-tag::before { content:""; width:7px; height:7px; border-radius:50%; }
.delight .dlt-load-tag.bad { color:var(--cinnamon); }
.delight .dlt-load-tag.bad::before { background:var(--cinnamon); }
.delight .dlt-load-tag.good { color:var(--primary); }
.delight .dlt-load-tag.good::before { background:var(--primary); }
.delight .dlt-load-frame { position:relative; height:128px; border:1px solid var(--border); border-radius:14px; background:var(--surface-2); overflow:hidden; }
.delight .dlt-hero { position:absolute; inset:0; display:grid; grid-template-columns:1fr 84px; gap:12px; padding:16px; align-items:center; }
.delight .dlt-hero-text { display:flex; flex-direction:column; gap:9px; min-width:0; }
.delight .dlt-hero-h { font-size:17px; margin:0; line-height:1.1; color:var(--ink); }
.delight .dlt-hero-sub { height:8px; width:78%; border-radius:4px; background:color-mix(in srgb, var(--ink-soft) 24%, transparent); display:block; }
.delight .dlt-hero-img { width:84px; height:84px; border-radius:12px; background:color-mix(in srgb, var(--ink-soft) 12%, var(--surface)); border:1px solid var(--border); position:relative; display:grid; place-items:center; overflow:hidden; }
.delight .dlt-hero-fill { position:absolute; inset:0; display:grid; place-items:center; color:var(--primary-ink); background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 88%, var(--blue)), color-mix(in srgb, var(--blue) 70%, var(--primary))); transform-origin:center; }
.delight .dlt-hero-fill.solid { opacity:1; }
.delight .dlt-load-hold { position:absolute; inset:0; display:grid; place-items:center; z-index:2; }
.delight .dlt-hero-spin { width:20px; height:20px; border-radius:50%; border:2px solid color-mix(in srgb, var(--ink-soft) 30%, transparent); border-top-color:var(--primary); animation:dltspin .7s linear infinite; }
.delight .dlt-hero-img .dlt-hero-spin { position:absolute; z-index:1; }
@keyframes dltspin { to { transform:rotate(360deg); } }
.delight.reduce .dlt-hero-spin { animation:none !important; border-top-color:color-mix(in srgb, var(--ink-soft) 30%, transparent); }

/* 6. lateral pass -------------------------------------------------- */
.delight .dlt-pass { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-pass-scene { position:relative; height:188px; border:1px solid var(--border); border-radius:16px; overflow:hidden; }
.delight .dlt-pass-bg { position:absolute; inset:0; background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, var(--surface)), var(--surface) 55%, color-mix(in srgb, var(--blue) 16%, var(--surface))); }
.delight .dlt-pass-logo { position:absolute; top:14px; left:18px; z-index:3; display:flex; align-items:center; gap:8px; color:var(--primary); }
.delight .dlt-pass-logo-word { font-size:13px; font-weight:700; color:var(--ink); }
.delight .dlt-pass-hero { position:absolute; left:18px; right:18px; top:64px; z-index:2; display:flex; flex-direction:column; gap:6px; }
.delight .dlt-pass-h { font-size:24px; margin:0; line-height:1.05; }
.delight .dlt-pass-h.sm { font-size:18px; }
.delight .dlt-pass-login { position:absolute; right:18px; top:52px; width:min(280px, 64%); z-index:2; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:9px; box-shadow:0 18px 40px -26px rgba(0,0,0,.6); }
.delight .dlt-fakefield { display:flex; align-items:center; color:var(--ink-soft); }
.delight .dlt-fakebtn { width:100%; }
.delight .dlt-pass-controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.delight .dlt-pass-hint { font-size:11.5px; color:var(--ink-soft); }

/* static background note (replaces parallax) ----------------------- */
.delight .dlt-staticnote { width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:6px 8px; }
.delight .dlt-staticnote-photo { width:54px; height:54px; border-radius:14px; display:grid; place-items:center; color:var(--ink-soft); background:var(--surface-2); border:1px solid var(--border); margin-bottom:2px; }
.delight .dlt-staticnote-title { font-size:18px; margin:0; }
.delight .dlt-staticnote-body { max-width:32ch; }

@media (max-width:640px){
  .delight .dlt-shell { height:auto; min-height:218px; }
  .delight .dlt-vs-pair { grid-template-columns:1fr; }
  .delight .dlt-load-lanes { grid-template-columns:1fr; }
}
`;
