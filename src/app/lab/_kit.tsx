"use client";

/* ------------------------------------------------------------------ *
 *  Delight kit — the shared motion + design foundation for the
 *  /lab showcase. Self-contained: nothing here touches core
 *  app files. Tokens are copied byte-for-byte from /lab/v2 so the
 *  showcase matches the locked look, then namespaced under `.delight`.
 * ------------------------------------------------------------------ */

import {
  motion,
  useScroll,
  useTransform,
  type MotionProps,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";

export { PeaksMark, BirdAvatar, motion };

/* ---- one spring set to rule them all (matches the v2 cubic-beziers) ---- */
export const SPRINGS = {
  gentle: { type: "spring", stiffness: 210, damping: 24, mass: 0.9 } as const, // enters, route changes
  snappy: { type: "spring", stiffness: 420, damping: 30 } as const, // pills, presses, avatars
  settle: { type: "spring", stiffness: 160, damping: 22 } as const, // ambient, breathing
};

/* ---- reduced-motion + tab-visibility governor ---- */
const ReducedCtx = createContext(false);
export function useValleyMotion() {
  // In this showcase, ambient motion is driven by the in-app "Reduced motion" toggle only, not the OS
  // prefers-reduced-motion setting, so the living demos always play for the owner. `forced` is a
  // deterministic context value (false on server and client), so this never trips hydration.
  // (The real app should also honor the OS media query; that belongs there, not in this preview.)
  const forced = useContext(ReducedCtx);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return { reduced: forced, paused };
}

/* ---- reusable motion primitives ---- */
export function FadeRise({
  children,
  delay = 0,
  y = 10,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  // CSS-driven enter: the SSR markup carries no opacity/transform inline style, so server and client
  // hydration match (motion `initial` + `animate` was rendering different frames and tripping React).
  return (
    <div
      className={`dl-fadein${className ? ` ${className}` : ""}`}
      style={{ animationDelay: delay ? `${delay}s` : undefined, ["--rise"]: `${y}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function Stagger({ children, className, gap = 0.05 }: { children: ReactNode; className?: string; gap?: number }) {
  // CSS nth-child delays drive the stagger; direct children animate via `.dl-stagger > *` and render
  // static on the server (no hydration mismatch). gap is seconds between children.
  return (
    <div className={`dl-stagger${className ? ` ${className}` : ""}`} style={{ ["--sgap"]: `${gap}s` } as CSSProperties}>
      {children}
    </div>
  );
}
// kept for API compatibility; the `.dl-stagger > *` CSS now drives the entrance, so this is a no-op
// variant (a bare `variants={staggerChild}` motion element renders static, which is what we want).
export const staggerChild = {};

export function SpringPress({
  children,
  className,
  onClick,
  as = "button",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div" | "a";
} & MotionProps) {
  const Comp = (motion as unknown as Record<string, typeof motion.button>)[as] ?? motion.button;
  return (
    // Press is now intentional, not a hint: a clear sink on tap plus a small lift on hover so
    // every clickable telegraphs that it is alive. Transform-only, snappy spring (ages well).
    <Comp
      className={className}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* scroll-linked vertical drift; freezes under reduced motion */
export function AmbientLayer({ children, factor = 0.07, className }: { children: ReactNode; factor?: number; className?: string }) {
  const { reduced } = useValleyMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => (reduced ? 0 : v * factor));
  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/* ---- showcase chrome ---- */
export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label?: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="dl-seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)} type="button">
          {value === o.v && <motion.span layoutId="dlSegThumb" className="dl-seg-thumb" transition={SPRINGS.snappy} />}
          <span className="dl-seg-label">{o.icon}{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function DemoCard({
  title,
  note,
  children,
  span = 1,
  pad = true,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  span?: 1 | 2 | 3;
  pad?: boolean;
}) {
  return (
    <section className={`dl-demo dl-span-${span}`}>
      <div className="dl-demo-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      <div className={`dl-demo-stage${pad ? "" : " flush"}`}>{children}</div>
    </section>
  );
}

export function DemoGrid({ children }: { children: ReactNode }) {
  return <div className="dl-grid">{children}</div>;
}

/* the page wrapper: theme + reduced toggle + base styles + a back link */
export function DelightShell({
  title,
  lede,
  children,
  css = "",
  index = false,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
  css?: string;
  index?: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("theme") === "dark") setTheme("dark");
    if (q.get("reduced") === "1") setReduced(true);
  }, []);

  return (
    <ReducedCtx.Provider value={reduced}>
      <div className={`delight${theme === "dark" ? " dark" : ""}${reduced ? " reduce" : ""}`}>
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + css }} />

        <header className="dl-topbar">
          <div className="dl-topbar-l">
            {!index && (
              <Link href="/lab" className="dl-back" aria-label="Back to the lab index">
                <PeaksMark size={20} /> <span>Lab</span>
              </Link>
            )}
            <div>
              <h1 className="dl-title v2-display">{title}</h1>
              {lede && <p className="dl-lede">{lede}</p>}
            </div>
          </div>
          <div className="dl-topbar-r">
            <button type="button" className={`dl-pill${reduced ? " on" : ""}`} onClick={() => setReduced((r) => !r)}>
              {reduced ? "Reduced motion: on" : "Reduced motion: off"}
            </button>
            <Seg
              options={[{ v: "light", label: "Light" }, { v: "dark", label: "Dark" }]}
              value={theme}
              onChange={setTheme}
            />
          </div>
        </header>

        <main className="dl-main">{children}</main>
      </div>
    </ReducedCtx.Provider>
  );
}

/* link card used on the index to reach each sub-route */
export function RouteLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <SpringPress as="a" className="dl-routelink" {...({ href } as object)}>
      <h3 className="v2-display">{title}</h3>
      <p>{desc}</p>
      <span className="dl-routelink-go">Open</span>
    </SpringPress>
  );
}

/* ------------------------------------------------------------------ *
 *  Base CSS: v2 tokens (light + dark) namespaced under .delight, the
 *  common app surfaces demos reuse, the motion ease vars, the showcase
 *  chrome, and the two-tier reduced-motion contract.
 * ------------------------------------------------------------------ */
export const BASE_CSS = `
.delight {
  --bg:#E7E1D3; --surface:#F6F2E8; --surface-2:#EEE8DA; --ink:#22271F; --ink-soft:#6E7268;
  --border:#E0D8C8; --sidebar:#295A47; --sidebar-ink:#EBF3EE; --sidebar-muted:#9DBDAC;
  --primary:#1F6F57; --primary-ink:#FFFFFF; --blue:#3F7CA6; --cinnamon:#C26B39; --heart:#DD5043;
  --r-card:18px; --r-input:12px;
  --hp-body:#C98A5A; --hp-head:#D9A36F; --hp-wing:#A96B3C; --hp-crest:#C26B39; --hp-tip:#2C2A28; --hp-beak:#3A3632; --hp-eye:#2C2A28;
  --ease-spring:cubic-bezier(.34,1.5,.64,1); --ease-pop:cubic-bezier(.34,1.56,.64,1);
  --dur-fast:120ms; --dur-soft:300ms; --dur-amb:1200ms;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,sans-serif; -webkit-font-smoothing:antialiased;
}
.delight.dark {
  --bg:#10171A; --surface:#18211D; --surface-2:#1E2823; --ink:#E8EDE7; --ink-soft:#9DA8A0;
  --border:#28332D; --sidebar:#16271F; --sidebar-ink:#E8EDE7; --sidebar-muted:#8FA89A;
  --primary:#34B083; --primary-ink:#08120D; --blue:#5C9BC4; --cinnamon:#D98A4F; --heart:#F0675A;
}
.delight * { box-sizing:border-box; }
.v2-display { font-family:var(--font-display),Georgia,serif; letter-spacing:-.01em; }

/* topbar / chrome */
.dl-topbar { position:sticky; top:0; z-index:40; display:flex; align-items:center; justify-content:space-between; gap:18px;
  padding:16px 28px; background:color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter:blur(8px);
  border-bottom:1px solid var(--border); flex-wrap:wrap; }
.dl-topbar-l { display:flex; align-items:center; gap:16px; }
.dl-back { display:inline-flex; align-items:center; gap:7px; color:var(--ink-soft); text-decoration:none; font-size:12.5px; font-weight:600;
  padding:7px 11px; border-radius:999px; border:1px solid var(--border); background:var(--surface); }
.dl-back:hover { color:var(--ink); }
.dl-title { font-size:22px; margin:0; line-height:1.1; }
.dl-lede { margin:3px 0 0; font-size:13px; color:var(--ink-soft); max-width:60ch; }
.dl-topbar-r { display:flex; align-items:center; gap:10px; }
.dl-pill { border:1px solid var(--border); background:var(--surface); color:var(--ink-soft); font:inherit; font-size:12px; font-weight:600;
  padding:7px 12px; border-radius:999px; cursor:pointer; }
.dl-pill.on { color:var(--cinnamon); border-color:color-mix(in srgb, var(--cinnamon) 40%, var(--border)); background:color-mix(in srgb, var(--cinnamon) 10%, var(--surface)); }
.dl-seg { display:flex; gap:3px; background:var(--surface-2); border-radius:10px; padding:3px; }
.dl-seg button { position:relative; display:flex; align-items:center; gap:5px; border:0; background:transparent; cursor:pointer;
  font:inherit; font-size:12.5px; font-weight:600; color:var(--ink-soft); padding:6px 12px; border-radius:8px; }
.dl-seg button.on { color:var(--ink); }
.dl-seg-thumb { position:absolute; inset:0; background:var(--surface); border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.14); z-index:0; }
.dl-seg-label { position:relative; z-index:1; display:inline-flex; align-items:center; gap:5px; }

.dl-main { max-width:1180px; margin:0 auto; padding:30px 28px 90px; }
.dl-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
.dl-demo { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); overflow:hidden;
  box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); display:flex; flex-direction:column; }
.dl-span-2 { grid-column:span 2; } .dl-span-3 { grid-column:span 3; }
.dl-demo-head { padding:14px 16px 0; }
.dl-demo-head h3 { font-size:13.5px; font-weight:700; margin:0; }
.dl-demo-head p { font-size:12px; color:var(--ink-soft); margin:4px 0 0; line-height:1.45; }
.dl-demo-stage { padding:16px; flex:1; display:flex; align-items:center; justify-content:center; min-height:150px; }
.dl-demo-stage.flush { padding:0; }

.dl-routelink { display:block; text-align:left; text-decoration:none; color:inherit; cursor:pointer;
  background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); padding:18px 18px 16px;
  box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }
.dl-routelink h3 { font-size:17px; margin:0 0 5px; }
.dl-routelink p { font-size:13px; color:var(--ink-soft); margin:0 0 12px; line-height:1.5; }
.dl-routelink-go { font-size:12.5px; font-weight:700; color:var(--primary); }

/* common app surfaces reused by demos (copied from v2, scoped to .delight) */
.delight .v2-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }
.delight .v2-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; padding:0 20px; border-radius:999px; border:0; cursor:pointer; font:inherit; font-weight:600; font-size:14px; }
.delight .v2-btn-primary { background:var(--primary); color:var(--primary-ink); box-shadow:0 5px 13px -12px var(--primary); }
.delight .v2-btn-ghost { background:var(--surface); color:var(--ink); border:1px solid var(--border); }
.delight .v2-btn-soft { background:color-mix(in srgb, var(--cinnamon) 14%, var(--surface)); color:var(--cinnamon); }
.delight .v2-btn.sm { height:34px; padding:0 16px; font-size:13px; }
.delight .v2-input { width:100%; height:46px; border-radius:var(--r-input); border:1px solid var(--border); background:var(--surface); padding:0 14px; color:var(--ink); font:inherit; font-size:14.5px; }
.delight .v2-input::placeholder { color:color-mix(in srgb, var(--ink-soft) 75%, transparent); }
.delight .v2-chip { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:500; color:var(--ink-soft); padding:7px 11px; border-radius:999px; cursor:pointer; }
.delight .v2-chip:hover { background:var(--surface-2); color:var(--ink); }
.delight .v2-tag-soft { padding:5px 12px; border-radius:999px; font-size:12px; font-weight:600; background:color-mix(in srgb, var(--primary) 11%, transparent); color:var(--primary); }

