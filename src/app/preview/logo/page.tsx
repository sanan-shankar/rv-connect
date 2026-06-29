/* Logo lab: three-peaks (Bodikonda, Middle Peak, Rishikonda) as a first-pass trace.
   Outline vs solid-white fill, on dark / light / photo. Swap in a faithful trace once
   bodi-middle-rishi.png lands in /Inspiration. Static, self-contained, no app imports. */

const RIDGE =
  "M3 33 C8 33 11 29 16 18 C19.5 11 23.5 14.5 27.5 22 C30.5 27.5 34 15 38 8 C41.5 2.5 45.5 9 49.5 17 C52.5 22.5 55 13.5 58 15.5 C62 18 65.5 28 69 33";
const SILHOUETTE = RIDGE + " L69 41 L3 41 Z";

function Peaks({
  variant,
  color = "#fff",
  size = 64,
}: {
  variant: "outline" | "fill" | "gradient";
  color?: string;
  size?: number;
}) {
  const h = size * (44 / 72);
  return (
    <svg width={size} height={h} viewBox="0 0 72 44" fill="none" aria-hidden>
      {variant === "gradient" && (
        <defs>
          <linearGradient id="pk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.62" />
          </linearGradient>
        </defs>
      )}
      {variant === "outline" ? (
        <path d={RIDGE} stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={SILHOUETTE} fill={variant === "gradient" ? "url(#pk)" : color} />
      )}
    </svg>
  );
}

function Lockup({
  variant,
  color,
  sub,
}: {
  variant: "outline" | "fill" | "gradient";
  color: string;
  sub: string;
}) {
  return (
    <div className="lk">
      <Peaks variant={variant} color={color} size={58} />
      <div className="lk-words" style={{ color }}>
        <span className="lk-title">Rishi Valley</span>
        <span className="lk-sub" style={{ color: sub }}>
          Alumni
        </span>
      </div>
    </div>
  );
}

export default function LogoLab() {
  return (
    <div className="lg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.lg { --green:#235C49; --leaf:#1F8A4C; --bg:#EBE6D7; --ink:#23241E; --soft:#6B6A5C;
  min-height:100vh; background:var(--bg); color:var(--ink); padding:40px 48px 90px;
  font-family:var(--font-body),system-ui,sans-serif; }
.lg h1 { font-family:var(--font-display),serif; font-size:30px; letter-spacing:-.02em; margin:0 0 6px; }
.lg .lede { color:var(--soft); font-size:14.5px; margin:0 0 8px; max-width:74ch; line-height:1.6; }
.lg .note { color:var(--soft); font-size:13px; margin:0 0 30px; max-width:74ch; line-height:1.6; }
.lg .note b { color:var(--ink); }
.lg h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:34px 0 14px; }
.row { display:flex; gap:18px; flex-wrap:wrap; }
.sw { width:236px; height:150px; border-radius:18px; display:grid; place-items:center; position:relative; overflow:hidden;
  border:1px solid rgba(0,0,0,.06); }
.sw.dark { background:var(--green); }
.sw.light { background:#FAF8F3; }
.sw.leaf { background:var(--leaf); }
.sw.photo { background:#234; }
.sw.photo::before { content:""; position:absolute; inset:0; background:url(/images/landing.jpeg) center/cover; }
.sw.photo::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg, rgba(20,30,22,.34), rgba(20,30,22,.12)); }
.sw .inner { position:relative; z-index:1; display:grid; place-items:center; gap:9px; }
.sw .cap { position:absolute; bottom:8px; left:0; right:0; text-align:center; font-size:10.5px; letter-spacing:.06em;
  color:rgba(255,255,255,.7); z-index:1; }
.sw.light .cap { color:var(--soft); }
.lk { display:flex; align-items:center; gap:12px; }
.lk-words { display:flex; flex-direction:column; line-height:1; }
.lk-title { font-family:var(--font-display),serif; font-size:21px; letter-spacing:-.01em; }
.lk-sub { font-size:10px; letter-spacing:.22em; text-transform:uppercase; margin-top:5px; }
`,
        }}
      />
      <h1>Logo lab: the three peaks</h1>
      <p className="lede">
        Bodikonda, Middle Peak, Rishikonda (left to right). This is a first-pass trace so you can judge
        the two styles you asked for: the outline, and the same shape filled solid white. Tunable.
      </p>
      <p className="note">
        For a faithful trace of the real skyline, drop your photo at{" "}
        <b>/Inspiration/bodi-middle-rishi.png</b> and tell me. I will re-trace the actual ridgeline into
        whichever of these two styles you pick.
      </p>

      <h2>Outline trace</h2>
      <div className="row">
        <div className="sw dark"><div className="inner"><Peaks variant="outline" color="#fff" size={104} /></div><span className="cap">on sidebar green</span></div>
        <div className="sw light"><div className="inner"><Peaks variant="outline" color="#235C49" size={104} /></div><span className="cap">on light</span></div>
        <div className="sw photo"><div className="inner"><Peaks variant="outline" color="#fff" size={104} /></div><span className="cap">on the valley photo</span></div>
      </div>

      <h2>Solid fill (white)</h2>
      <div className="row">
        <div className="sw dark"><div className="inner"><Peaks variant="fill" color="#fff" size={104} /></div><span className="cap">white on sidebar green</span></div>
        <div className="sw photo"><div className="inner"><Peaks variant="fill" color="#fff" size={104} /></div><span className="cap">white on the valley photo</span></div>
        <div className="sw light"><div className="inner"><Peaks variant="fill" color="#235C49" size={104} /></div><span className="cap">green on light</span></div>
      </div>

      <h2>Solid fill with a soft gradient</h2>
      <div className="row">
        <div className="sw dark"><div className="inner"><Peaks variant="gradient" size={104} /></div><span className="cap">gradient white on green</span></div>
        <div className="sw photo"><div className="inner"><Peaks variant="gradient" size={104} /></div><span className="cap">gradient white on photo</span></div>
      </div>

      <h2>Standalone lockup (mark + wordmark)</h2>
      <div className="row">
        <div className="sw dark" style={{ width: 300 }}><div className="inner"><Lockup variant="fill" color="#fff" sub="rgba(255,255,255,.62)" /></div><span className="cap">filled, white</span></div>
        <div className="sw photo" style={{ width: 300 }}><div className="inner"><Lockup variant="outline" color="#fff" sub="rgba(255,255,255,.7)" /></div><span className="cap">outline, white on photo</span></div>
        <div className="sw light" style={{ width: 300 }}><div className="inner"><Lockup variant="fill" color="#235C49" sub="#6B6A5C" /></div><span className="cap">filled green on light</span></div>
      </div>
    </div>
  );
}
