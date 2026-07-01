"use client";

/* ------------------------------------------------------------------ *
 *  Delight Labs — the hoopoe mascot control room.
 *  Drives the real <Hoopoe> rig + controller so the owner can judge
 *  every action, expression, gaze, cover/peek, crest fold, and the
 *  tail-or-no-tail question.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { type Expression, type HoopoeApi } from "@/components/mascot/hoopoe-kit";

const EXPRESSIONS: Expression[] = ["content", "curious", "happy", "surprise", "sad", "sleepy", "love", "alert", "proud", "worried"];

export default function HoopoeLab() {
  const [dark, setDark] = useState(false);
  return (
    <div className={`hl ${dark ? "hl-dark" : ""}`}>
      <style>{CSS}</style>
      <header className="hl-top">
        <Link href="/preview/delight" className="hl-back">‹ Delight</Link>
        <div className="hl-title">
          <h1>The hoopoe mascot</h1>
          <p>One rigged baby hoopoe, one queued controller. Walk, fly, point, gaze, emote, fold the crest, celebrate. Drive it below.</p>
        </div>
        <div className="hl-toprail">
          <button className={`hl-pill ${dark ? "on" : ""}`} onClick={() => setDark((d) => !d)}>
            {dark ? "Dark" : "Light"}
          </button>
        </div>
      </header>

      <main className="hl-main">
        <Stage />
        <ProportionStudio />
        <TailCompare />
        <Matrix />
        <SequenceBuilder />
        <PasswordGaze />
        <Sizes />
      </main>
    </div>
  );
}

/* ---------------- Stage + control rail ---------------- */
function Stage() {
  const { ref: birdRef, ...h } = useHoopoe();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState("rest");
  const [tailOn, setTailOn] = useState(false);
  const targetRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setBusy(h.isBusy()), 200);
    return () => clearInterval(t);
  }, [h]);

  const doExpr = (e: Expression) => { setLast(e); h.express(e); };

  function flyToClick(ev: React.MouseEvent) {
    if (ev.target instanceof HTMLElement && ev.target.closest(".hl-pointtarget")) return;
    setMarker({ x: ev.clientX, y: ev.clientY });
    setLast("flyTo");
    h.flyTo({ x: ev.clientX, y: ev.clientY });
  }

  return (
    <section className="hl-card hl-stagecard">
      <div className="hl-stage" ref={stageRef} onClick={flyToClick}>
        <div className="hl-ground" />
        <button
          ref={targetRef}
          className="hl-pointtarget"
          onClick={(e) => { e.stopPropagation(); setLast("point"); h.point(targetRef.current, { label: "this" }); }}
          aria-label="Point at this target"
          title="point target"
        >
          ✿
        </button>
        <Hoopoe ref={birdRef} size={210} tail={tailOn} />
        {marker && <span className="hl-marker" style={{ left: marker.x, top: marker.y }} />}
      </div>
      <div className="hl-readout">
        <span className={`hl-dot ${busy ? "busy" : ""}`} /> {busy ? "busy" : "idle"} <span className="hl-sep">·</span> last: {last}
        <button className={`hl-tailtoggle ${tailOn ? "on" : ""}`} onClick={() => setTailOn((t) => !t)}>tail: {tailOn ? "on" : "off"}</button>
      </div>

      <div className="hl-rail">
        <Group label="Expressions">
          {EXPRESSIONS.map((e) => (
            <button key={e} className="hl-btn" onClick={() => doExpr(e)}>{e}</button>
          ))}
        </Group>

        <Group label="Gestures">
          <button className="hl-btn" onClick={() => { setLast("nod"); h.nod(2); }}>nod</button>
          <button className="hl-btn" onClick={() => { setLast("shake"); h.shake(2); }}>shake</button>
          <button className="hl-btn" onClick={() => { setLast("wave"); h.wave(2); }}>wave</button>
          <button className="hl-btn" onClick={() => { setLast("blink"); h.blinkOnce(true); }}>blink</button>
          <button className="hl-btn" onClick={() => { setLast("point left"); h.point("left"); }}>point left</button>
          <button className="hl-btn" onClick={() => { setLast("point right"); h.point("right"); }}>point right</button>
        </Group>

        <Group label="Crest">
          <button className="hl-btn" onClick={() => { setLast("crest open"); h.crest(true); }}>open</button>
          <button className="hl-btn" onClick={() => { setLast("crest fold"); h.crest(false); }}>fold / close</button>
          <button className="hl-btn" onClick={() => { setLast("crest flick"); h.crestFlick(); }}>flick</button>
        </Group>

        <Group label="Locomotion (click the stage to fly there)">
          <button className="hl-btn" onClick={() => { setLast("walk L"); h.walk(2, "left"); }}>walk ‹ 2</button>
          <button className="hl-btn" onClick={() => { setLast("walk R"); h.walk(2, "right"); }}>walk 2 ›</button>
          <button className="hl-btn" onClick={() => { setLast("walk R4"); h.walk(4, "right"); }}>walk 4 ›</button>
          <button className="hl-btn" onClick={() => { setLast("hop"); h.hop(2, "right"); }}>hop</button>
          <button className="hl-btn" onClick={() => { setLast("turn L"); h.turn("left"); }}>turn ‹</button>
          <button className="hl-btn" onClick={() => { setLast("turn R"); h.turn("right"); }}>turn ›</button>
          <button className="hl-btn" onClick={() => { setLast("front"); h.turn(0); }}>front on</button>
        </Group>

        <Group label="Celebrate">
          <button className="hl-btn" onClick={() => { setLast("celebrate 1"); h.celebrate(1); }}>level 1</button>
          <button className="hl-btn hl-btn-leaf" onClick={() => { setLast("celebrate 2"); h.celebrate(2); }}>level 2</button>
          <button className="hl-btn hl-btn-leaf" onClick={() => { setLast("celebrate 3"); h.celebrate(3); }}>level 3</button>
        </Group>

        <Group label="Login behaviors / control">
          <button className="hl-btn" onClick={() => { setLast("cover"); h.coverEyes(); }}>cover eyes</button>
          <button className="hl-btn" onClick={() => { setLast("peek"); h.peek(); }}>peek</button>
          <button className="hl-btn" onClick={() => { setLast("gaze L"); h.gaze(-0.9); }}>gaze ‹</button>
          <button className="hl-btn" onClick={() => { setLast("gaze R"); h.gaze(0.9); }}>gaze ›</button>
          <button className="hl-btn" onClick={() => { setLast("rest"); h.rest(); }}>rest</button>
          <button className="hl-btn hl-btn-warn" onClick={() => { setLast("cancel"); h.cancel(); }}>cancel</button>
        </Group>
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hl-group">
      <span className="hl-grouplabel">{label}</span>
      <div className="hl-groupbtns">{children}</div>
    </div>
  );
}

