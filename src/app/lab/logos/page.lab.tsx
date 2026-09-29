import { requireLabAdmin } from "@/app/lab/_gate";
import { PeaksMark } from "@/components/layout/peaks-mark";

/* Logo lab: a few non-bird marks to choose from. Static, self-contained. */

function Wordmark() {
  return (
    <div className="lg-word">
      <span className="lg-title">Rishi Valley</span>
      <span className="lg-sub">Alumni</span>
    </div>
  );
}

function Tile({ name, note, children }: { name: string; note: string; children: React.ReactNode }) {
  return (
    <div className="lg-tile">
      <div className="lg-stage">{children}</div>
      <div className="lg-meta">
        <b>{name}</b>
        <span>{note}</span>
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
.lg { --bg:#ECEAE1; --surface:#FBFBF8; --ink:#1E2420; --ink-soft:#6B726A; --border:#E4E1D6;
  --green:#2F6A56; --cinnamon:#C26B39;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,sans-serif; padding:42px 48px 80px; }
.lg h1 { font-family:var(--font-display),serif; font-size:30px; letter-spacing:-.02em; margin:0 0 6px; }
.lg .lede { color:var(--ink-soft); font-size:14.5px; margin:0 0 32px; }
.lg-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; max-width:1080px; }
.lg-tile { background:var(--surface); border:1px solid var(--border); border-radius:18px; overflow:hidden;
  box-shadow:0 1px 2px rgba(0,0,0,.04), 0 18px 40px -30px rgba(0,0,0,.4); }
.lg-stage { height:150px; display:grid; place-items:center; }
.lg-meta { border-top:1px solid var(--border); padding:12px 16px; }
.lg-meta b { display:block; font-size:13.5px; }
.lg-meta span { font-size:12px; color:var(--ink-soft); }
.lg-word { display:flex; flex-direction:column; align-items:flex-start; line-height:1; }
.lg-title { font-family:var(--font-display),serif; font-size:23px; letter-spacing:-.015em; color:var(--ink); }
.lg-sub { font-size:10.5px; letter-spacing:.24em; text-transform:uppercase; color:var(--ink-soft); margin-top:5px; }
.lg-row { display:flex; align-items:center; gap:13px; }
.lg-mark { display:grid; place-items:center; width:46px; height:46px; border-radius:14px;
  background:var(--green); color:#FBFBF8; }
.lg-mark.wide { width:76px; }
.lg-mark.outline { background:transparent; border:1.5px solid var(--green); color:var(--green); }
.lg-mono { font-family:var(--font-display),serif; font-size:21px; font-weight:700; }
`,
        }}
      />
      <h1>Logo options</h1>
      <p className="lede">
        Since everyone is a bird now, the mark probably should not be. A few quieter directions.
        Pick one (or mix), and I will refine it.
      </p>

      <div className="lg-grid">
        <Tile name="Wordmark only" note="No symbol. Calm, literary, confident.">
          <Wordmark />
        </Tile>

        <Tile name="Monogram" note="RV lockup in a squircle.">
          <div className="lg-row">
            <span className="lg-mark">
              <span className="lg-mono">RV</span>
            </span>
            <Wordmark />
          </div>
        </Tile>

        <Tile name="Valley + hills" note="The place itself: Rishi Konda's ridgeline.">
          <div className="lg-row">
            <span className="lg-mark wide">
              <PeaksMark size={18} />
            </span>
            <Wordmark />
          </div>
        </Tile>

        <Tile name="Feather" note="A subtle nod to the birds, not a whole bird.">
          <div className="lg-row">
            <span className="lg-mark">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M25 6 C13 6 8 16 7 24 L9 26 C18 25 27 19 27 8 C27 7 26 6 25 6 Z" fill="currentColor" />
                <path d="M9 26 L19 16" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <Wordmark />
          </div>
        </Tile>

        <Tile name="Leaf / banyan" note="Growth and shelter; the tree everyone sat under.">
          <div className="lg-row">
            <span className="lg-mark">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M26 6 C12 6 6 14 6 26 C18 26 26 18 26 6 Z" fill="currentColor" />
                <path d="M10 22 C14 18 18 14 23 9" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <Wordmark />
          </div>
        </Tile>

        <Tile name="Monogram, outline" note="Lighter, more editorial than the filled tile.">
          <div className="lg-row">
            <span className="lg-mark outline">
              <span className="lg-mono">RV</span>
            </span>
            <Wordmark />
          </div>
        </Tile>
      </div>
    </div>
  );
}
