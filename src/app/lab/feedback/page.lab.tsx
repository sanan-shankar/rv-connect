"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, ShareFat } from "@phosphor-icons/react";
import { Bell, Check, MessageCircle, ImageIcon, MapPin, PenLine } from "lucide-react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  SPRINGS,
  useValleyMotion,
  motion,
  BirdAvatar,
} from "../_kit";
// Read-only core lookups (same pattern as preview/centroid and preview/birds-bg): used only to
// name the species behind a deterministic avatar for the hover tooltip. Nothing here is mutated.
import { birdFor } from "@/lib/avatar";
import { ARCHETYPES, SPECIES_FULL_NAMES } from "@/components/common/bird-avatar-v2";

/** The species name that a given seed's avatar actually renders (mirrors BirdGlyphV2's lookup). */
function speciesNameFor(seed: string): string {
  return SPECIES_FULL_NAMES[birdFor(seed).species % ARCHETYPES.length] ?? "Valley bird";
}

/* ------------------------------------------------------------------ *
 *  Feedback interactions. Each demo is a single micro-interaction that
 *  fires on a click (no hover needed for screenshots). The heart is
 *  always red, leaf flecks are leaf/cinnamon (never heart-red), and only
 *  transform + opacity (plus brief box-shadow/colour) animate.
 * ------------------------------------------------------------------ */

export default function Page() {
  return (
    <DelightShell
      title="Feedback interactions"
      lede="Small, warm answers to a tap. A heart that pops, a ribbon that tucks, a poll that sweeps, a toast from the valley. Click anything to feel it."
      css={CSS}
    >
      <DemoGrid>
        <LikeDemo />
        <BookmarkDemo />
        <RsvpDemo />
        <PollDemo />
        <BellDemo />
        <ShareCommentDemo />
        <SpeciesHoverDemo />
        <ComposerDemo />
        <ToastBirdDemo />
      </DemoGrid>
    </DelightShell>
  );
}

/* ---- 1. Heart pop + leaf flecks + odometer ---- */
const FLECK_COLORS = ["var(--primary)", "var(--cinnamon)"];
function LikeDemo() {
  const { reduced } = useValleyMotion();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(23);
  const [flecks, setFlecks] = useState<{ id: number; x: number; c: string }[]>([]);
  const seed = useRef(0);

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next && !reduced) {
      const n = 2 + Math.floor(Math.random() * 2); // 2-3 flecks
      const batch = Array.from({ length: n }, (_, i) => ({
        id: seed.current++,
        x: -14 + Math.random() * 28,
        c: FLECK_COLORS[i % FLECK_COLORS.length],
      }));
      setFlecks((f) => [...f, ...batch]);
      const ids = batch.map((b) => b.id);
      setTimeout(() => setFlecks((f) => f.filter((b) => !ids.includes(b.id))), 900);
    }
  }

  return (
    <DemoCard title="Heart pop, leaf flecks, odometer" note="Heart snaps red and pops, a couple of leaf flecks drift up, the count rolls one digit.">
      <div className="dlf-likecard v2-card">
        <div className="dlf-postline">
          <BirdAvatar user={{ photoUrl: null, id: "meera", name: "Meera Iyer" }} size={32} />
          <div>
            <b>Meera Iyer</b>
            <span>posted in The Valley Collection</span>
          </div>
        </div>
        <p className="dlf-posttext">Dawn over the south field, before the cricket pitch was mowed.</p>
        <div className="dlf-actions">
          <SpringPress
            className={`dlf-like heartwrap${liked ? " liked" : ""}`}
            onClick={toggle}
            aria-pressed={liked}
          >
            <span className="dlf-fleckhost">
              {flecks.map((f) => (
                <motion.span
                  key={f.id}
                  className="dlf-fleck drift"
                  style={{ background: f.c }}
                  initial={{ opacity: 0, y: 2, x: 0, scale: 0.5, rotate: 0 }}
                  animate={{ opacity: [0, 0.95, 0.95, 0], y: -36, x: f.x, scale: [0.5, 1, 1, 0.9], rotate: f.x > 0 ? 40 : -40 }}
                  transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], times: [0, 0.18, 0.7, 1] }}
                />
              ))}
            </span>
            <motion.span
              className="dlf-heartpop"
              key={liked ? "on" : "off"}
              initial={liked ? { scale: 1 } : false}
              animate={liked ? { scale: [1, 0.86, 1.28, 0.97, 1] } : { scale: 1 }}
              transition={
                liked
                  ? { duration: 0.56, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.16, 0.5, 0.78, 1] }
                  : { duration: 0.2, ease: "easeOut" }
              }
            >
              <Heart size={26} weight={liked ? "fill" : "regular"} />
            </motion.span>
            <Odometer value={count} />
          </SpringPress>
        </div>
      </div>
    </DemoCard>
  );
}

