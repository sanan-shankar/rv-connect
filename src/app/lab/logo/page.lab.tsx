import { requireLabAdmin } from "@/app/lab/_gate";
import { PeaksMark } from "@/components/layout/peaks-mark";

function Wordmark() {
  return (
    <div className="lk-words">
      <span className="lk-title">Rishi Valley</span>
      <span className="lk-sub">Alumni</span>
    </div>
  );
}

function Lockup({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="lk">
      <PeaksMark size={38} />
      <div className={onDark ? "lk-on-dark" : ""}>
        <Wordmark />
      </div>
    </div>
  );
}

export default async function LogoLab() {
  await requireLabAdmin();
  return (
    <div className="lg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.lg { --green:#173f35; --leaf:#2f6a56; --bg:#ebe6d7; --ink:#23241e; --soft:#6b6a5c;
  min-height:100vh; background:var(--bg); color:var(--ink); padding:40px 48px 90px;
  font-family:var(--font-body),system-ui,sans-serif; }
.lg h1 { font-family:var(--font-display),serif; font-size:30px; letter-spacing:-.02em; margin:0 0 6px; }
.lg .lede { color:var(--soft); font-size:14.5px; margin:0 0 30px; max-width:74ch; line-height:1.6; }
.lg h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:34px 0 14px; }
.row { display:flex; gap:18px; flex-wrap:wrap; }
.sw { width:300px; height:170px; border-radius:18px; display:grid; place-items:center; position:relative; overflow:hidden;
  border:1px solid rgba(0,0,0,.06); }
.sw.dark { background:var(--green); }
.sw.light { background:#faf8f3; }
.sw.photo { background:#234; }
.sw.photo::before { content:""; position:absolute; inset:0; background:url(/images/landing.jpeg) center/cover; }
.sw.photo::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg, rgba(20,30,22,.36), rgba(20,30,22,.1)); }
.sw .inner { position:relative; z-index:1; display:grid; place-items:center; gap:9px; }
.sw .cap { position:absolute; bottom:8px; left:0; right:0; text-align:center; font-size:10.5px; letter-spacing:.06em;
  color:rgba(255,255,255,.7); z-index:1; }
.sw.light .cap { color:var(--soft); }
.lk { display:flex; align-items:center; gap:12px; }
.lk-words { display:flex; flex-direction:column; line-height:1; }
.lk-title { font-family:var(--font-display),serif; font-size:21px; letter-spacing:-.01em; color:var(--ink); }
.lk-sub { font-size:10px; letter-spacing:.22em; text-transform:uppercase; margin-top:5px; color:var(--soft); }
.lk-on-dark .lk-title { color:#fff; }
.lk-on-dark .lk-sub { color:rgba(255,255,255,.68); }
`,
        }}
      />
      <h1>Logo preview: the three peaks</h1>
      <p className="lede">
        The selected two-plane mark for Bodi, Middle, and Rishi, shown as the standalone mark and as the
        site lockup across the main contexts where it appears.
      </p>

      <h2>Standalone mark</h2>
      <div className="row">
        <div className="sw dark"><div className="inner"><PeaksMark size={58} /></div><span className="cap">on sidebar green</span></div>
        <div className="sw light"><div className="inner"><PeaksMark size={58} /></div><span className="cap">on light</span></div>
        <div className="sw photo"><div className="inner"><PeaksMark size={58} /></div><span className="cap">on the valley photo</span></div>
      </div>

      <h2>Lockup</h2>
      <div className="row">
        <div className="sw dark"><div className="inner"><Lockup onDark /></div><span className="cap">sidebar / hero</span></div>
        <div className="sw light"><div className="inner"><Lockup /></div><span className="cap">nav / cards</span></div>
        <div className="sw photo"><div className="inner"><Lockup onDark /></div><span className="cap">photo overlay</span></div>
      </div>
    </div>
  );
}