/* heart colour is INSTANT (never fades through dark); only transform animates */
.delight .heartwrap svg { transition:transform .15s var(--ease-pop); }
.delight .liked .heartwrap svg { color:var(--heart); fill:var(--heart); }

/* swatch helpers used on the index */
.dl-swatch-row { display:flex; gap:14px; align-items:center; flex-wrap:wrap; justify-content:center; }
.dl-swatch-card { width:120px; height:78px; border-radius:14px; background:var(--surface-2); border:1px solid var(--border); display:grid; place-items:center; color:var(--ink-soft); font-size:12px; }

/* ---- reduced-motion contract (driven by the in-app toggle in this preview, not the OS) ---- */
.delight.reduce .ambient, .delight.reduce .parallax, .delight.reduce .drift { animation:none !important; transition:none !important; }

/* CSS-driven entrances (SSR-safe; no inline opacity/transform in the markup) */
.dl-fadein { animation: dlrise var(--dur-soft) var(--ease-spring) both; }
.dl-stagger > * { animation: dlrise var(--dur-soft) var(--ease-spring) both; }
.dl-stagger > *:nth-child(1){ animation-delay:calc(var(--sgap,.05s)*0); }
.dl-stagger > *:nth-child(2){ animation-delay:calc(var(--sgap,.05s)*1); }
.dl-stagger > *:nth-child(3){ animation-delay:calc(var(--sgap,.05s)*2); }
.dl-stagger > *:nth-child(4){ animation-delay:calc(var(--sgap,.05s)*3); }
.dl-stagger > *:nth-child(5){ animation-delay:calc(var(--sgap,.05s)*4); }
.dl-stagger > *:nth-child(6){ animation-delay:calc(var(--sgap,.05s)*5); }
.dl-stagger > *:nth-child(7){ animation-delay:calc(var(--sgap,.05s)*6); }
.dl-stagger > *:nth-child(8){ animation-delay:calc(var(--sgap,.05s)*7); }
@keyframes dlrise { from { opacity:0; transform:translateY(var(--rise,10px)); } to { opacity:1; transform:none; } }
.delight.reduce .dl-fadein, .delight.reduce .dl-stagger > * { animation:none !important; }

@media (max-width:960px){ .dl-grid{ grid-template-columns:repeat(2,1fr);} .dl-span-3,.dl-span-2{ grid-column:span 2;} }
@media (max-width:640px){ .dl-grid{ grid-template-columns:1fr;} .dl-span-3,.dl-span-2{ grid-column:span 1;} }
`;