function Odometer({ value }: { value: number }) {
  return (
    <span className="dlf-odo" aria-live="polite">
      <motion.span
        className="dlf-odo-track"
        animate={{ y: 0 }}
        key={value}
        initial={{ y: 14, opacity: 0.4 }}
        transition={SPRINGS.snappy}
      >
        {value}
      </motion.span>
    </span>
  );
}

/* ---- 2. Bookmark ribbon tuck ---- */
// One ribbon silhouette: straight top + two sides, an even inverted-V notch at the foot. The
// SAME path is the outline (stroke, uniform weight) and the clip for the fill sweep, so the stroke
// reads as one continuous even line and the fill always lands exactly inside it.
const RIBBON_PATH = "M5 4 H35 V52 L20 42 L5 52 Z";
function BookmarkDemo() {
  const [saved, setSaved] = useState(false);
  return (
    <DemoCard title="Bookmark ribbon tuck" note="An even cinnamon outline. On save, colour floods up from the foot, then the ribbon gives one happy settle.">
      <div className="dlf-bookwrap">
        <SpringPress className="dlf-bookbtn" onClick={() => setSaved((s) => !s)} aria-pressed={saved}>
          <motion.span
            className={`dlf-ribbon${saved ? " on" : ""}`}
            style={{ transformOrigin: "50% 4px" }}
            animate={saved ? { scaleY: [1, 0.9, 1.04, 1] } : { scaleY: 1 }}
            transition={
              saved
                ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.32, 0.66, 1] }
                : { duration: 0.22, ease: "easeOut" }
            }
          >
            <svg
              width="40"
              height="56"
              viewBox="0 0 40 56"
              aria-hidden
              style={{ overflow: "visible", display: "block" }}
            >
              <defs>
                <clipPath id="dlf-ribbon-clip">
                  <path d={RIBBON_PATH} />
                </clipPath>
              </defs>
              {/* fill sweep: a block that rises from the foot, clipped to the ribbon shape */}
              <motion.rect
                clipPath="url(#dlf-ribbon-clip)"
                x="3"
                y="0"
                width="34"
                height="56"
                fill="var(--cinnamon)"
                style={{ transformBox: "view-box", transformOrigin: "20px 52px" }}
                initial={false}
                animate={{ scaleY: saved ? 1 : 0 }}
                transition={
                  saved
                    ? { duration: 0.42, ease: [0.33, 0, 0.2, 1] }
                    : { duration: 0.26, ease: "easeIn" }
                }
              />
              {/* outline: one continuous stroke, uniform weight on every side and the V notch */}
              <path
                d={RIBBON_PATH}
                fill="none"
                stroke="var(--cinnamon)"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </motion.span>
          <span className="dlf-booklabel">{saved ? "Saved to Roundups" : "Save"}</span>
        </SpringPress>
      </div>
    </DemoCard>
  );
}

/* ---- 3. RSVP confirm morph ---- */
function RsvpDemo() {
  const { reduced } = useValleyMotion();
  const [going, setGoing] = useState(false);
  const [fleck, setFleck] = useState(0);
  function toggle() {
    const next = !going;
    setGoing(next);
    if (next && !reduced) setFleck((f) => f + 1);
  }
  return (
    <DemoCard title="RSVP to Going" note="RSVP fills to Going: a confident button settle, the check draws on, and two leaf flecks lift off.">
      <div className="dlf-rsvpwrap">
        <motion.div
          className="dlf-rsvp-pop"
          animate={going ? { scale: [1, 0.94, 1.05, 1] } : { scale: 1 }}
          transition={
            going
              ? { duration: 0.46, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.28, 0.6, 1] }
              : { duration: 0.2, ease: "easeOut" }
          }
        >
          <SpringPress
            className={`v2-btn dlf-rsvp${going ? " going" : ""}`}
            onClick={toggle}
            aria-pressed={going}
          >
            <span className="dlf-rsvp-check">
              <motion.svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <motion.path
                  d="M3.5 9.5 L7.5 13 L14.5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ pathLength: going ? 1 : 0, opacity: going ? 1 : 0 }}
                  transition={
                    going
                      ? { pathLength: { duration: 0.3, ease: [0.65, 0, 0.35, 1], delay: 0.06 }, opacity: { duration: 0.12 } }
                      : { duration: 0.16, ease: "easeOut" }
                  }
                />
              </motion.svg>
            </span>
            <span className="dlf-rsvp-label">{going ? "Going" : "RSVP"}</span>
            {going &&
              [-12, 11].map((dx, i) => (
                <motion.span
                  key={`${fleck}-${i}`}
                  className="dlf-fleck drift"
                  style={{ background: i === 0 ? "var(--primary)" : "var(--cinnamon)", left: "50%", bottom: 6 }}
                  initial={{ opacity: 0, y: 0, scale: 0.4, rotate: 0 }}
                  animate={{ opacity: [0, 0.95, 0], y: -32, x: dx, scale: [0.4, 1, 0.85], rotate: dx > 0 ? 36 : -36 }}
                  transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1], times: [0, 0.2, 1], delay: i * 0.05 }}
                />
              ))}
          </SpringPress>
        </motion.div>
        <span className="dlf-rsvp-sub">Reunion picnic, banyan lawn, 10am</span>
      </div>
    </DemoCard>
  );
}

