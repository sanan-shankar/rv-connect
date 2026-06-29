"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  FadeRise,
  Stagger,
  staggerChild,
  Seg,
  SPRINGS,
  useValleyMotion,
  motion,
  PeaksMark,
} from "../_kit";
import { AnimatePresence } from "motion/react";

/* ---- shared mock data ---- */
const NAV = ["Feed", "Directory", "Groups", "Letters", "Events"];
const TABS = [
  { v: "posts", label: "Posts" },
  { v: "about", label: "About" },
  { v: "photos", label: "Photos" },
] as const;
type TabV = (typeof TABS)[number]["v"];

const PANELS: Record<string, { title: string; body: string }> = {
  posts: { title: "Posts", body: "Notes from the valley, shared by the class of every year." },
  about: { title: "About", body: "A quiet place under the rocks, where the wind still carries old names." },
  photos: { title: "Photos", body: "Mornings on the study circle, the banyan, the long walk to assembly." },
};

const NAV_PILL_SPRING = { type: "spring" as const, stiffness: 520, damping: 42 };

/* ================================================================== *
 * 1. Sliding sidebar marker
 * ================================================================== */
function SidebarMarkerDemo() {
  const [active, setActive] = useState("Feed");
  return (
    <div className="dlt-shell">
      <nav className="dlt-sidebar">
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
              className={`dlt-navrow${on ? " on" : ""}`}
              onClick={() => setActive(item)}
            >
              {on && (
                <>
                  <motion.span layoutId="dltNavBar" className="dlt-navbar" transition={NAV_PILL_SPRING} />
                  <motion.span layoutId="dltNavPill" className="dlt-navpill" transition={NAV_PILL_SPRING} />
                </>
              )}
              <span className="dlt-navlabel">{item}</span>
            </button>
          );
        })}
      </nav>
      <div className="dlt-pane dlt-pane-quiet">
        <p className="dlt-pane-kicker">Now viewing</p>
        <p className="dlt-pane-title v2-display">{active}</p>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 2. Seg thumb + profile-tab underline (with crossfade body)
 * ================================================================== */