/* ---------------- Proportion studio (head + eye tuner) ---------------- */
function StudioSlider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="hl-srow">
      <span className="hl-srowtop"><span>{label}</span><b>{fmt(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

type Geom = { headScale: number; eyeScale: number; eyeY: number; eyeSpread: number; billLength: number };
type SavedPreset = Geom & { name: string };
const STUDIO_KEY = "hoopoe-proportions-v1";

function ProportionStudio() {
  const [headScale, setHeadScale] = useState(1);
  const [eyeScale, setEyeScale] = useState(1);
  const [eyeY, setEyeY] = useState(0);
  const [eyeSpread, setEyeSpread] = useState(0);
  const [billLength, setBillLength] = useState(1);
  const [saved, setSaved] = useState<SavedPreset[]>([]);

  useEffect(() => {
    // load once on mount (localStorage is client-only, so this can't be a render-time initializer)
    try {
      const raw = localStorage.getItem(STUDIO_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const persist = (next: SavedPreset[]) => {
    setSaved(next);
    try { localStorage.setItem(STUDIO_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const geom: Geom = { headScale, eyeScale, eyeY, eyeSpread, billLength };
  const apply = (g: Partial<Geom>) => {
    setHeadScale(g.headScale ?? 1); setEyeScale(g.eyeScale ?? 1); setEyeY(g.eyeY ?? 0);
    setEyeSpread(g.eyeSpread ?? 0); setBillLength(g.billLength ?? 1);
  };
  const saveCurrent = () => {
    if (saved.length >= 16) return;
    persist([...saved, { name: `Slot ${saved.length + 1}`, ...geom }]);
  };
  const remove = (i: number) => persist(saved.filter((_, j) => j !== i));

  return (
    <section className="hl-card">
      <h2 className="hl-h2">Proportion studio</h2>
      <p className="hl-note">Dial the head, eyes, and beak, then judge it at the small sizes it ships at (bottom row). Save the ones you like as slots (stored in this browser, up to 16) and click a saved bird to load it back, so you can swap between them and compare. Tell me your favourite&apos;s numbers and I will bake them in.</p>
      <div className="hl-studio">
        <div className="hl-studiopreview">
          <Hoopoe size={220} idle {...geom} />
        </div>
        <div className="hl-studiocontrols">
          <StudioSlider label="Head size" value={headScale} min={0.84} max={1.08} step={0.01} onChange={setHeadScale} fmt={(v) => `${Math.round(v * 100)}%`} />
          <StudioSlider label="Eye size" value={eyeScale} min={0.8} max={1.25} step={0.01} onChange={setEyeScale} fmt={(v) => `${Math.round(v * 100)}%`} />
          <StudioSlider label="Eye height (− = higher, less forehead)" value={eyeY} min={-8} max={4} step={0.5} onChange={setEyeY} fmt={(v) => v.toFixed(1)} />
          <StudioSlider label="Eye spacing" value={eyeSpread} min={-3} max={5} step={0.5} onChange={setEyeSpread} fmt={(v) => (v >= 0 ? `+${v}` : `${v}`)} />
          <StudioSlider label="Beak length" value={billLength} min={0.7} max={1.8} step={0.02} onChange={setBillLength} fmt={(v) => `${Math.round(v * 100)}%`} />
          <div className="hl-studiopresets">
            <button className="hl-btn hl-btn-sm" onClick={() => apply({})}>current</button>
            <button className="hl-btn hl-btn-sm" onClick={() => apply({ headScale: 0.93, eyeScale: 1.04, eyeY: -2 })}>smaller head</button>
            <button className="hl-btn hl-btn-sm" onClick={() => apply({ headScale: 0.88, eyeScale: 1.1, eyeY: -3, eyeSpread: -0.5 })}>smaller + bigger eyes</button>
          </div>
          <pre className="hl-code">{`headScale=${headScale}  eyeScale=${eyeScale}  billLength=${billLength}\neyeY=${eyeY}  eyeSpread=${eyeSpread}`}</pre>
        </div>
      </div>

      <div className="hl-slotswrap">
        <div className="hl-slotshead">
          <span className="hl-grouplabel">Saved slots ({saved.length}/16)</span>
          <button className="hl-btn hl-btn-sm hl-btn-leaf" onClick={saveCurrent} disabled={saved.length >= 16}>+ Save current</button>
        </div>
        <div className="hl-slots">
          {saved.length === 0 && <span className="hl-note" style={{ margin: 0 }}>No saved slots yet. Dial something you like, then hit Save current.</span>}
          {saved.map((pst, i) => (
            <div key={i} className="hl-slot">
              <button className="hl-slotbird" onClick={() => apply(pst)} title={`Load: head ${Math.round(pst.headScale * 100)}% · eyes ${Math.round(pst.eyeScale * 100)}% · eyeY ${pst.eyeY} · spread ${pst.eyeSpread} · beak ${Math.round((pst.billLength ?? 1) * 100)}%`}>
                <Hoopoe size={64} idle={false} {...pst} />
              </button>
              <span className="hl-slotname">{pst.name}</span>
              <button className="hl-slotdel" onClick={() => remove(i)} aria-label={`Delete ${pst.name}`}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="hl-studiostrip">
        {[32, 44, 64, 88, 120].map((s) => (
          <div key={s} className="hl-studiocell"><Hoopoe size={s} idle={false} {...geom} /><span>{s}px</span></div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Tail or no tail ---------------- */
function TailCompare() {
  return (
    <section className="hl-card">
      <h2 className="hl-h2">Tail or no tail</h2>
      <p className="hl-note">At a small size the tail can read as clutter. Here is the bird with the stub tail and white band, and with just the legs. Pick the one you like.</p>
      <div className="hl-tailrow">
        <div className="hl-tailcell"><div className="hl-ground" /><Hoopoe size={150} tail /><span>with tail</span></div>
        <div className="hl-tailcell"><div className="hl-ground" /><Hoopoe size={150} tail={false} /><span>no tail (legs only)</span></div>
      </div>
      <div className="hl-tailrow hl-tailrow-sm">
        {[28, 40, 64].map((s) => (
          <div key={`t${s}`} className="hl-tailcell hl-tailcell-sm"><Hoopoe size={s} tail /><span>{s}px · tail</span></div>
        ))}
        {[28, 40, 64].map((s) => (
          <div key={`n${s}`} className="hl-tailcell hl-tailcell-sm"><Hoopoe size={s} tail={false} /><span>{s}px · none</span></div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Expression matrix ---------------- */
function Matrix() {
  return (
    <section className="hl-card">
      <h2 className="hl-h2">Expression matrix</h2>
      <p className="hl-note">Every expression is a chord of many parts moving together, not a single nudge. No mouth, no blush. Tap to replay.</p>
      <div className="hl-matrix">
        {EXPRESSIONS.map((e) => (
          <MatrixCell key={e} expression={e} />
        ))}
      </div>
    </section>
  );
}
function MatrixCell({ expression }: { expression: Expression }) {
  const ref = useRef<HoopoeApi>(null);
  return (
    <button className="hl-mcell" onClick={() => ref.current?.express(expression)}>
      <Hoopoe ref={ref} size={108} idle={false} onReady={(api) => api.express(expression)} />
      <span>{expression}</span>
    </button>
  );
}

/* ---------------- Sequence builder ---------------- */
type SeqStep = { verb: string; arg?: string };
const VERB_MENU = ["walk 2 right", "walk 2 left", "hop", "turn right", "turn left", "front on", "point left", "point right", "wave", "nod", "shake", "crest open", "crest fold", "crestFlick", "express happy", "express curious", "express surprise", "celebrate 2", "wait 400"];

function SequenceBuilder() {
  const { ref: birdRef, ...h } = useHoopoe();
  const [steps, setSteps] = useState<SeqStep[]>([
    { verb: "walk", arg: "2 right" },
    { verb: "point", arg: "right" },
    { verb: "express", arg: "happy" },
    { verb: "celebrate", arg: "2" },
  ]);
  const [running, setRunning] = useState(false);

  function add(item: string) {
    const [verb, ...rest] = item.split(" ");
    setSteps((s) => [...s, { verb, arg: rest.join(" ") || undefined }]);
  }
  function toCall(s: SeqStep): unknown[] {
    switch (s.verb) {
      case "walk": { const [n, d] = (s.arg || "2 right").split(" "); return ["walk", +n, d]; }
      case "hop": return ["hop", 2, "right"];
      case "turn": return ["turn", s.arg === "on" ? 0 : s.arg];
      case "front": return ["turn", 0];
      case "point": return ["point", s.arg];
      case "wave": return ["wave", 2];
      case "nod": return ["nod", 2];
      case "shake": return ["shake", 2];
      case "crest": return ["crest", s.arg === "open"];
      case "crestFlick": return ["crestFlick"];
      case "express": return ["express", s.arg];
      case "celebrate": return ["celebrate", +(s.arg || 2)];
      case "wait": return [{ wait: +(s.arg || 400) }];
      default: return ["crestFlick"];
    }
  }
  async function run() {
    setRunning(true);
    const seq = steps.map((s) => {
      const c = toCall(s);
      if (c.length === 1 && typeof c[0] === "object") return c[0];
      return c;
    });
    // @ts-expect-error spread of mixed step tuples
    await h.sequence(...seq);
    setRunning(false);
  }
  const code =
    "hoopoe.sequence(\n" +
    steps.map((s) => {
      const c = toCall(s);
      if (typeof c[0] === "object") return `  wait(${(c[0] as { wait: number }).wait}),`;
      return "  [" + c.map((x) => (typeof x === "string" ? `"${x}"` : x)).join(", ") + "],";
    }).join("\n") +
    "\n);";

  return (
    <section className="hl-card">
      <h2 className="hl-h2">Sequence builder</h2>
      <p className="hl-note">The owner&apos;s literal ask: walk, then fly here, then point, then react. Every verb is awaitable and queues.</p>
      <div className="hl-seqwrap">
        <div className="hl-seqcol">
          <div className="hl-seqlist">
            {steps.map((s, i) => (
              <span key={i} className="hl-chip">
                {s.verb}{s.arg ? ` ${s.arg}` : ""}
                <button aria-label={`Remove ${s.verb} step`} onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
            {steps.length === 0 && <span className="hl-note">Add steps from the menu.</span>}
          </div>
          <div className="hl-seqmenu">
            {VERB_MENU.map((m) => (
              <button key={m} className="hl-btn hl-btn-sm" onClick={() => add(m)}>+ {m}</button>
            ))}
          </div>
          <div className="hl-seqactions">
            <button className="hl-btn hl-btn-leaf" disabled={running} onClick={run}>{running ? "running..." : "Run sequence"}</button>
            <button className="hl-btn" onClick={() => setSteps([])}>clear</button>
          </div>
          <pre className="hl-code">{code}</pre>
        </div>
        <div className="hl-seqstage">
          <div className="hl-ground" />
          <Hoopoe ref={birdRef} size={150} />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Password / gaze demo (the acceptance test) ---------------- */
function PasswordGaze() {
  const { ref: birdRef, ...h } = useHoopoe();
  const [showPw, setShowPw] = useState(false);
  const [val, setVal] = useState("valleybird");

  useEffect(() => { if (showPw) h.peek(); else h.coverEyes(); }, [showPw, h]);
  // typing drives gaze by input length (-1..1) WHETHER the eyes are open or covered:
  // when covered, the head still tracks behind the wings.
  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setVal(v);
    h.gaze(Math.max(-1, Math.min(1, (v.length / 16) * 2 - 1)));
  }

  return (
    <section className="hl-card">
      <h2 className="hl-h2">Password and gaze</h2>
      <p className="hl-note">Wings cover the eyes while the password is hidden, and open to peek when revealed. The bird follows what you type either way: when covered, its head tracks behind the wings. Type with it hidden, then reveal and type again.</p>
      <div className="hl-pw">
        <Hoopoe ref={birdRef} size={140} />
        <div className="hl-pwfield">
          <input
            className="hl-input"
            type={showPw ? "text" : "password"}
            value={val}
            onChange={onType}
            aria-label="Password"
          />
          <button className="hl-eye" onClick={() => setShowPw((s) => !s)}>{showPw ? "hide" : "show"}</button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Size variants ---------------- */
function Sizes() {
  return (
    <section className="hl-card">
      <h2 className="hl-h2">Sizes and the icon variant</h2>
      <p className="hl-note">Reads as a baby hoopoe from a 28px chip to the login hero. The icon variant drops the legs and tail but keeps the four tells.</p>
      <div className="hl-sizes">
        {[28, 40, 64, 96, 160].map((s) => (
          <div key={s} className="hl-sizecell"><Hoopoe size={s} /><span>{s}px full</span></div>
        ))}
        {[40, 96].map((s) => (
          <div key={`i${s}`} className="hl-sizecell"><Hoopoe size={s} variant="icon" /><span>{s}px icon</span></div>
        ))}
      </div>
    </section>
  );
}

const CSS = `
.hl{--bg:#E7E1D3;--surface:#F6F2E8;--surface2:#EEE8DA;--ink:#22271F;--ink-soft:#6E7268;--border:#E0D8C8;--leaf:#1F8A4C;--cinnamon:#C26B39;--warn:#C24A3A;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font-body),system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.hl-dark{--bg:#10171A;--surface:#18211D;--surface2:#1E2823;--ink:#E8EDE7;--ink-soft:#9DA8A0;--border:#28332D;}
.hl *{box-sizing:border-box;}
.hl-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:16px 26px;
  background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);}
.hl-back{color:var(--ink-soft);text-decoration:none;font-weight:600;font-size:13px;padding:7px 11px;border:1px solid var(--border);border-radius:999px;background:var(--surface);}
.hl-title h1{font-family:var(--font-display),Georgia,serif;font-size:22px;margin:0;letter-spacing:-.01em;}
.hl-title p{margin:2px 0 0;font-size:13px;color:var(--ink-soft);max-width:64ch;}
.hl-toprail{margin-left:auto;display:flex;gap:8px;}
.hl-pill{border:1px solid var(--border);background:var(--surface);color:var(--ink-soft);font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:999px;cursor:pointer;}
.hl-pill.on{color:var(--cinnamon);border-color:color-mix(in srgb,var(--cinnamon) 40%,var(--border));background:color-mix(in srgb,var(--cinnamon) 10%,var(--surface));}
.hl-main{max-width:1080px;margin:0 auto;padding:26px 26px 90px;display:flex;flex-direction:column;gap:20px;}
.hl-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 24px 48px -34px rgba(0,0,0,.5);}
.hl-h2{font-family:var(--font-display),Georgia,serif;font-size:18px;margin:0 0 4px;}
.hl-note{font-size:12.5px;color:var(--ink-soft);margin:0 0 14px;line-height:1.5;}
.hl-stagecard{display:flex;flex-direction:column;}
.hl-stage{position:relative;height:300px;border-radius:14px;display:grid;place-items:center;overflow:hidden;cursor:crosshair;
  background:radial-gradient(120% 90% at 50% 18%,color-mix(in srgb,var(--cinnamon) 7%,var(--surface2)),var(--surface2));
  background-image:repeating-linear-gradient(transparent,transparent 27px,color-mix(in srgb,var(--ink) 5%,transparent) 28px);}
.hl-ground{position:absolute;left:8%;right:8%;bottom:54px;height:1px;background:color-mix(in srgb,var(--ink) 14%,transparent);}
.hl-pointtarget{position:absolute;right:42px;top:54px;width:34px;height:34px;border-radius:50%;border:1px dashed color-mix(in srgb,var(--cinnamon) 50%,var(--border));
  background:var(--surface);color:var(--cinnamon);font-size:16px;cursor:pointer;display:grid;place-items:center;z-index:3;}
.hl-marker{position:fixed;width:10px;height:10px;border-radius:50%;background:var(--cinnamon);transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 0 4px color-mix(in srgb,var(--cinnamon) 22%,transparent);}
.hl-readout{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink-soft);margin:10px 2px 4px;}
.hl-dot{width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--leaf) 70%,var(--surface));}
.hl-dot.busy{background:var(--cinnamon);}
.hl-sep{opacity:.5;}
.hl-tailtoggle{margin-left:auto;border:1px solid var(--border);background:var(--surface);color:var(--ink-soft);font:inherit;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:999px;cursor:pointer;}
.hl-tailtoggle.on{color:var(--cinnamon);border-color:color-mix(in srgb,var(--cinnamon) 40%,var(--border));}
.hl-rail{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
.hl-group{display:flex;flex-direction:column;gap:6px;}
.hl-grouplabel{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}
.hl-groupbtns{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.hl-btn{font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:7px 11px;cursor:pointer;text-transform:capitalize;}
.hl-btn:hover{background:var(--surface2);}
.hl-btn.on{color:var(--cinnamon);border-color:color-mix(in srgb,var(--cinnamon) 45%,var(--border));background:color-mix(in srgb,var(--cinnamon) 10%,var(--surface));}
.hl-btn-leaf{color:#fff;background:var(--leaf);border-color:transparent;}
.hl-btn-warn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 40%,var(--border));}
.hl-btn-sm{font-size:11.5px;padding:5px 9px;text-transform:none;}
.hl-matrix{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.hl-mcell{display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 4px 8px;cursor:pointer;font:inherit;font-size:11.5px;color:var(--ink-soft);text-transform:capitalize;}
.hl-mcell:hover{border-color:color-mix(in srgb,var(--cinnamon) 40%,var(--border));}
.hl-studio{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:stretch;}
.hl-studiopreview{position:relative;background:radial-gradient(120% 90% at 50% 24%,color-mix(in srgb,var(--cinnamon) 7%,var(--surface2)),var(--surface2));border:1px solid var(--border);border-radius:12px;min-height:270px;display:grid;place-items:center;}
.hl-studiocontrols{display:flex;flex-direction:column;gap:13px;}
.hl-srow{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--ink-soft);}
.hl-srowtop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
.hl-srowtop b{color:var(--cinnamon);font-variant-numeric:tabular-nums;}
.hl-srow input[type=range]{width:100%;accent-color:var(--cinnamon);cursor:pointer;}
.hl-studiopresets{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;}
.hl-studiostrip{display:flex;align-items:flex-end;gap:26px;margin-top:18px;padding-top:16px;border-top:1px solid var(--border);flex-wrap:wrap;}
.hl-studiocell{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--ink-soft);}
.hl-slotswrap{margin-top:18px;padding-top:16px;border-top:1px solid var(--border);}
.hl-slotshead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.hl-slots{display:flex;flex-wrap:wrap;gap:10px;}
.hl-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;}
.hl-slotbird{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:6px;cursor:pointer;line-height:0;transition:border-color .15s;}
.hl-slotbird:hover{border-color:color-mix(in srgb,var(--cinnamon) 55%,var(--border));}
.hl-slotname{font-size:10.5px;color:var(--ink-soft);}
.hl-slotdel{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--ink-soft);font-size:12px;line-height:1;cursor:pointer;display:grid;place-items:center;}
.hl-slotdel:hover{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 50%,var(--border));}
.hl-tailrow{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.hl-tailrow-sm{grid-template-columns:repeat(6,1fr);margin-top:14px;}
.hl-tailcell{position:relative;background:var(--surface2);border:1px solid var(--border);border-radius:12px;height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden;font-size:11.5px;color:var(--ink-soft);}
.hl-tailcell-sm{height:120px;font-size:10.5px;gap:4px;}
.hl-seqwrap{display:grid;grid-template-columns:1fr 280px;gap:18px;}
.hl-seqlist{display:flex;flex-wrap:wrap;gap:6px;min-height:34px;margin-bottom:10px;}
.hl-chip{display:inline-flex;align-items:center;gap:4px;background:color-mix(in srgb,var(--leaf) 10%,var(--surface));color:var(--leaf);border:1px solid color-mix(in srgb,var(--leaf) 25%,var(--border));border-radius:999px;padding:4px 5px 4px 11px;font-size:12px;font-weight:600;text-transform:capitalize;}
.hl-chip button{border:0;background:none;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;}
.hl-seqmenu{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;}
.hl-seqactions{display:flex;gap:8px;margin-bottom:12px;}
.hl-code{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:11.5px;line-height:1.5;color:var(--ink);overflow:auto;font-family:ui-monospace,Menlo,monospace;margin:0;}
.hl-seqstage{position:relative;background:var(--surface2);border:1px solid var(--border);border-radius:12px;display:grid;place-items:center;overflow:hidden;}
.hl-pw{display:flex;align-items:center;gap:22px;flex-wrap:wrap;justify-content:center;}
.hl-pwfield{position:relative;width:280px;max-width:100%;}
.hl-input{width:100%;height:46px;border-radius:12px;border:1px solid var(--border);background:var(--surface);padding:0 64px 0 14px;color:var(--ink);font:inherit;font-size:14.5px;}
.hl-eye{position:absolute;right:6px;top:6px;height:34px;padding:0 12px;border:0;background:var(--surface2);color:var(--ink-soft);border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;}
.hl-sizes{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap;}
.hl-sizecell{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--ink-soft);}
@media (max-width:760px){.hl-seqwrap{grid-template-columns:1fr;}.hl-studio{grid-template-columns:1fr;}.hl-matrix{grid-template-columns:repeat(3,1fr);}.hl-tailrow-sm{grid-template-columns:repeat(3,1fr);}}
`;