/* ---- 4. Poll vote bars ---- */
const POLL = [
  { id: "a", label: "The banyan", base: 0 },
  { id: "b", label: "The library steps", base: 0 },
  { id: "c", label: "Rishi Konda at dusk", base: 0 },
];
const POLL_TARGET: Record<string, number> = { a: 41, b: 23, c: 36 };
function PollDemo() {
  const { reduced } = useValleyMotion();
  const [choice, setChoice] = useState<string | null>(null);
  const [pcts, setPcts] = useState<Record<string, number>>({ a: 0, b: 0, c: 0 });

  function vote(id: string) {
    if (choice) return;
    setChoice(id);
    if (reduced) {
      setPcts(POLL_TARGET);
      return;
    }
    const dur = 620;
    // Each row's number counts up on the same stagger and curve as its bar (80ms apart), so the
    // figure and the bar feel like one motion rather than two timers running side by side. The
    // start time comes from the first rAF frame timestamp (not performance.now in render scope).
    const STAGGER = 80;
    const order = ["a", "b", "c"];
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const next: Record<string, number> = { a: 0, b: 0, c: 0 };
      let done = true;
      order.forEach((id, i) => {
        const t = Math.min(1, Math.max(0, (elapsed - i * STAGGER) / dur));
        const e = 1 - Math.pow(1 - t, 3);
        next[id] = Math.round(POLL_TARGET[id] * e);
        if (t < 1) done = false;
      });
      setPcts(next);
      if (!done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function reset() {
    setChoice(null);
    setPcts({ a: 0, b: 0, c: 0 });
  }

  return (
    <DemoCard title="Poll vote bars" note="Bars sweep from zero in a stagger, percentages count up, your pick gets a leaf check.">
      <div className="dlf-poll">
        <div className="dlf-poll-q">Favourite spot to sit at golden hour?</div>
        <div className="dlf-poll-list">
          {POLL.map((o, i) => (
            <SpringPress
              key={o.id}
              as="div"
              className={`dlf-poll-row${choice ? " voted" : ""}${choice === o.id ? " mine" : ""}`}
              onClick={() => vote(o.id)}
              {...({ role: "button" } as object)}
            >
              <motion.span
                className="dlf-poll-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: choice ? POLL_TARGET[o.id] / 100 : 0 }}
                transition={
                  choice
                    ? { type: "spring", stiffness: 150, damping: 20, delay: i * 0.08 }
                    : { duration: 0.25, ease: "easeOut" }
                }
              />
              <span className="dlf-poll-text">
                {choice === o.id && (
                  <motion.span
                    className="dlf-leafcheck"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={SPRINGS.snappy}
                  >
                    <Check size={12} strokeWidth={3} />
                  </motion.span>
                )}
                {o.label}
              </span>
              <span className="dlf-poll-pct">{choice ? `${pcts[o.id]}%` : ""}</span>
            </SpringPress>
          ))}
        </div>
        <button className="v2-btn v2-btn-ghost sm dlf-poll-reset" onClick={reset} type="button">
          {choice ? "Vote again" : "Tap an option"}
        </button>
      </div>
    </DemoCard>
  );
}

/* ---- 5. Bell dot pop + ring + fundraiser bar ---- */
const FUND_RAISED = 8400;
const FUND_GOAL = 12000;
const FUND_PCT = FUND_RAISED / FUND_GOAL; // 0.7
function BellDemo() {
  const { reduced } = useValleyMotion();
  const [unread, setUnread] = useState(false);
  const [ring, setRing] = useState(0);
  const [filled, setFilled] = useState(false);
  const [amount, setAmount] = useState(0);
  const fundRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | null>(null);

  function notify() {
    setUnread(true);
    if (!reduced) setRing((r) => r + 1);
  }
  function clear() {
    setUnread(false);
  }

  // Count the figure up to match the bar. Reused by the in-view trigger and the replay button.
  function runCount() {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduced) {
      setAmount(FUND_RAISED);
      return;
    }
    const dur = 950;
    let start = 0; // seeded from the first rAF frame timestamp, not performance.now in render scope
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3); // matches the bar's ease-out
      setAmount(Math.round(FUND_RAISED * e));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  // Fill on first scroll-into-view (or immediately if already on screen at mount). SSR-safe:
  // the markup renders at 0 and only fills client-side after the observer fires, so server and
  // client first paint agree.
  useEffect(() => {
    const el = fundRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setFilled(true);
          runCount();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replay() {
    setFilled(false);
    setAmount(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    // next frame so the bar resets to 0 before refilling
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setFilled(true);
        runCount();
      }),
    );
  }

  return (
    <DemoCard title="Bell dot, ring, fundraiser bar" note="A cinnamon dot pops and rings the bell, and the scholarship bar fills to 70% the moment it scrolls into view." span={2}>
      <div className="dlf-bellrow">
        <div className="dlf-bellbox">
          <motion.span
            className="dlf-bell"
            key={ring}
            animate={ring > 0 ? { rotate: [0, -9, 7, -5, 3, 0] } : { rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.36, 0.07, 0.2, 1], times: [0, 0.16, 0.36, 0.56, 0.78, 1] }}
            style={{ transformOrigin: "50% 12%" }}
          >
            <Bell size={30} />
            {unread && (
              <motion.span
                className="dlf-belldot"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.6, 1] }}
              />
            )}
          </motion.span>
          <div className="dlf-bellbtns">
            <button className="v2-btn v2-btn-ghost sm" onClick={notify} type="button">New</button>
            <button className="v2-btn v2-btn-ghost sm" onClick={clear} type="button">Mark read</button>
          </div>
        </div>

        <div className="dlf-fund" ref={fundRef}>
          <div className="dlf-fund-top">
            <span>Scholarship fund</span>
            <b>${amount.toLocaleString()}</b>
            <span className="dlf-fund-goal">of ${FUND_GOAL.toLocaleString()}</span>
          </div>
          <div className="dlf-fund-track">
            <motion.span
              className="dlf-fund-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: filled ? FUND_PCT : 0 }}
              transition={
                filled
                  ? { duration: 0.95, ease: [0.22, 0.61, 0.36, 1] }
                  : { duration: 0.2, ease: "easeOut" }
              }
            />
          </div>
          <button className="v2-btn v2-btn-soft sm" onClick={replay} type="button">Replay</button>
        </div>
      </div>
    </DemoCard>
  );
}