function TabsUnderlineDemo() {
  const [seg, setSeg] = useState<"recent" | "popular">("recent");
  const [tab, setTab] = useState<TabV>("posts");
  const panel = PANELS[tab];
  return (
    <div className="dlt-tabsdemo">
      <Seg
        options={[
          { v: "recent", label: "Recent" },
          { v: "popular", label: "Popular" },
        ]}
        value={seg}
        onChange={setSeg}
      />
      <div className="dlt-tabrow">
        {TABS.map((t) => {
          const on = t.v === tab;
          return (
            <button key={t.v} type="button" className={`dlt-tab${on ? " on" : ""}`} onClick={() => setTab(t.v)}>
              {t.label}
              {on && (
                <motion.span layoutId="dltTabUnderline" className="dlt-tabline" transition={SPRINGS.snappy} />
              )}
            </button>
          );
        })}
      </div>
      <div className="dlt-tabbody">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <p className="dlt-body-sm">{panel.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 3. Content cross-rise on view change
 * ================================================================== */
function CrossRiseDemo() {
  const [view, setView] = useState<TabV>("posts");
  const panel = PANELS[view];
  return (
    <div className="dlt-crossrise">
      <div className="dlt-viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="dlt-viewcard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRINGS.gentle}
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
 * 4. Valley wash + faint parallax + one-shot dip
 * ================================================================== */
function ValleyWashDemo() {
  const { reduced } = useValleyMotion();
  const [dipKey, setDipKey] = useState(0);
  return (
    <div className="dlt-wash">
      <motion.div
        className="dlt-wash-back parallax"
        animate={reduced ? {} : { y: [0, -6, 0], opacity: [0.11, 0.13, 0.11] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={dipKey}
          className="dlt-wash-front ambient"
          initial={{ opacity: 0.11 }}
          animate={{ opacity: [0.11, 0.09, 0.11, 1] }}
          transition={{ duration: 0.5, times: [0, 0.25, 0.5, 1], ease: "easeInOut" }}
        >
          <p className="dlt-wash-kicker">The Valley Collection</p>
          <p className="dlt-body-sm">Photographs gathered slowly, page after page.</p>
        </motion.div>
      </AnimatePresence>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setDipKey((k) => k + 1)}>
        Turn between pages
      </SpringPress>
    </div>
  );
}

/* ================================================================== *
 * 5. Page-load choreography (replay)
 * ================================================================== */
function ChoreoDemo() {
  const [key, setKey] = useState(0);
  return (
    <div className="dlt-choreo">
      <Stagger key={key} className="dlt-choreo-grid" gap={0.08}>
        <motion.div variants={staggerChild} className="dlt-choreo-sidebar">
          <span /><span /><span /><span />
        </motion.div>
        <motion.div variants={staggerChild} className="dlt-choreo-composer">Share something</motion.div>
        <motion.div variants={staggerChild} className="dlt-choreo-post" />
        <motion.div variants={staggerChild} className="dlt-choreo-post short" />
        <motion.div variants={staggerChild} className="dlt-choreo-rail">
          <span /><span />
        </motion.div>
      </Stagger>
      <SpringPress className="v2-btn v2-btn-ghost sm" onClick={() => setKey((k) => k + 1)}>
        Replay page load
      </SpringPress>
    </div>
  );
}

/* ================================================================== *
 * 6. Letters turned-page vs plain feed entrance
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
 * 7. Faked landing-to-login lateral pass
 * ================================================================== */
function LateralPassDemo() {
  const [onLogin, setOnLogin] = useState(false);
  return (
    <div className="dlt-pass">
      <div className="dlt-pass-scene">
        {/* held backdrop + logo */}
        <div className="dlt-pass-bg" />
        <div className="dlt-pass-logo">
          <PeaksMark size={30} />
        </div>

        {/* hero copy slides left out */}
        <motion.div
          className="dlt-pass-hero"
          animate={onLogin ? { x: "-58%", opacity: 0 } : { x: "0%", opacity: 1 }}
          transition={SPRINGS.gentle}
        >
          <p className="dlt-pass-h v2-display">Find your year.</p>
          <p className="dlt-body-sm">The valley keeps a place for everyone.</p>
        </motion.div>

        {/* login card slides in from right */}
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
            <ArrowLeft size={15} /> Back
          </SpringPress>
        ) : (
          <SpringPress className="v2-btn v2-btn-primary sm" onClick={() => setOnLogin(true)}>
            Sign in
          </SpringPress>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
export default function Page() {
  return (
    <DelightShell
      title="Navigation & transitions"
      lede="How the valley moves between places. Markers glide, panels cross-rise, and a held logo carries you from the landing into login."
      css={CSS}
    >
      <DemoGrid>
        <DemoCard
          title="Sliding sidebar marker"
          note="The active pill glides between rows, a cinnamon edge tracking it. Click any row."
          span={1}
        >
          <SidebarMarkerDemo />
        </DemoCard>

        <DemoCard
          title="Seg thumb + tab underline"
          note="A sliding seg thumb, a stretching tab underline, and a crossfade beneath. Tap tabs."
          span={1}
        >
          <TabsUnderlineDemo />
        </DemoCard>

        <DemoCard
          title="Content cross-rise"
          note="The frame holds still while the old panel fades and the new one rises eight pixels."
          span={1}
        >
          <CrossRiseDemo />
        </DemoCard>

        <DemoCard
          title="Valley wash + faint parallax"
          note="A banyan back-layer drifts; turning a page dips the front a touch and settles."
          span={1}
        >
          <ValleyWashDemo />
        </DemoCard>

        <DemoCard
          title="Page-load choreography"
          note="Replay the first paint: sidebar settles, then composer, posts, and the rail rise once."
          span={1}
        >
          <ChoreoDemo />
        </DemoCard>

        <DemoCard
          title="Letters vs feed entrance"
          note="A Letter tips its top edge and the title arrives a beat later; the feed simply rises."
          span={1}
        >
          <LettersVsFeedDemo />
        </DemoCard>

        <DemoCard
          title="Landing to login, one held logo"
          note="One backdrop, one logo held in place. The hero slides left, the login card slides in."
          span={3}
        >
          <LateralPassDemo />
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}

const CSS = `
/* ---- shared small bits ---- */
.delight .dlt-body-sm { font-size:12.5px; color:var(--ink-soft); line-height:1.5; margin:0; }

/* 1. sidebar marker ------------------------------------------------ */
.delight .dlt-shell { display:flex; width:100%; height:206px; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:var(--surface-2); }
.delight .dlt-sidebar { width:128px; flex:0 0 auto; background:var(--sidebar); padding:12px 8px; display:flex; flex-direction:column; gap:2px; }
.delight .dlt-sb-brand { display:flex; align-items:center; gap:6px; color:var(--sidebar-ink); font-size:11px; font-weight:700; padding:2px 8px 10px; }
.delight .dlt-navrow { position:relative; display:flex; align-items:center; height:30px; padding:0 10px; border:0; background:transparent; cursor:pointer; font:inherit; font-size:12.5px; font-weight:600; color:var(--sidebar-muted); border-radius:8px; text-align:left; }
.delight .dlt-navrow.on { color:var(--sidebar-ink); }
.delight .dlt-navpill { position:absolute; inset:0; border-radius:8px; background:color-mix(in srgb, var(--sidebar-ink) 14%, transparent); z-index:0; }
.delight .dlt-navbar { position:absolute; left:-8px; top:6px; bottom:6px; width:3px; border-radius:3px; background:var(--cinnamon); z-index:1; }
.delight .dlt-navlabel { position:relative; z-index:2; }
.delight .dlt-pane { flex:1; padding:18px; display:flex; flex-direction:column; justify-content:center; }
.delight .dlt-pane-quiet { background:var(--surface); }
.delight .dlt-pane-kicker { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 2px; }
.delight .dlt-pane-title { font-size:26px; margin:0; line-height:1.05; }

/* 2. tabs ---------------------------------------------------------- */
.delight .dlt-tabsdemo { width:100%; display:flex; flex-direction:column; gap:14px; }
.delight .dlt-tabrow { display:flex; gap:18px; border-bottom:1px solid var(--border); }
.delight .dlt-tab { position:relative; border:0; background:transparent; cursor:pointer; font:inherit; font-size:13px; font-weight:600; color:var(--ink-soft); padding:0 0 9px; }
.delight .dlt-tab.on { color:var(--ink); }
.delight .dlt-tabline { position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px; background:var(--primary); }
.delight .dlt-tabbody { min-height:38px; }

/* 3. cross-rise ---------------------------------------------------- */
.delight .dlt-crossrise { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-viewport { position:relative; height:96px; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); overflow:hidden; }
.delight .dlt-viewcard { position:absolute; inset:0; padding:14px 16px; display:flex; flex-direction:column; gap:5px; justify-content:center; }
.delight .dlt-view-title { font-size:18px; margin:0; }
.delight .dlt-switchrow { display:flex; gap:6px; }
.delight .v2-chip.on { background:color-mix(in srgb, var(--primary) 12%, var(--surface)); color:var(--primary); }

/* 4. valley wash --------------------------------------------------- */
.delight .dlt-wash { position:relative; width:100%; height:170px; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:var(--surface); display:flex; flex-direction:column; justify-content:flex-end; padding:14px; gap:10px; }
.delight .dlt-wash-back { position:absolute; inset:-10% -5%; background:radial-gradient(120px 90px at 30% 30%, color-mix(in srgb, var(--primary) 70%, transparent), transparent 70%), radial-gradient(150px 110px at 75% 60%, color-mix(in srgb, var(--cinnamon) 60%, transparent), transparent 72%); pointer-events:none; }
.delight .dlt-wash-front { position:relative; z-index:1; }
.delight .dlt-wash-kicker { font-size:13px; font-weight:700; margin:0 0 3px; color:var(--ink); }
.delight .dlt-wash .v2-btn { position:relative; z-index:1; align-self:flex-start; }

/* 5. choreography -------------------------------------------------- */
.delight .dlt-choreo { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-choreo-grid { display:grid; grid-template-columns:46px 1fr 54px; grid-template-rows:auto auto auto; gap:8px; }
.delight .dlt-choreo-sidebar { grid-row:1 / span 3; background:var(--sidebar); border-radius:10px; padding:9px 7px; display:flex; flex-direction:column; gap:6px; }
.delight .dlt-choreo-sidebar span { height:8px; border-radius:3px; background:color-mix(in srgb, var(--sidebar-ink) 22%, transparent); }
.delight .dlt-choreo-composer { background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; font-size:12px; color:var(--ink-soft); font-weight:600; }
.delight .dlt-choreo-post { background:var(--surface-2); border:1px solid var(--border); border-radius:10px; height:30px; }
.delight .dlt-choreo-post.short { height:24px; }
.delight .dlt-choreo-rail { grid-row:1 / span 3; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:9px 7px; display:flex; flex-direction:column; gap:6px; }
.delight .dlt-choreo-rail span { height:14px; border-radius:5px; background:color-mix(in srgb, var(--primary) 14%, transparent); }

/* 6. letters vs feed ----------------------------------------------- */
.delight .dlt-vs { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-vs-pair { display:grid; grid-template-columns:1fr 1fr; gap:12px; perspective:700px; }
.delight .dlt-vs-col { display:flex; flex-direction:column; gap:7px; }
.delight .dlt-vs-tag { font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-soft); }
.delight .dlt-letter { transform-origin:top center; background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:13px 14px; display:flex; flex-direction:column; gap:8px; box-shadow:0 10px 22px -18px rgba(0,0,0,.5); }
.delight .dlt-letter-title { font-size:16px; margin:0; }
.delight .dlt-letter-line { height:7px; border-radius:4px; background:color-mix(in srgb, var(--ink-soft) 22%, transparent); }
.delight .dlt-letter-line.short { width:62%; }
.delight .dlt-feedcard { background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:13px 14px; display:flex; flex-direction:column; gap:8px; }

/* 7. lateral pass -------------------------------------------------- */
.delight .dlt-pass { width:100%; display:flex; flex-direction:column; gap:12px; }
.delight .dlt-pass-scene { position:relative; height:188px; border:1px solid var(--border); border-radius:16px; overflow:hidden; }
.delight .dlt-pass-bg { position:absolute; inset:0; background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, var(--surface)), var(--surface) 55%, color-mix(in srgb, var(--blue) 16%, var(--surface))); }
.delight .dlt-pass-logo { position:absolute; top:14px; left:18px; z-index:3; display:flex; }
.delight .dlt-pass-hero { position:absolute; left:18px; right:18px; top:58px; z-index:2; display:flex; flex-direction:column; gap:6px; }
.delight .dlt-pass-h { font-size:24px; margin:0; line-height:1.05; }
.delight .dlt-pass-h.sm { font-size:18px; }
.delight .dlt-pass-login { position:absolute; right:18px; top:50px; width:min(280px, 64%); z-index:2; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:9px; box-shadow:0 18px 40px -26px rgba(0,0,0,.6); }
.delight .dlt-fakefield { display:flex; align-items:center; color:var(--ink-soft); }
.delight .dlt-fakebtn { width:100%; }
.delight .dlt-pass-controls { display:flex; gap:8px; }

@media (max-width:640px){
  .delight .dlt-shell { height:auto; min-height:206px; }
  .delight .dlt-vs-pair { grid-template-columns:1fr; }
}
`;
