"use client";

/* ------------------------------------------------------------------ *
 *  Mascot moments — an IDEAS catalogue for where and how the one
 *  hoopoe should appear across Rishi Valley. Nothing here is wired into
 *  the real app; it is a surface for the owner to react to.
 *
 *  Five of the cheapest ideas carry a LIVE mini-demo driven by the real
 *  <Hoopoe> rig + useHoopoe, one hoopoe per demo. The rest are described
 *  cards. Sizing and every verb on its own live in the hoopoe lab
 *  (/lab/hoopoe), which this page leaves untouched.
 * ------------------------------------------------------------------ */

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { DelightShell } from "../_kit";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";

type Intr = "ambient" | "reactive" | "guided";
type Feas = "today" | "work";

const BIRD_SIZE = 100;

export default function MascotMoments() {
  return (
    <DelightShell
      title="Mascot moments"
      lede="Where the one hoopoe shows up across Rishi Valley, and exactly what it does at each spot. Ideas to react to, not built yet. Five of them are live on this page."
      css={MM_CSS}
    >
      <Legend />

      <h2 className="mm-sec">Five you can try right now</h2>
      <div className="mm-grid">
        <EmptyFeedDemo />
        <NoResultsDemo />
        <LoadingDemo />
        <NotFoundDemo />
        <NoSavedDemo />
      </div>

      <h2 className="mm-sec">The rest of the catalogue</h2>
      <div className="mm-grid">
        <CardShell
          n="06"
          name="Post-signup guided tour"
          intr="guided"
          feas="work"
          where="The whole app, once, right after you finish signing up."
          trigger="Your first visit after creating an account. A one-time flag, never shown again."
          does={
            <>
              The hoopoe flies in from a corner, then <V>flyTo</V> each region in turn and{" "}
              <V>point</V>s at it with a short label: your feed, where to write a Letter, the
              directory, groups. A soft <V>express</V> between stops, a <V>wave</V> to finish,
              then it flies off to its resting corner. A Skip pill is always visible and calls{" "}
              <V>cancel</V>.
            </>
          }
        />
        <CardShell
          n="07"
          name="Button to perch flight"
          intr="reactive"
          feas="work"
          where="The login and sign-up pages."
          trigger="You land on the page, or press Sign in / Create account."
          does={
            <>
              A hoopoe appears at the button, does a <V>flyTo</V> up to the login panel as it
              slides in, a <V>land</V>, then perches on the panel edge. From there it runs the{" "}
              <V>coverEyes</V> and <V>peek</V> it already does while you type your password.
            </>
          }
        />
        <CardShell
          n="08"
          name="Empty group"
          intr="ambient"
          feas="work"
          where="A group page with no posts or members yet."
          trigger="You open a group that has no activity."
          does={
            <>
              The hoopoe is already perched on the group header. A single <V>wave</V> when you
              arrive, a soft <V>express</V>, then it <V>point</V>s at Invite classmates and
              settles. The perch is the only new piece.
            </>
          }
        />
        <CardShell
          n="09"
          name="Landing scroll companion"
          intr="ambient"
          feas="work"
          where="The public landing page."
          trigger="You scroll. The bird tracks the page, section by section."
          does={
            <>
              As each section comes up, the hoopoe does a <V>flyTo</V> to that section's corner
              and perches, a <V>gaze</V> at what you are reading, an occasional <V>crestFlick</V>.
              It always sits in the margin, never over the words.
            </>
          }
        />
        <CardShell
          n="10"
          name="Sidebar logo easter egg"
          intr="reactive"
          feas="today"
          where="The peaks logo in the sidebar."
          trigger="Click the logo five times quickly. Only if you go looking."
          does={
            <>
              The hoopoe pops up from behind the logo, a full <V>celebrate(3)</V> with the leaf
              and heart burst, <V>crest(true)</V> fanned wide, then it tucks back out of sight.
              Rare by design.
            </>
          }
        />
        <CardShell
          n="11"
          name="The bird brings the mail"
          intr="reactive"
          feas="work"
          where="The notifications bell."
          trigger="A new notification arrives while you are on the page."
          does={
            <>
              The hoopoe does a <V>flyTo</V> to the bell carrying a small letter, a <V>land</V>,
              sets it down as the unread dot appears, a quick <V>nod</V>, and flies back to its
              corner. Small and in the margin, not a takeover. Needs a carried-letter asset.
            </>
          }
        />
        <CardShell
          n="12"
          name="Your first Letter"
          intr="reactive"
          feas="today"
          where="Right after you publish your first long-form Letter."
          trigger="Your first Letter posts successfully. Once, ever."
          does={
            <>
              A <V>react("success")</V>, which is a <V>celebrate(2)</V> with the particle burst
              and a fanned crest. An earned, rare moment, not something on every post.
            </>
          }
        />
        <CardShell
          n="13"
          name="The away nudge"
          intr="ambient"
          feas="today"
          where="Any page, after a long stretch of no activity."
          trigger="No interaction for several minutes."
          does={
            <>
              A <V>react("idleBored")</V>: the hoopoe looks around, drifts into <V>express("sleepy")</V>,
              a slow double <V>blinkOnce</V>, maybe tucks its head. It just gets sleepy in its
              corner. No popup, no sound.
            </>
          }
        />
        <CardShell
          n="14"
          name="Rare idle behaviours"
          intr="ambient"
          feas="work"
          where="Wherever the resident bird happens to be sitting."
          trigger="A small random chance during idle, or a date like the monsoon or Founders Day."
          does={
            <>
              Once in a long while it preens (bill into wing, a <V>crestFlick</V>), catches a bug
              with a peck and a happy beat, or does a two-step <V>hop</V>. One idle in a hundred.
              Preen and peck are small new verbs.
            </>
          }
        />
        <CardShell
          n="15"
          name="A proud moment"
          intr="reactive"
          feas="today"
          where="Finishing your profile, or crossing a milestone like your tenth post."
          trigger="You complete a profile step or pass a milestone."
          does={
            <>
              An <V>express("proud")</V>, a <V>wave</V>, <V>crest(true)</V>, and a <V>nod</V>.
              Brief and warm, then back to quiet.
            </>
          }
        />
      </div>
    </DelightShell>
  );
}