/* ---- 6. Share to check + comment bump + comments open ---- */
function ShareCommentDemo() {
  const { reduced } = useValleyMotion();
  const [shared, setShared] = useState(false);
  const [cliked, setCliked] = useState(false);
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(0);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function doShare() {
    setShared(true);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShared(false), 900);
  }
  function toggleComments() {
    setOpen((o) => !o);
    if (!reduced) setChat((c) => c + 1);
  }

  return (
    <DemoCard title="Share, comment bump, comments open" note="Share nudges then shows a check, a comment like bumps, and the thread grows open." span={2}>
      <div className="dlf-sc v2-card">
        <div className="dlf-postline">
          <BirdAvatar user={{ photoUrl: null, id: "arun", name: "Arun Rao" }} size={32} />
          <div>
            <b>Arun Rao</b>
            <span>shared a Letter, On leaving the valley</span>
          </div>
        </div>
        <div className="dlf-sc-actions">
          <SpringPress className="dlf-iconbtn" onClick={doShare}>
            <span className="dlf-iconswap">
              <motion.span
                key={shared ? "check" : "share"}
                className="dlf-iconface"
                initial={shared ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={shared ? SPRINGS.snappy : { duration: 0.18, ease: "easeOut" }}
              >
                {shared ? <Check size={18} strokeWidth={2.6} className="dlf-sharecheck" /> : <ShareFat size={18} />}
              </motion.span>
            </span>
            <span>{shared ? "Shared" : "Share"}</span>
          </SpringPress>

          <SpringPress
            className={`dlf-iconbtn heartwrap${cliked ? " liked" : ""}`}
            onClick={() => setCliked((c) => !c)}
            aria-pressed={cliked}
          >
            <motion.span animate={{ scale: cliked ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}>
              <Heart size={18} weight={cliked ? "fill" : "regular"} />
            </motion.span>
            <span>{cliked ? "4" : "3"}</span>
          </SpringPress>

          <SpringPress className="dlf-iconbtn" onClick={toggleComments} aria-expanded={open}>
            <motion.span
              key={chat}
              animate={open ? { y: [0, -3, 0], rotate: [0, -6, 0] } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <MessageCircle size={18} />
            </motion.span>
            <span>{open ? "Hide" : "Comments"}</span>
          </SpringPress>
        </div>

        <motion.div
          className="dlf-comments"
          initial={false}
          animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ ...SPRINGS.gentle }}
          style={{ overflow: "hidden" }}
        >
          <div className="dlf-comment">
            <BirdAvatar user={{ photoUrl: null, id: "lila", name: "Lila Sen" }} size={24} />
            <p><b>Lila Sen</b> The banyan misses you too. Come for the reunion.</p>
          </div>
          <div className="dlf-comment">
            <BirdAvatar user={{ photoUrl: null, id: "dev", name: "Dev Menon" }} size={24} />
            <p><b>Dev Menon</b> Read this twice. Thank you for writing it.</p>
          </div>
        </motion.div>
      </div>
    </DemoCard>
  );
}

