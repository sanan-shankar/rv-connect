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
          <BirdAvatar user={{ id: "meera", name: "Meera Iyer" }} size={32} />
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
                  initial={{ opacity: 0.9, y: 0, x: 0, scale: 0.7 }}
                  animate={{ opacity: 0, y: -34, x: f.x, scale: 1 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                />
              ))}
            </span>
            <motion.span
              className="dlf-heartpop"
              key={liked ? "on" : "off"}
              initial={liked ? { scale: 1 } : false}
              animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
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
function BookmarkDemo() {
  const [saved, setSaved] = useState(false);
  return (
    <DemoCard title="Bookmark ribbon tuck" note="A cinnamon ribbon sweeps down and the V notch tucks in and springs back.">
      <div className="dlf-bookwrap">
        <SpringPress className="dlf-bookbtn" onClick={() => setSaved((s) => !s)} aria-pressed={saved}>
          <span className={`dlf-ribbon${saved ? " on" : ""}`}>
            <motion.svg width="40" height="58" viewBox="0 0 40 58" aria-hidden>
              <motion.path
                d="M4 2 H36 V54 L20 44 L4 54 Z"
                fill={saved ? "var(--cinnamon)" : "transparent"}
                stroke="var(--cinnamon)"
                strokeWidth="2.4"
                style={{ transformBox: "view-box", transformOrigin: "20px 2px" }}
                animate={{ scaleY: saved ? 1 : 0.94 }}
                transition={SPRINGS.gentle}
              />
              <motion.path
                d="M4 54 L20 44 L36 54"
                fill="none"
                stroke={saved ? "var(--cinnamon)" : "var(--border)"}
                strokeWidth="2.4"
                style={{ transformBox: "view-box", transformOrigin: "20px 49px" }}
                animate={{ scaleY: saved ? [1, 0.55, 1] : 1 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </motion.svg>
          </span>
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
    <DemoCard title="RSVP confirm morph" note="RSVP morphs to Going with a drawn check, cinnamon settles into filled green.">
      <div className="dlf-rsvpwrap">
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
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={false}
                animate={{ pathLength: going ? 1 : 0, opacity: going ? 1 : 0 }}
                transition={{ duration: 0.34, ease: "easeOut" }}
              />
            </motion.svg>
          </span>
          <span className="dlf-rsvp-label">{going ? "Going" : "RSVP"}</span>
          {fleck > 0 && going && (
            <motion.span
              key={fleck}
              className="dlf-fleck drift"
              style={{ background: "var(--primary)", left: "50%", bottom: 4 }}
              initial={{ opacity: 0.9, y: 0, scale: 0.7 }}
              animate={{ opacity: 0, y: -30, x: 10, scale: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
          )}
        </SpringPress>
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
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setPcts({
        a: Math.round(POLL_TARGET.a * e),
        b: Math.round(POLL_TARGET.b * e),
        c: Math.round(POLL_TARGET.c * e),
      });
      if (t < 1) requestAnimationFrame(tick);
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
                transition={{ ...SPRINGS.settle, delay: choice ? i * 0.07 : 0 }}
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
function BellDemo() {
  const { reduced } = useValleyMotion();
  const [unread, setUnread] = useState(false);
  const [ring, setRing] = useState(0);
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState(0);

  function notify() {
    setUnread(true);
    if (!reduced) setRing((r) => r + 1);
  }
  function clear() {
    setUnread(false);
  }
  function fund() {
    setShow(true);
    if (reduced) {
      setAmount(8400);
      return;
    }
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setAmount(Math.round(8400 * e));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return (
    <DemoCard title="Bell dot, ring, fundraiser bar" note="A cinnamon dot pops and rocks the bell once, and the scholarship bar fills to 70%." span={2}>
      <div className="dlf-bellrow">
        <div className="dlf-bellbox">
          <motion.span
            className="dlf-bell"
            key={ring}
            animate={ring > 0 ? { rotate: [0, -14, 11, -7, 0] } : { rotate: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 10%" }}
          >
            <Bell size={30} />
            {unread && (
              <motion.span
                className="dlf-belldot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={SPRINGS.snappy}
              />
            )}
          </motion.span>
          <div className="dlf-bellbtns">
            <button className="v2-btn v2-btn-ghost sm" onClick={notify} type="button">New</button>
            <button className="v2-btn v2-btn-ghost sm" onClick={clear} type="button">Mark read</button>
          </div>
        </div>

        <div className="dlf-fund">
          <div className="dlf-fund-top">
            <span>Scholarship fund</span>
            <b>${amount.toLocaleString()}</b>
            <span className="dlf-fund-goal">of $12,000</span>
          </div>
          <div className="dlf-fund-track">
            <motion.span
              className="dlf-fund-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: show ? 0.7 : 0 }}
              transition={{ ...SPRINGS.settle }}
            />
          </div>
          <button className="v2-btn v2-btn-soft sm" onClick={fund} type="button">Show progress</button>
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
          <BirdAvatar user={{ id: "arun", name: "Arun Rao" }} size={32} />
          <div>
            <b>Arun Rao</b>
            <span>shared a Letter, On leaving the valley</span>
          </div>
        </div>
        <div className="dlf-sc-actions">
          <SpringPress className="dlf-iconbtn" onClick={doShare}>
            <motion.span
              animate={shared ? { x: [0, 3, 0], rotate: [0, -8, 0] } : { x: 0, rotate: 0 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="dlf-iconswap"
            >
              {shared ? <Check size={18} strokeWidth={2.6} className="dlf-sharecheck" /> : <ShareFat size={18} />}
            </motion.span>
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
            <BirdAvatar user={{ id: "lila", name: "Lila Sen" }} size={24} />
            <p><b>Lila Sen</b> The banyan misses you too. Come for the reunion.</p>
          </div>
          <div className="dlf-comment">
            <BirdAvatar user={{ id: "dev", name: "Dev Menon" }} size={24} />
            <p><b>Dev Menon</b> Read this twice. Thank you for writing it.</p>
          </div>
        </motion.div>
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
          <BirdAvatar user={{ id: "you", name: "You" }} size={36} />
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
        <div className="dlf-toast-controls">
          <button className="v2-btn v2-btn-primary sm" onClick={fire} type="button">Send a toast</button>

          <SpringPress as="div" className="dlf-chirpbird" onClick={chirpNow} {...({ role: "button" } as object)}>
            <motion.span
              key={chirp}
              animate={chirp > 0 ? { scale: [1, 1.14, 1], rotate: [0, -8, 5, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{ display: "inline-block" }}
            >
              <BirdAvatar user={{ id: "hoopoe-resident", name: "Hoopoe" }} size={48} />
            </motion.span>
            {chirp > 0 && (
              <motion.svg
                key={`arc-${chirp}`}
                className="dlf-chirp-arc"
                width="26" height="22" viewBox="0 0 26 22" aria-hidden
                initial={{ opacity: 0.8, scale: 0.6, x: 0, y: 0 }}
                animate={{ opacity: 0, scale: 1.1, x: 8, y: -8 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <path d="M3 16 Q9 4 14 11" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 18 Q15 8 21 14" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              </motion.svg>
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
.dlf-iconswap { display:inline-grid; place-items:center; }
.dlf-sharecheck { color:var(--primary); }
.dlf-comments { display:flex; flex-direction:column; gap:10px; }
.dlf-comment { display:flex; gap:9px; align-items:flex-start; padding-top:4px; }
.dlf-comment p { font-size:12.5px; line-height:1.5; margin:0; color:var(--ink-soft); }
.dlf-comment b { color:var(--ink); margin-right:5px; }

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
.dlf-toastwrap { position:relative; width:100%; min-height:120px; display:flex; align-items:center; justify-content:center; }
.dlf-toast-controls { display:flex; align-items:center; gap:22px; }
.dlf-chirpbird { position:relative; display:inline-flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
.dlf-chirp-arc { position:absolute; top:-6px; right:-2px; pointer-events:none; }
.dlf-chirp-hint { font-size:11px; color:var(--ink-soft); }
.dlf-toaststack { position:absolute; right:6px; bottom:6px; display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
.dlf-toast { display:inline-flex; align-items:center; gap:9px; background:var(--surface); border:1px solid var(--border);
  border-radius:12px; padding:11px 15px; font-size:13px; font-weight:600; color:var(--ink);
  box-shadow:0 2px 6px rgba(0,0,0,.06), 0 18px 36px -26px rgba(0,0,0,.55); }
.dlf-toast-dot { width:8px; height:8px; border-radius:50%; background:var(--primary); flex:0 0 auto; }
`;