/* ------------------------------------------------------------------ *
 *  Legend: the one-bird rule, the three intrusiveness tiers, the two
 *  feasibility keys, the verbs it leans on, and a link to the lab.
 * ------------------------------------------------------------------ */
function Legend() {
  return (
    <section className="mm-card mm-hero">
      <h2 className="v2-display">One bird, everywhere and nowhere.</h2>
      <p>
        There is only ever one hoopoe. It is a single character, never a flock, never two on
        screen at once. It lives in the quiet edges of the product: present, curious, easy to
        ignore. The rule that ties every idea below together is that it should never sit on top of
        what you came to read.
      </p>
      <p className="mm-hero-soft">
        Each idea is tagged by how much it asks of you, and by whether it works with the verbs the
        controller already has or needs a little new motion.
      </p>

      <div className="mm-legend">
        <div className="mm-legend-item">
          <h4>
            <span className="mm-badge-dot amb" /> Ambient
          </h4>
          <p>Just present. Idles, breathes, pecks in a corner. Never asks for anything.</p>
        </div>
        <div className="mm-legend-item">
          <h4>
            <span className="mm-badge-dot rea" /> Reactive
          </h4>
          <p>Answers something you just did. A short beat, then it settles back to quiet.</p>
        </div>
        <div className="mm-legend-item">
          <h4>
            <span className="mm-badge-dot gui" /> Guided
          </h4>
          <p>Actively leads you. Only the first-run tour does this, and it is always skippable.</p>
        </div>
      </div>

      <div className="mm-keys">
        <div className="mm-keycol">
          <h5>Works today (existing verbs)</h5>
          <div className="mm-vrow">
            {["flyTo", "point", "wave", "nod", "shake", "gaze", "express", "celebrate", "hop", "crest", "react", "blinkOnce", "coverEyes", "peek"].map(
              (v) => (
                <V key={v}>{v}</V>
              ),
            )}
          </div>
        </div>
        <div className="mm-keycol">
          <h5>Needs motion work (proposed)</h5>
          <div className="mm-vrow">
            {["perch", "peck", "preen", "flyIn"].map((v) => (
              <V key={v} soft>
                {v}
              </V>
            ))}
          </div>
        </div>
      </div>

      <Link href="/lab/hoopoe" className="mm-lablink">
        Sizing and every verb on its own live in the hoopoe lab
        <span aria-hidden>&rsaquo;</span>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Card shell + small pieces
 * ------------------------------------------------------------------ */
const INTR: Record<Intr, { label: string; cls: string }> = {
  ambient: { label: "Ambient", cls: "amb" },
  reactive: { label: "Reactive", cls: "rea" },
  guided: { label: "Guided", cls: "gui" },
};
const FEAS: Record<Feas, { label: string; cls: string }> = {
  today: { label: "Works today", cls: "ok" },
  work: { label: "Needs motion work", cls: "wk" },
};

function CardShell({
  n,
  name,
  intr,
  feas,
  where,
  trigger,
  does,
  live = false,
  children,
}: {
  n: string;
  name: string;
  intr: Intr;
  feas: Feas;
  where: ReactNode;
  trigger: ReactNode;
  does: ReactNode;
  live?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className="mm-card">
      <header className="mm-card-h">
        <span className="mm-num">{n}</span>
        <h3 className="v2-display">{name}</h3>
        {live && <span className="mm-live">Live</span>}
      </header>
      <div className="mm-badges">
        <span className={`mm-badge ${INTR[intr].cls}`}>
          <span className="mm-badge-dot" />
          {INTR[intr].label}
        </span>
        <span className={`mm-badge ${FEAS[feas].cls}`}>
          <span className="mm-badge-dot" />
          {FEAS[feas].label}
        </span>
      </div>
      <dl className="mm-meta">
        <div>
          <dt>Where</dt>
          <dd>{where}</dd>
        </div>
        <div>
          <dt>Trigger</dt>
          <dd>{trigger}</dd>
        </div>
        <div>
          <dt>Hoopoe does</dt>
          <dd>{does}</dd>
        </div>
      </dl>
      {children}
    </article>
  );
}

function V({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return <code className={`mm-v${soft ? " soft" : ""}`}>{children}</code>;
}

/* ------------------------------------------------------------------ *
 *  Live-demo plumbing. Each demo owns exactly ONE <Hoopoe>. It autoplays
 *  once when scrolled into view and can be replayed on demand.
 * ------------------------------------------------------------------ */
function useAutoplay(ref: RefObject<HTMLElement | null>, play: () => void) {
  const playRef = useRef(play);
  playRef.current = play;
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true;
            window.setTimeout(() => playRef.current(), 550);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="mm-replay" onClick={onClick}>
      <span aria-hidden>&#8635;</span> Replay
    </button>
  );
}

/* --- 01 · Empty feed: idle, peck (soft nod), then point at the composer --- */
function EmptyFeedDemo() {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const writeRef = useRef<HTMLDivElement>(null);
  const play = () => {
    h.cancel();
    h.sequence(
      () => h.gaze(0.15),
      ["nod", 1],
      ["crestFlick"],
      ["nod", 1],
      () => h.gaze(0.9),
      ["point", writeRef.current, { hold: 950 }],
      ["express", "happy"],
      wait(400),
      () => h.gaze(0),
    );
  };
  useAutoplay(stageRef, play);
  return (
    <CardShell
      n="01"
      name="Empty feed"
      intr="ambient"
      feas="today"
      live
      where="The feed, before anyone has posted a Letter."
      trigger="The feed loads with no posts."
      does={
        <>
          The hoopoe idles on the empty sheet, gives the odd <V>crestFlick</V>, and pecks with a
          soft <V>nod</V> as if foraging. It will <V>gaze</V> then <V>point</V> at Write the first
          Letter with a happy little <V>express</V>.
        </>
      }
    >
      <div className="mm-demo" ref={stageRef}>
        <div className="mm-scene">
          <ReplayButton onClick={play} />
          <p className="mm-cap">No Letters here yet.</p>
          <div className="mm-target" ref={writeRef}>
            Write the first Letter
          </div>
          <div className="mm-bird">
            <Hoopoe ref={ref} size={BIRD_SIZE} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* --- 02 · No search results: curious, look around, a no-luck shake --- */
function NoResultsDemo() {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const play = () => {
    h.cancel();
    h.sequence(
      ["express", "curious"],
      () => h.gaze(-0.85),
      wait(430),
      () => h.gaze(0.85),
      wait(430),
      () => h.gaze(0),
      ["shake", 1],
      ["express", "content"],
    );
  };
  useAutoplay(stageRef, play);
  return (
    <CardShell
      n="02"
      name="No search results"
      intr="reactive"
      feas="today"
      live
      where="Search, in the directory or the feed."
      trigger="A query comes back with nothing."
      does={
        <>
          An <V>express("curious")</V>, then it will <V>gaze</V> left and right as if hunting for
          the match, a small <V>shake</V> that reads as no luck, and back to{" "}
          <V>express("content")</V>. No copy needed, the bird says it.
        </>
      }
    >
      <div className="mm-demo" ref={stageRef}>
        <div className="mm-scene mm-scene-center">
          <ReplayButton onClick={play} />
          <div className="mm-search">
            <span className="mm-search-ic" aria-hidden>
              &#9906;
            </span>
            <span>rishi valley, 1998</span>
          </div>
          <p className="mm-cap-c">No matches found.</p>
          <div className="mm-bird">
            <Hoopoe ref={ref} size={BIRD_SIZE} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* --- 03 · Loading companion: hop in place, then a happy hand-off --- */
function LoadingDemo() {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const play = () => {
    h.cancel();
    h.sequence(
      ["hop", 1],
      ["crestFlick"],
      ["hop", 1],
      ["blinkOnce", false],
      ["hop", 1],
      ["land"],
      ["express", "happy"],
      wait(400),
      ["express", "content"],
    );
  };
  useAutoplay(stageRef, play);
  return (
    <CardShell
      n="03"
      name="Loading companion"
      intr="ambient"
      feas="today"
      live
      where="Any route while it loads, and the landing hero while its photo arrives."
      trigger="Content or a skeleton is still loading."
      does={
        <>
          The hoopoe will <V>hop</V> in place with the odd <V>crestFlick</V> and blink, keeping
          you company. When the content lands it does one <V>land</V> and a quick{" "}
          <V>express("happy")</V> as the hand-off.
        </>
      }
    >
      <div className="mm-demo" ref={stageRef}>
        <div className="mm-scene">
          <ReplayButton onClick={play} />
          <div className="mm-skel" aria-hidden>
            <span className="mm-skel-bar" />
            <span className="mm-skel-bar w2" />
            <span className="mm-skel-bar w3" />
          </div>
          <div className="mm-bird">
            <Hoopoe ref={ref} size={BIRD_SIZE} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* --- 04 · 404: worried, lost, then point at the way back --- */
function NotFoundDemo() {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const play = () => {
    h.cancel();
    h.sequence(
      ["express", "worried"],
      ["shake", 1],
      () => h.gaze(-0.7),
      wait(400),
      () => h.gaze(0.7),
      wait(400),
      () => h.gaze(0),
      ["point", backRef.current, { hold: 950 }],
      ["wave", 2],
      ["express", "content"],
    );
  };
  useAutoplay(stageRef, play);
  return (
    <CardShell
      n="04"
      name="404, the empty nest"
      intr="reactive"
      feas="today"
      live
      where="The not-found page."
      trigger="You reach a URL that does not exist."
      does={
        <>
          An <V>express("worried")</V>, a <V>shake</V>, then it will <V>gaze</V> around as if
          lost, <V>point</V> at Back to the feed, give a <V>wave</V>, and settle.
        </>
      }
    >
      <div className="mm-demo" ref={stageRef}>
        <div className="mm-scene">
          <ReplayButton onClick={play} />
          <span className="mm-404" aria-hidden>
            404
          </span>
          <p className="mm-cap">This nest is empty.</p>
          <div className="mm-target" ref={backRef}>
            Back to the feed
          </div>
          <div className="mm-bird">
            <Hoopoe ref={ref} size={BIRD_SIZE} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* --- 05 · No saved posts: look at the bookmark, a sleepy blink --- */
function NoSavedDemo() {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const play = () => {
    h.cancel();
    h.sequence(
      () => h.gaze(0.7),
      ["express", "sleepy", { hold: 700 }],
      ["blinkOnce", true],
      () => h.gaze(0),
      ["express", "content"],
    );
  };
  useAutoplay(stageRef, play);
  return (
    <CardShell
      n="05"
      name="No saved posts"
      intr="ambient"
      feas="today"
      live
      where="Your saved items, when nothing is bookmarked."
      trigger="The saved view has no posts."
      does={
        <>
          The hoopoe sits by an empty bookmark, will <V>gaze</V> at it, goes a touch{" "}
          <V>express("sleepy")</V> with a slow double <V>blinkOnce</V>, then back to content.
          Quiet, never nagging.
        </>
      }
    >
      <div className="mm-demo" ref={stageRef}>
        <div className="mm-scene">
          <ReplayButton onClick={play} />
          <span className="mm-bm" aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h12v16l-6-4-6 4z" />
            </svg>
          </span>
          <p className="mm-cap">Nothing saved yet.</p>
          <div className="mm-bird">
            <Hoopoe ref={ref} size={BIRD_SIZE} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */
const MM_CSS = `
.mm-sec { font-size:13px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); margin:36px 2px 16px; font-weight:700; }

/* legend / hero */
.mm-hero { padding:24px 26px; margin-bottom:8px; }
.mm-hero h2 { font-size:24px; margin:0 0 12px; }
.mm-hero p { font-size:14px; line-height:1.65; color:var(--ink); margin:0 0 12px; max-width:70ch; }
.mm-hero-soft { color:var(--ink-soft) !important; }
.mm-legend { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:8px; }
.mm-legend-item { background:var(--surface-2); border:1px solid var(--border); border-radius:14px; padding:12px 14px; }
.mm-legend-item h4 { margin:0 0 6px; font-size:13px; display:flex; align-items:center; gap:8px; }
.mm-legend-item p { font-size:12px !important; line-height:1.5; margin:0 !important; color:var(--ink-soft) !important; max-width:none !important; }
@media (max-width:720px){ .mm-legend{ grid-template-columns:1fr; } }

.mm-keys { display:flex; flex-wrap:wrap; gap:18px 36px; margin-top:18px; padding-top:16px; border-top:1px solid var(--border); }
.mm-keycol h5 { margin:0 0 9px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft); font-weight:700; }
.mm-vrow { display:flex; flex-wrap:wrap; gap:6px; max-width:none; }

.mm-lablink { display:inline-flex; align-items:center; gap:7px; margin-top:18px; font-size:12.5px; font-weight:700; color:var(--primary); text-decoration:none;
  border-radius:999px; padding:8px 15px; border:1px solid color-mix(in srgb, var(--primary) 30%, var(--border)); background:color-mix(in srgb, var(--primary) 8%, var(--surface));
  transition:transform .15s var(--ease-pop); }
.mm-lablink:hover { transform:translateY(-1px); }
.mm-lablink:active { transform:translateY(0) scale(.98); }
.mm-lablink:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }

/* grid of cards */
.mm-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; align-items:start; }
@media (max-width:820px){ .mm-grid{ grid-template-columns:1fr; } }

/* card */
.mm-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); padding:18px 18px 16px;
  box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }
.mm-card-h { display:flex; align-items:center; gap:10px; }
.mm-num { font-size:11px; font-weight:700; color:var(--ink-soft); background:var(--surface-2); border:1px solid var(--border); border-radius:8px; padding:3px 7px; letter-spacing:.04em; }
.mm-card-h h3 { font-size:17px; margin:0; flex:1; line-height:1.15; }
.mm-live { font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--primary-ink); background:var(--primary); border-radius:999px; padding:3px 9px; }

.mm-badges { display:flex; flex-wrap:wrap; gap:7px; margin:12px 0 14px; }
.mm-badge { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600; padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:var(--surface-2); color:var(--ink-soft); }
.mm-badge .mm-badge-dot { width:7px; height:7px; border-radius:50%; background:currentColor; }
.mm-badge.amb { color:var(--primary); background:color-mix(in srgb, var(--primary) 10%, var(--surface)); border-color:color-mix(in srgb, var(--primary) 24%, var(--border)); }
.mm-badge.rea { color:var(--cinnamon); background:color-mix(in srgb, var(--cinnamon) 10%, var(--surface)); border-color:color-mix(in srgb, var(--cinnamon) 24%, var(--border)); }
.mm-badge.gui { color:var(--blue); background:color-mix(in srgb, var(--blue) 10%, var(--surface)); border-color:color-mix(in srgb, var(--blue) 24%, var(--border)); }
.mm-badge.ok { color:var(--primary); }
.mm-badge.wk { color:var(--ink-soft); }
.mm-badge.wk .mm-badge-dot { opacity:.55; }

/* standalone dots used in the legend headings */
.mm-badge-dot.amb { display:inline-block; width:9px; height:9px; border-radius:50%; background:var(--primary); }
.mm-badge-dot.rea { display:inline-block; width:9px; height:9px; border-radius:50%; background:var(--cinnamon); }
.mm-badge-dot.gui { display:inline-block; width:9px; height:9px; border-radius:50%; background:var(--blue); }

.mm-meta { margin:0; display:flex; flex-direction:column; gap:9px; }
.mm-meta > div { display:grid; grid-template-columns:78px 1fr; gap:12px; align-items:start; }
.mm-meta dt { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--ink-soft); font-weight:700; padding-top:2px; }
.mm-meta dd { margin:0; font-size:13px; line-height:1.55; color:var(--ink); }
@media (max-width:440px){ .mm-meta > div{ grid-template-columns:1fr; gap:2px; } }

.mm-v { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:1px 5px; color:var(--cinnamon); white-space:nowrap; }
.mm-v.soft { color:var(--ink-soft); border-style:dashed; }

/* demo stage */
.mm-demo { margin-top:15px; }
.mm-scene { position:relative; height:214px; border-radius:14px; border:1px solid var(--border);
  background:radial-gradient(130% 120% at 50% 10%, color-mix(in srgb, var(--cinnamon) 8%, var(--surface-2)), var(--surface-2)); overflow:hidden; }
.mm-scene-center { text-align:center; }
.mm-bird { position:absolute; left:50%; bottom:6px; transform:translateX(-50%); }

.mm-cap { position:absolute; top:16px; left:16px; font-size:13px; font-weight:600; color:var(--ink-soft); max-width:46%; line-height:1.4; margin:0; }
.mm-cap-c { position:absolute; top:64px; left:0; right:0; font-size:12.5px; color:var(--ink-soft); margin:0; }

.mm-target { position:absolute; top:14px; right:14px; z-index:2; font-size:12px; font-weight:700; color:var(--primary-ink); background:var(--primary);
  border-radius:999px; padding:7px 13px; box-shadow:0 6px 16px -10px var(--primary); }

.mm-search { position:absolute; top:18px; left:50%; transform:translateX(-50%); display:inline-flex; align-items:center; gap:9px;
  background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:8px 16px; font-size:12.5px; color:var(--ink); white-space:nowrap; }
.mm-search-ic { color:var(--ink-soft); font-size:14px; }

.mm-404 { position:absolute; top:50%; left:50%; transform:translate(-50%,-64%); font-family:var(--font-display),Georgia,serif; font-size:104px; font-weight:800; color:var(--ink); opacity:.06; letter-spacing:-.03em; }

.mm-skel { position:absolute; top:18px; left:16px; right:16px; display:flex; flex-direction:column; gap:9px; }
.mm-skel-bar { height:11px; border-radius:6px; background:var(--surface); border:1px solid var(--border); animation:mmpulse 1.5s ease-in-out infinite; }
.mm-skel-bar.w2 { width:78%; animation-delay:.2s; }
.mm-skel-bar.w3 { width:56%; animation-delay:.4s; }
@keyframes mmpulse { 0%,100%{ opacity:.5; } 50%{ opacity:.95; } }
.delight.reduce .mm-skel-bar { animation:none !important; }

.mm-bm { position:absolute; top:14px; right:18px; color:var(--ink-soft); }

.mm-replay { position:absolute; bottom:10px; right:10px; z-index:4; font:inherit; font-size:11.5px; font-weight:700; color:var(--ink-soft);
  background:color-mix(in srgb, var(--surface) 82%, transparent); backdrop-filter:blur(5px); border:1px solid var(--border); border-radius:999px; padding:5px 12px; cursor:pointer;
  display:inline-flex; align-items:center; gap:5px; transition:transform .15s var(--ease-pop); }
.mm-replay:hover { transform:translateY(-1px); color:var(--ink); }
.mm-replay:active { transform:scale(.95); }
.mm-replay:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
`;