/* ---- Species on hover (profile pages only) ---- */
// In the app this reveal lives only on a member's profile page, never inline in the feed, so the
// species reads as a small personal detail rather than chrome on every avatar. Hover or keyboard
// focus brings up the tooltip; only opacity + transform animate.
const SPECIES_PEOPLE = [
  { id: "meera", name: "Meera Iyer" },
  { id: "arun", name: "Arun Rao" },
  { id: "dev", name: "Dev Menon" },
];
function SpeciesHoverDemo() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <DemoCard
      title="Species on hover"
      note="On a profile, hovering (or focusing) a member's bird names its species. This is a profile-only touch, never in the feed."
    >
      <div className="dlf-species">
        <span className="dlf-species-flag">profile pages only</span>
        <div className="dlf-species-row">
          {SPECIES_PEOPLE.map((p) => {
            const name = speciesNameFor(p.id);
            const on = active === p.id;
            return (
              <div
                key={p.id}
                className="dlf-species-item"
                tabIndex={0}
                role="img"
                aria-label={`${p.name}, ${name}`}
                onMouseEnter={() => setActive(p.id)}
                onMouseLeave={() => setActive((a) => (a === p.id ? null : a))}
                onFocus={() => setActive(p.id)}
                onBlur={() => setActive((a) => (a === p.id ? null : a))}
              >
                <span className="dlf-species-tipwrap" aria-hidden>
                  <motion.span
                    className="dlf-species-tip"
                    initial={false}
                    animate={on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 6, scale: 0.96 }}
                    transition={on ? SPRINGS.snappy : { duration: 0.14, ease: "easeOut" }}
                    style={{ pointerEvents: "none", transformOrigin: "50% 120%" }}
                  >
                    {name}
                    <span className="dlf-species-tail" />
                  </motion.span>
                </span>
                <motion.span
                  className="dlf-species-av"
                  animate={{ scale: on ? 1.06 : 1 }}
                  transition={SPRINGS.snappy}
                >
                  <BirdAvatar user={{ photoUrl: null, id: p.id, name: p.name }} size={52} />
                </motion.span>
                <span className="dlf-species-name">{p.name.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </DemoCard>
  );
}

/* ---- 7. Composer unfurl ---- */
const TAGS = [
  { id: "photo", label: "Photo", icon: <ImageIcon size={14} /> },
  { id: "place", label: "Place", icon: <MapPin size={14} /> },
  { id: "letter", label: "Letter", icon: <PenLine size={14} /> },
];
function ComposerDemo() {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  return (
    <DemoCard title="Composer unfurl" note="A slim pill springs open into a full card, chips stagger in, the textarea blooms a soft ring." span={3}>
      <div className="dlf-composer">
        <div className="dlf-comp-head">
          <BirdAvatar user={{ photoUrl: null, id: "you", name: "You" }} size={36} />
          {!open ? (
            <SpringPress
              as="div"
              className="dlf-comp-pill"
              onClick={() => setOpen(true)}
              {...({ role: "button" } as object)}
            >
              Share a memory...
            </SpringPress>
          ) : (
            <motion.div
              className="dlf-comp-open"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={SPRINGS.gentle}
              style={{ overflow: "hidden" }}
            >
              <textarea
                className={`dlf-comp-area${focused ? " bloom" : ""}`}
                placeholder="What do you remember from the valley?"
                rows={3}
                autoFocus
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <motion.div
                className="dlf-comp-tools"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
              >
                {TAGS.map((t) => (
                  <motion.span
                    key={t.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: SPRINGS.settle } }}
                  >
                    <SpringPress
                      as="div"
                      className={`v2-chip dlf-comp-chip${tag === t.id ? " on" : ""}`}
                      onClick={() => setTag((c) => (c === t.id ? null : t.id))}
                      animate={{ scale: tag === t.id ? 1.08 : 1 }}
                      transition={SPRINGS.snappy}
                    >
                      {t.icon}
                      {t.label}
                    </SpringPress>
                  </motion.span>
                ))}
              </motion.div>
              <motion.div
                className="dlf-comp-foot"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.settle, delay: 0.16 }}
              >
                <button className="v2-btn v2-btn-ghost sm" onClick={() => { setOpen(false); setTag(null); }} type="button">
                  Cancel
                </button>
                <button className="v2-btn v2-btn-primary sm" type="button">Post</button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </DemoCard>
  );
}

/* ---- 8. Warm toast + avatar beak-chirp ---- */
function ToastBirdDemo() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const seed = useRef(0);
  const MSGS = [
    "Saved. The valley remembers.",
    "Posted to the feed.",
    "Added to your Roundup.",
  ];
  const [chirp, setChirp] = useState(0);
  const lastChirp = useRef(0);

  function fire() {
    const id = seed.current++;
    const msg = MSGS[id % MSGS.length];
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }
  function chirpNow() {
    const now = Date.now();
    if (now - lastChirp.current < 650) return; // rate-limit
    lastChirp.current = now;
    setChirp((c) => c + 1);
  }

  return (
    <DemoCard title="Warm toast, avatar beak-chirp" note="A toast slides in from the corner and dismisses itself; tap the bird for a tiny chirp." span={2}>
      <div className="dlf-toastwrap">
        <p className="dlf-toast-note">In the app this fires on confirmations: contact saved, post shared, RSVP sent.</p>
        <div className="dlf-toast-controls">
          <button className="v2-btn v2-btn-primary sm" onClick={fire} type="button">Send a toast</button>

          <SpringPress as="div" className="dlf-chirpbird" onClick={chirpNow} {...({ role: "button" } as object)}>
            {/* Tap reaction: a confident 2-state spring that lifts and turns, then settles cleanly.
               Springs are safe here because each value goes from one keyframe to one (no array). */}
            <motion.span
              key={chirp}
              initial={chirp > 0 ? { scale: 1.16, rotate: -9 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 460, damping: 17, mass: 0.7 }}
              style={{ display: "inline-block" }}
            >
              <BirdAvatar user={{ photoUrl: null, id: "hoopoe-resident", name: "Hoopoe" }} size={48} />
            </motion.span>
            {chirp > 0 && (
              <span className="dlf-chirp-arcs" aria-hidden>
                {[0, 1, 2].map((n) => (
                  <motion.span
                    key={`${chirp}-${n}`}
                    className="dlf-chirp-arc"
                    initial={{ opacity: 0, scale: 0.35 }}
                    animate={{ opacity: [0, 0.85, 0], scale: 1 }}
                    transition={{ duration: 0.62, ease: [0.22, 0.61, 0.36, 1], delay: n * 0.09, times: [0, 0.3, 1] }}
                  />
                ))}
              </span>
            )}
            <span className="dlf-chirp-hint">tap the bird</span>
          </SpringPress>
        </div>

        <div className="dlf-toaststack">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="dlf-toast"
              initial={{ opacity: 0, x: 40, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={SPRINGS.gentle}
            >
              <span className="dlf-toast-dot" />
              {t.msg}
            </motion.div>
          ))}
        </div>
      </div>
    </DemoCard>
  );
}

const CSS = `
/* shared post bits */
.dlf-postline { display:flex; align-items:center; gap:10px; }
.dlf-postline > div { display:flex; flex-direction:column; line-height:1.25; }
.dlf-postline b { font-size:13.5px; }
.dlf-postline span { font-size:11.5px; color:var(--ink-soft); }

/* 1. like */
.dlf-likecard { width:100%; max-width:340px; padding:14px 15px; display:flex; flex-direction:column; gap:10px; }
.dlf-posttext { font-size:13.5px; line-height:1.55; margin:0; color:var(--ink); }
.dlf-actions { display:flex; }
.dlf-like { position:relative; display:inline-flex; align-items:center; gap:9px; background:var(--surface-2); border:0; cursor:pointer;
  padding:8px 14px; border-radius:999px; color:var(--ink-soft); font:inherit; font-weight:600; font-size:13.5px; }
.dlf-like.liked { color:var(--heart); }
.dlf-like.liked svg { color:var(--heart); fill:var(--heart); }
.dlf-heartpop { display:inline-grid; place-items:center; }
.dlf-fleckhost { position:absolute; left:18px; top:2px; width:0; height:0; pointer-events:none; }
.dlf-fleck { position:absolute; width:7px; height:7px; border-radius:2px 7px 2px 7px; }
.dlf-odo { display:inline-block; height:18px; overflow:hidden; line-height:18px; }
.dlf-odo-track { display:inline-block; }

/* 2. bookmark */
.dlf-bookwrap { display:grid; place-items:center; }
.dlf-bookbtn { display:inline-flex; flex-direction:column; align-items:center; gap:8px; background:transparent; border:0; cursor:pointer; font:inherit; }
.dlf-ribbon { display:inline-grid; place-items:center; }
.dlf-booklabel { font-size:13px; font-weight:600; color:var(--ink-soft); }
.dlf-bookbtn[aria-pressed="true"] .dlf-booklabel { color:var(--cinnamon); }

/* 3. rsvp */
.dlf-rsvpwrap { display:flex; flex-direction:column; align-items:center; gap:10px; }
.dlf-rsvp-pop { display:inline-flex; }
.dlf-rsvp { position:relative; overflow:visible; background:color-mix(in srgb, var(--cinnamon) 14%, var(--surface)); color:var(--cinnamon);
  transition:background-color 110ms linear, color 110ms linear; }
.dlf-rsvp.going { background:var(--primary); color:var(--primary-ink); }
.dlf-rsvp-check { display:inline-grid; place-items:center; width:18px; height:18px; }
.dlf-rsvp-label { font-weight:700; }
.dlf-rsvp-sub { font-size:11.5px; color:var(--ink-soft); }

/* 4. poll */
.dlf-poll { width:100%; max-width:300px; display:flex; flex-direction:column; gap:10px; }
.dlf-poll-q { font-size:13px; font-weight:700; }
.dlf-poll-list { display:flex; flex-direction:column; gap:8px; }
.dlf-poll-row { position:relative; display:flex; align-items:center; justify-content:space-between; gap:8px; overflow:hidden;
  padding:10px 12px; border-radius:12px; border:1px solid var(--border); background:var(--surface-2); cursor:pointer; }
.dlf-poll-row.voted { cursor:default; }
.dlf-poll-fill { position:absolute; left:0; top:0; bottom:0; width:100%; transform-origin:left center;
  background:color-mix(in srgb, var(--primary) 16%, transparent); }
.dlf-poll-row.mine .dlf-poll-fill { background:color-mix(in srgb, var(--primary) 26%, transparent); }
.dlf-poll-text { position:relative; z-index:1; display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; }
.dlf-poll-pct { position:relative; z-index:1; font-size:12.5px; font-weight:700; color:var(--primary); font-variant-numeric:tabular-nums; }
.dlf-leafcheck { display:inline-grid; place-items:center; width:17px; height:17px; border-radius:50%; background:var(--primary); color:#fff; }
.dlf-poll-reset { align-self:flex-start; }

/* 5. bell + fund */
.dlf-bellrow { display:flex; gap:26px; align-items:center; justify-content:center; flex-wrap:wrap; width:100%; }
.dlf-bellbox { display:flex; flex-direction:column; align-items:center; gap:12px; }
.dlf-bell { position:relative; display:inline-grid; place-items:center; width:52px; height:52px; border-radius:16px; background:var(--surface-2); color:var(--ink); }
.dlf-belldot { position:absolute; top:10px; right:11px; width:11px; height:11px; border-radius:50%; background:var(--cinnamon);
  border:2px solid var(--surface-2); }
.dlf-bellbtns { display:flex; gap:8px; }
.dlf-fund { flex:1; min-width:240px; max-width:320px; display:flex; flex-direction:column; gap:9px; }
.dlf-fund-top { display:flex; align-items:baseline; gap:7px; font-size:12.5px; color:var(--ink-soft); }
.dlf-fund-top b { font-size:16px; color:var(--ink); font-variant-numeric:tabular-nums; }
.dlf-fund-goal { font-size:11.5px; }
.dlf-fund-track { height:10px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
.dlf-fund-fill { display:block; height:100%; width:100%; transform-origin:left center; border-radius:999px;
  background:linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, var(--blue))); }

/* 6. share / comment */
.dlf-sc { width:100%; max-width:460px; padding:14px 16px; display:flex; flex-direction:column; gap:12px; }
.dlf-sc-actions { display:flex; gap:8px; }
.dlf-iconbtn { display:inline-flex; align-items:center; gap:7px; background:var(--surface-2); border:0; cursor:pointer;
  padding:7px 13px; border-radius:999px; color:var(--ink-soft); font:inherit; font-weight:600; font-size:13px; }
.dlf-iconbtn.liked { color:var(--heart); }
.dlf-iconbtn.liked svg { color:var(--heart); fill:var(--heart); }
.dlf-iconswap { display:inline-grid; place-items:center; width:18px; height:18px; }
.dlf-iconface { display:inline-grid; place-items:center; grid-area:1 / 1; }
.dlf-sharecheck { color:var(--primary); }
.dlf-comments { display:flex; flex-direction:column; gap:10px; }
.dlf-comment { display:flex; gap:9px; align-items:flex-start; padding-top:4px; }
.dlf-comment p { font-size:12.5px; line-height:1.5; margin:0; color:var(--ink-soft); }
.dlf-comment b { color:var(--ink); margin-right:5px; }

/* species on hover (profile only) */
.dlf-species { width:100%; display:flex; flex-direction:column; align-items:center; gap:16px; }
.dlf-species-flag { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  color:var(--cinnamon); background:color-mix(in srgb, var(--cinnamon) 12%, var(--surface));
  border:1px solid color-mix(in srgb, var(--cinnamon) 30%, var(--border)); padding:4px 10px; border-radius:999px; }
.dlf-species-row { display:flex; gap:22px; align-items:flex-end; justify-content:center; flex-wrap:wrap; }
.dlf-species-item { position:relative; display:flex; flex-direction:column; align-items:center; gap:7px; cursor:default;
  border-radius:14px; padding:6px 8px; outline:none; }
.dlf-species-item:focus-visible { box-shadow:0 0 0 2px color-mix(in srgb, var(--primary) 55%, transparent); }
.dlf-species-av { display:inline-grid; place-items:center; }
.dlf-species-name { font-size:12px; font-weight:600; color:var(--ink-soft); }
/* static centering wrapper: motion only animates opacity/transform on the tip inside it */
.dlf-species-tipwrap { position:absolute; bottom:calc(100% - 2px); left:50%; transform:translateX(-50%);
  display:flex; justify-content:center; pointer-events:none; z-index:2; }
.dlf-species-tip { position:relative; white-space:nowrap; font-size:11.5px; font-weight:700; color:var(--surface);
  background:var(--ink); padding:5px 10px; border-radius:8px;
  box-shadow:0 2px 6px rgba(0,0,0,.08), 0 14px 28px -20px rgba(0,0,0,.6); }
.dlf-species-tail { position:absolute; top:100%; left:50%; width:8px; height:8px; margin-left:-4px; margin-top:-4px;
  background:var(--ink); transform:rotate(45deg); border-radius:1px; }

/* 7. composer */
.dlf-composer { width:100%; max-width:620px; }
.dlf-comp-head { display:flex; gap:12px; align-items:flex-start; background:var(--surface-2); border:1px solid var(--border);
  border-radius:var(--r-card); padding:12px 14px; }
.dlf-comp-pill { flex:1; display:flex; align-items:center; height:42px; padding:0 16px; border-radius:999px;
  background:var(--surface); border:1px solid var(--border); color:var(--ink-soft); font-size:14px; cursor:text; }
.dlf-comp-open { flex:1; display:flex; flex-direction:column; }
.dlf-comp-area { width:100%; resize:none; border-radius:var(--r-input); border:1px solid var(--border); background:var(--surface);
  padding:11px 13px; color:var(--ink); font:inherit; font-size:14px; line-height:1.5; box-shadow:0 0 0 0 transparent;
  transition:box-shadow 140ms ease, border-color 140ms ease; outline:none; }
.dlf-comp-area.bloom { box-shadow:0 0 0 4px color-mix(in srgb, var(--primary) 22%, transparent); border-color:color-mix(in srgb, var(--primary) 55%, var(--border)); }
.dlf-comp-tools { display:flex; gap:8px; margin-top:11px; flex-wrap:wrap; }
.dlf-comp-chip { border:1px solid var(--border); background:var(--surface); }
.dlf-comp-chip.on { background:color-mix(in srgb, var(--primary) 12%, var(--surface)); color:var(--primary); border-color:color-mix(in srgb, var(--primary) 40%, var(--border)); }
.dlf-comp-foot { display:flex; justify-content:flex-end; gap:9px; margin-top:13px; }

/* 8. toast + chirp */
.dlf-toastwrap { position:relative; width:100%; min-height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; }
.dlf-toast-note { margin:0; font-size:11.5px; color:var(--ink-soft); text-align:center; max-width:42ch; line-height:1.45; }
.dlf-toast-controls { display:flex; align-items:center; gap:22px; }
.dlf-chirpbird { position:relative; display:inline-flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
/* clean concentric sound arcs emitting from the beak (top-right of the bird) */
.dlf-chirp-arcs { position:absolute; top:2px; right:-12px; width:30px; height:30px; pointer-events:none; }
.dlf-chirp-arc { position:absolute; right:0; top:50%; width:22px; height:22px; margin-top:-11px;
  border:2px solid var(--blue); border-radius:50%;
  clip-path:polygon(50% 50%, 100% 6%, 100% 94%); transform-origin:0% 50%; }
.dlf-chirp-arc:nth-child(2) { width:14px; height:14px; margin-top:-7px; }
.dlf-chirp-arc:nth-child(1) { width:7px; height:7px; margin-top:-3.5px; }
.dlf-chirp-hint { font-size:11px; color:var(--ink-soft); }
.dlf-toaststack { position:absolute; right:6px; bottom:6px; display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
.dlf-toast { display:inline-flex; align-items:center; gap:9px; background:var(--surface); border:1px solid var(--border);
  border-radius:12px; padding:11px 15px; font-size:13px; font-weight:600; color:var(--ink);
  box-shadow:0 2px 6px rgba(0,0,0,.06), 0 18px 36px -26px rgba(0,0,0,.55); }
.dlf-toast-dot { width:8px; height:8px; border-radius:50%; background:var(--primary); flex:0 0 auto; }
`;
