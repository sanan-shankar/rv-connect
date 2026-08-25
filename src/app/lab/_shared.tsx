import {
  Bird,
} from "@phosphor-icons/react/dist/ssr";
import {
  Newspaper,
  Notebook,
  Users,
  Mail,
  CalendarDays,
  Info,
  Search,
  Heart,
  MessageCircle,
  Share2,
  Bell,
  Plus,
  MapPin,
  Settings,
  Image as ImageIcon,
  BarChart3,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design tokens — three distinct directions                          */
/* ------------------------------------------------------------------ */

export type DirKey = "grove" | "almanac" | "canopy";

export interface Tokens {
  key: DirKey;
  label: string;
  blurb: string;
  vars: Record<string, string>;
  flags: {
    ambient?: boolean;
    darkside?: boolean;
    editorial?: boolean;
    imageforward?: boolean;
  };
}

export const DIRECTIONS: Record<DirKey, Tokens> = {
  grove: {
    key: "grove",
    label: "Grove",
    blurb: "Ambient valley, done right — atmosphere at the edges, solid readable cards, calm forest green.",
    flags: { ambient: true },
    vars: {
      "--bg": "#EAE3D4",
      "--surface": "#FBF8F1",
      "--surface-2": "#F3EEE2",
      "--ink": "#23241E",
      "--ink-soft": "#6E6A5C",
      "--border": "#E2DACA",
      "--primary": "#3E6B4A",
      "--primary-ink": "#FBF8F1",
      "--accent": "#B6552F",
      "--heart": "#D7503F",
      "--radius": "16px",
      "--sidebar-bg": "#F6F2E8",
      "--sidebar-fg": "#23241E",
      "--sidebar-muted": "#79745f",
      "--sidebar-hover": "#ECE5D6",
      "--sidebar-active-bg": "#E2EADF",
      "--sidebar-active-fg": "#2C5238",
    },
  },
  almanac: {
    key: "almanac",
    label: "Almanac",
    blurb: "Editorial field-journal — warm paper, hairline rules, cinnamon eyebrows, literary type. No photo wash.",
    flags: { editorial: true },
    vars: {
      "--bg": "#EFE8D9",
      "--surface": "#FAF6EC",
      "--surface-2": "#F1EADA",
      "--ink": "#20231D",
      "--ink-soft": "#736E5E",
      "--border": "#E0D7C2",
      "--primary": "#2F5A3E",
      "--primary-ink": "#FAF6EC",
      "--accent": "#B0552E",
      "--heart": "#C8503E",
      "--radius": "12px",
      "--sidebar-bg": "#F4EEE0",
      "--sidebar-fg": "#20231D",
      "--sidebar-muted": "#7c7660",
      "--sidebar-hover": "#EBE3D1",
      "--sidebar-active-bg": "#EAE2CF",
      "--sidebar-active-fg": "#2F5A3E",
    },
  },
  canopy: {
    key: "canopy",
    label: "Canopy",
    blurb: "Immersive & modern — dark identity rail, image-forward content, pine green with hoopoe-cinnamon pops.",
    flags: { darkside: true, imageforward: true },
    vars: {
      "--bg": "#E9E3D7",
      "--surface": "#FFFFFF",
      "--surface-2": "#F4F0E7",
      "--ink": "#181B17",
      "--ink-soft": "#6C6A5F",
      "--border": "#E7E0D2",
      "--primary": "#1F6F57",
      "--primary-ink": "#FFFFFF",
      "--accent": "#C8703A",
      "--heart": "#D7503F",
      "--radius": "18px",
      "--sidebar-bg": "#18221C",
      "--sidebar-fg": "#EDEAE0",
      "--sidebar-muted": "#9aa298",
      "--sidebar-hover": "#23302a",
      "--sidebar-active-bg": "#2C3D34",
      "--sidebar-active-fg": "#FFFFFF",
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Shared CSS — driven entirely by the tokens above                   */
/* ------------------------------------------------------------------ */

function PreviewStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.pv * { box-sizing: border-box; }
.pv { min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,sans-serif; -webkit-font-smoothing:antialiased; position:relative; }
.pv-display { font-family:var(--font-display),Georgia,serif; }

/* ambient photographic atmosphere (Grove) */
.pv--ambient::before { content:""; position:fixed; inset:0; z-index:0;
  background:url(/images/landing.jpeg) center 30%/cover no-repeat; opacity:.16; }
.pv--ambient::after { content:""; position:fixed; inset:0; z-index:0;
  background:radial-gradient(130% 90% at 50% -10%, transparent 0%, var(--bg) 62%),
             linear-gradient(180deg, transparent 40%, var(--bg) 100%); }

/* shell */
.pv-shell { position:relative; z-index:1; max-width:1380px; margin:0 auto;
  display:grid; grid-template-columns:262px minmax(0,1fr) 320px; min-height:100vh; }

/* sidebar */
.pv-side { position:sticky; top:0; align-self:start; height:100vh; overflow:hidden;
  display:flex; flex-direction:column; gap:3px; padding:22px 16px 18px;
  background:var(--sidebar-bg); color:var(--sidebar-fg); border-right:1px solid var(--border); }
.pv--darkside .pv-side { border-right:1px solid rgba(255,255,255,.07); }
.pv-brand { display:flex; align-items:center; gap:11px; padding:6px 10px 16px; }
.pv-brand .mark { display:grid; place-items:center; width:38px; height:38px; border-radius:12px;
  corner-shape:squircle; background:var(--primary); color:var(--primary-ink); flex:0 0 auto; }
.pv-brand h1 { font-size:17px; line-height:1.05; letter-spacing:-.01em; margin:0; }
.pv-brand span { display:block; font-size:10px; letter-spacing:.18em; text-transform:uppercase;
  color:var(--sidebar-muted); margin-top:3px; }
.pv-nav { display:flex; flex-direction:column; gap:2px; }
.pv-navlink { display:flex; align-items:center; gap:12px; padding:9px 12px; border-radius:11px;
  corner-shape:squircle; color:var(--sidebar-muted); font-size:14.5px; font-weight:500;
  text-decoration:none; transition:background .15s ease,color .15s ease; cursor:pointer; }
.pv-navlink:hover { background:var(--sidebar-hover); color:var(--sidebar-fg); }
.pv-navlink.active { background:var(--sidebar-active-bg); color:var(--sidebar-active-fg); font-weight:600; }
.pv-navlink svg { width:18px; height:18px; stroke-width:1.9; flex:0 0 auto; }
.pv-side .lbl { font-size:10.5px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--sidebar-muted); padding:14px 12px 6px; }
.pv-userchip { margin-top:auto; display:flex; align-items:center; gap:11px; padding:9px 10px;
  border-radius:14px; corner-shape:squircle; background:var(--sidebar-hover); }
.pv-userchip b { font-size:13.5px; font-weight:600; display:block; line-height:1.2; }
.pv-userchip small { font-size:11.5px; color:var(--sidebar-muted); }
.pv-userchip .gear { margin-left:auto; color:var(--sidebar-muted); display:flex; }

/* avatars */
.pv-av { display:grid; place-items:center; border-radius:50%; color:#fff; font-weight:600;
  flex:0 0 auto; font-family:var(--font-body); }

/* main */
.pv-main { padding:26px 30px 40px; min-width:0; }
.pv-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:22px; }
.pv-eyebrow { font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase;
  color:var(--accent); margin-bottom:7px; }
.pv-head h2 { font-size:30px; letter-spacing:-.025em; margin:0; line-height:1; }
.pv-head .sub { color:var(--ink-soft); font-size:14px; margin-top:7px; max-width:42ch; line-height:1.5; }
.pv-toolbar { display:flex; align-items:center; gap:10px; flex:0 0 auto; }

.pv-search { display:flex; align-items:center; gap:9px; height:42px; padding:0 15px; min-width:210px;
  border-radius:999px; background:var(--surface); border:1px solid var(--border); color:var(--ink-soft);
  font-size:13.5px; box-shadow:0 1px 2px rgba(30,28,22,.04); }
.pv-search svg { width:16px; height:16px; }

.pv-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; padding:0 18px;
  border-radius:13px; corner-shape:squircle; font-weight:600; font-size:14px; border:0; cursor:pointer;
  font-family:var(--font-body); transition:transform .12s ease, filter .15s ease, background .15s ease; }
.pv-btn:active { transform:scale(.97); }
.pv-btn--primary { background:var(--primary); color:var(--primary-ink); box-shadow:0 6px 16px -8px var(--primary); }
.pv-btn--primary:hover { filter:brightness(1.07); }
.pv-btn--ghost { background:var(--surface); color:var(--ink); border:1px solid var(--border); }
.pv-btn--ghost:hover { background:var(--surface-2); }
.pv-iconbtn { display:grid; place-items:center; width:42px; height:42px; border-radius:12px; corner-shape:squircle;
  background:var(--surface); border:1px solid var(--border); color:var(--ink-soft); cursor:pointer; position:relative; }
.pv-iconbtn .dot { position:absolute; top:9px; right:10px; width:7px; height:7px; border-radius:50%;
  background:var(--accent); border:2px solid var(--surface); }

/* card */
.pv-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius);
  corner-shape:squircle; box-shadow:0 1px 2px rgba(30,28,22,.05), 0 18px 40px -28px rgba(30,28,22,.35); }

/* composer */
.pv-composer { display:flex; align-items:center; gap:14px; padding:15px 18px; margin-bottom:18px; }
.pv-composer .ph { flex:1; color:var(--ink-soft); font-size:14.5px; }
.pv-composer .acts { display:flex; gap:4px; }
.pv-chip { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:500;
  padding:7px 11px; border-radius:10px; corner-shape:squircle; color:var(--ink-soft); background:transparent; }
.pv-chip:hover { background:var(--surface-2); }
.pv-chip svg { width:15px; height:15px; }

/* feed / posts */
.pv-feed { display:flex; flex-direction:column; gap:16px; }
.pv--editorial .pv-feed { gap:0; }
.pv--editorial .pv-feedsheet { background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); corner-shape:squircle; overflow:hidden;
  box-shadow:0 1px 2px rgba(30,28,22,.05), 0 18px 40px -28px rgba(30,28,22,.35); }
.pv-post { padding:18px 20px 15px; }
.pv--editorial .pv-post { box-shadow:none; border:0; border-bottom:1px solid var(--border); border-radius:0; }
.pv--editorial .pv-post:last-child { border-bottom:0; }
.pv-post header { display:flex; align-items:center; gap:12px; }
.pv-post .who b { font-size:14.5px; font-weight:600; }
.pv-post .who .meta { color:var(--ink-soft); font-size:12.5px; margin-top:1px; display:flex; align-items:center; gap:7px; }
.pv-tag { display:inline-flex; align-items:center; padding:2px 9px; border-radius:999px; font-size:11px;
  font-weight:600; background:color-mix(in srgb, var(--primary) 13%, transparent); color:var(--primary); }
.pv-post .dots { margin-left:auto; color:var(--ink-soft); letter-spacing:1px; }
.pv-post .body { margin:13px 0 14px; line-height:1.72; font-size:15px; color:var(--ink); }
.pv-post .body b { font-weight:700; }
.pv-cover { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:13px; corner-shape:squircle;
  margin:0 0 14px; border:1px solid var(--border); }
.pv-actions { display:flex; align-items:center; gap:22px; color:var(--ink-soft); font-size:13px; }
.pv-actions .act { display:inline-flex; align-items:center; gap:7px; cursor:pointer; }
.pv-actions .act svg { width:17px; height:17px; }
.pv-actions .liked { color:var(--heart); }
.pv-actions .share { margin-left:auto; }

/* poll/fund mini */
.pv-fund { margin:12px 0 14px; }
.pv-bar { height:9px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
.pv-bar > i { display:block; height:100%; border-radius:999px; background:var(--primary); }
.pv-fund .row { display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); margin-top:7px; }

/* right rail */
.pv-rail { padding:26px 26px 40px 8px; display:flex; flex-direction:column; gap:16px; }
.pv-railcard { padding:16px 17px; }
.pv-railcard h3 { font-size:11px; font-weight:700; letter-spacing:.13em; text-transform:uppercase;
  color:var(--ink-soft); margin:0 0 13px; }
.pv-event { display:flex; gap:13px; align-items:flex-start; }
.pv-datechip { display:grid; place-items:center; width:50px; height:54px; border-radius:13px; corner-shape:squircle;
  background:color-mix(in srgb, var(--accent) 13%, var(--surface)); color:var(--accent); flex:0 0 auto; line-height:1; }
.pv-datechip b { font-size:19px; font-weight:700; }
.pv-datechip span { font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-top:3px; }
.pv-event .ttl { font-size:14.5px; font-weight:600; }
.pv-event .loc { display:flex; align-items:center; gap:5px; color:var(--ink-soft); font-size:12.5px; margin-top:4px; }
.pv-event .loc svg { width:13px; height:13px; }
.pv-railrow { display:flex; align-items:center; gap:11px; padding:7px 0; }
.pv-railrow + .pv-railrow { border-top:1px solid var(--border); }
.pv-railrow .nm { font-size:13.5px; font-weight:600; line-height:1.2; }
.pv-railrow .dt { font-size:11.5px; color:var(--ink-soft); }
.pv-railrow .cnt { margin-left:auto; font-size:12px; color:var(--ink-soft); }

/* ---------- login ---------- */
.pv-auth { position:relative; z-index:1; min-height:100vh; display:grid; }
.pv-auth--split { grid-template-columns:1.05fr 1fr; }
.pv-auth--center { place-items:center; padding:24px; }
.pv-authpanel { position:relative; overflow:hidden; padding:48px 52px; display:flex; flex-direction:column;
  justify-content:space-between; color:#EDEAE0; background:var(--sidebar-bg); }
.pv-authpanel::after { content:""; position:absolute; inset:0; background:url(/images/landing.jpeg) center/cover;
  opacity:.22; mix-blend-mode:luminosity; }
.pv-authpanel > * { position:relative; z-index:1; }
.pv-quote { font-size:25px; line-height:1.42; letter-spacing:-.01em; max-width:18ch; }
.pv-quote small { display:block; font-family:var(--font-body); font-size:12.5px; letter-spacing:.12em;
  text-transform:uppercase; color:#b9c2b4; margin-top:18px; }
.pv-authcard { width:100%; max-width:392px; padding:34px 34px 30px; }
.pv-authform { align-self:center; width:100%; max-width:392px; padding:8px 40px; }
.pv-field { display:flex; flex-direction:column; gap:6px; margin-bottom:13px; }
.pv-field label { font-size:13px; font-weight:600; }
.pv-input { height:46px; border-radius:12px; corner-shape:squircle; border:1px solid var(--border);
  background:var(--surface); padding:0 14px; color:var(--ink); font-size:14.5px; font-family:var(--font-body); width:100%; }
.pv-input::placeholder { color:color-mix(in srgb, var(--ink-soft) 75%, transparent); }
.pv-input:focus-visible { outline:2px solid color-mix(in srgb, var(--primary) 55%, transparent);
  outline-offset:1px; border-color:var(--primary); }
.pv-fieldrow { display:flex; align-items:center; justify-content:space-between; }
.pv-link { color:var(--primary); font-weight:600; text-decoration:none; }
.pv-link:hover { text-decoration:underline; }
.pv-mutelink { color:var(--ink-soft); font-size:12.5px; text-decoration:none; }
.pv-eyebtn { background:transparent; border:0; color:var(--ink-soft); cursor:pointer; display:flex; }

/* responsive (mockup-level) */
@media (max-width:1180px){ .pv-shell{grid-template-columns:240px minmax(0,1fr);} .pv-rail{display:none;} }
`,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function Avatar({ initials, color, size = 38 }: { initials: string; color: string; size?: number }) {
  return (
    <div className="pv-av" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

const NAV = [
  { icon: Newspaper, label: "Feed", active: true },
  { icon: Notebook, label: "Directory" },
  { icon: Users, label: "Groups" },
  { icon: Mail, label: "Letters" },
  { icon: CalendarDays, label: "Events" },
  { icon: Info, label: "About" },
];

function Sidebar() {
  return (
    <aside className="pv-side">
      <div className="pv-brand">
        <div className="mark">
          <Bird size={22} weight="fill" />
        </div>
        <div>
          <h1 className="pv-display">Rishi Valley</h1>
          <span>Alumni</span>
        </div>
      </div>
      <nav className="pv-nav">
        {NAV.map((n) => (
          <a key={n.label} className={`pv-navlink${n.active ? " active" : ""}`}>
            <n.icon /> {n.label}
          </a>
        ))}
      </nav>
      <div className="pv-userchip">
        <Avatar initials="AR" color="#6E8B6B" size={34} />
        <div>
          <b>Ananya Rao</b>
          <small>Batch of &rsquo;09</small>
        </div>
        <span className="gear">
          <Settings size={16} />
        </span>
      </div>
    </aside>
  );
}

function PostHeader({
  initials,
  color,
  name,
  batch,
  time,
}: {
  initials: string;
  color: string;
  name: string;
  batch: string;
  time: string;
}) {
  return (
    <header>
      <Avatar initials={initials} color={color} size={40} />
      <div className="who">
        <b>{name}</b>
        <div className="meta">
          <span className="pv-tag">{batch}</span>
          <span>· {time}</span>
        </div>
      </div>
      <span className="dots">···</span>
    </header>
  );
}

function Actions({ likes, comments, liked }: { likes: number; comments: number; liked?: boolean }) {
  return (
    <div className="pv-actions">
      <span className={`act${liked ? " liked" : ""}`}>
        <Heart fill={liked ? "currentColor" : "none"} /> {likes}
      </span>
      <span className="act">
        <MessageCircle /> {comments}
      </span>
      <span className="act share">
        <Share2 />
      </span>
    </div>
  );
}

export function FeedShell({ t }: { t: Tokens }) {
  const f = t.flags;
  const posts = (
    <>
      <article className="pv-post pv-card">
        <PostHeader initials="AR" color="#6E8B6B" name="Ananya Rao" batch="Batch of '09" time="3h" />
        {f.imageforward && <img className="pv-cover" src="/images/landing.jpeg" alt="" />}
        <p className="body">
          Walked up to <b>Rishi Konda</b> at dawn and counted four hoopoes on the way down. The
          valley has a quiet way of resetting you — wish I could bottle that morning light.
        </p>
        <Actions likes={24} comments={6} liked />
      </article>

      <article className="pv-post pv-card">
        <PostHeader initials="RV" color="#2F5A3E" name="Alumni Fund" batch="Official" time="1d" />
        <p className="body">
          We&rsquo;ve crossed <b>₹4,20,000</b> toward the new reading room. Every contribution is
          keeping the lamps on a little longer.
        </p>
        <div className="pv-fund">
          <div className="pv-bar">
            <i style={{ width: "70%" }} />
          </div>
          <div className="row">
            <span>₹4.2L raised</span>
            <span>Goal ₹6L</span>
          </div>
        </div>
        <Actions likes={18} comments={3} />
      </article>

      <article className="pv-post pv-card">
        <PostHeader initials="KM" color="#9A6B3F" name="Karthik Menon" batch="Batch of '15" time="2d" />
        <p className="body">
          Moving to <b>Berlin</b> next month. If any RV folks are around, I&rsquo;d love to start a
          small monthly dinner — same long-table spirit as the dining hall.
        </p>
        <Actions likes={31} comments={12} />
      </article>
    </>
  );

  return (
    <div className={`pv pv--${t.key}${f.ambient ? " pv--ambient" : ""}${f.darkside ? " pv--darkside" : ""}${f.editorial ? " pv--editorial" : ""}`} style={t.vars as React.CSSProperties}>
      <PreviewStyles />
      <div className="pv-shell">
        <Sidebar />

        <main className="pv-main">
          <div className="pv-head">
            <div>
              {f.editorial && <div className="pv-eyebrow">The Valley · Today</div>}
              <h2 className="pv-display">Feed</h2>
              <p className="sub">What the valley&rsquo;s alumni are sharing today.</p>
            </div>
            <div className="pv-toolbar">
              <div className="pv-search">
                <Search /> Search the valley…
              </div>
              <button className="pv-iconbtn">
                <Bell size={18} />
                <span className="dot" />
              </button>
              <button className="pv-btn pv-btn--primary">
                <Plus size={17} /> New post
              </button>
            </div>
          </div>

          <div className="pv-composer pv-card">
            <Avatar initials="AR" color="#6E8B6B" size={40} />
            <span className="ph">Share a memory, a sighting, or a note for the valley…</span>
            <div className="acts">
              <span className="pv-chip">
                <ImageIcon /> Photo
              </span>
              <span className="pv-chip">
                <BarChart3 /> Poll
              </span>
              <span className="pv-chip">
                <Mail /> Letter
              </span>
            </div>
          </div>

          {f.editorial ? <div className="pv-feedsheet">{posts}</div> : <div className="pv-feed">{posts}</div>}
        </main>

        <aside className="pv-rail">
          <div className="pv-railcard pv-card">
            <h3>Coming up</h3>
            <div className="pv-event">
              <div className="pv-datechip">
                <b>14</b>
                <span>Nov</span>
              </div>
              <div>
                <div className="ttl">Founders&rsquo; Week</div>
                <div className="loc">
                  <MapPin /> Rishi Valley, AP
                </div>
                <button className="pv-btn pv-btn--ghost" style={{ height: 34, marginTop: 11, padding: "0 14px", fontSize: 13 }}>
                  RSVP
                </button>
              </div>
            </div>
          </div>

          <div className="pv-railcard pv-card">
            <h3>New in the directory</h3>
            <div className="pv-railrow">
              <Avatar initials="SP" color="#5F7E8C" size={36} />
              <div>
                <div className="nm">Sanjana Pillai</div>
                <div className="dt">Batch of &rsquo;12 · Bengaluru</div>
              </div>
            </div>
            <div className="pv-railrow">
              <Avatar initials="DV" color="#8C6B5F" size={36} />
              <div>
                <div className="nm">Dhruv Varma</div>
                <div className="dt">Batch of &rsquo;04 · London</div>
              </div>
            </div>
            <div className="pv-railrow">
              <Avatar initials="MI" color="#6B7F5F" size={36} />
              <div>
                <div className="nm">Meera Iyer</div>
                <div className="dt">Batch of &rsquo;18 · Chennai</div>
              </div>
            </div>
          </div>

          <div className="pv-railcard pv-card">
            <h3>Your groups</h3>
            <div className="pv-railrow">
              <div className="nm">Bengaluru Alumni</div>
              <span className="cnt">212</span>
            </div>
            <div className="pv-railrow">
              <div className="nm">Class of &rsquo;09</div>
              <span className="cnt">88</span>
            </div>
            <div className="pv-railrow">
              <div className="nm">Birders of RV</div>
              <span className="cnt">41</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function LoginView({ t }: { t: Tokens }) {
  const f = t.flags;
  const card = (
    <div className="pv-authcard pv-card">
      <div className="pv-brand" style={{ padding: "0 0 18px" }}>
        <div className="mark">
          <Bird size={22} weight="fill" />
        </div>
        <div>
          <h1 className="pv-display">Rishi Valley</h1>
          <span>Alumni</span>
        </div>
      </div>
      {f.editorial && <div className="pv-eyebrow">Est. 1926 · Andhra Pradesh</div>}
      <h2 className="pv-display" style={{ fontSize: 26, letterSpacing: "-.02em", margin: "2px 0 6px" }}>
        Welcome back to the valley
      </h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
        Sign in to reconnect with the people who grew up under the same trees.
      </p>
      <div className="pv-field">
        <label>Email</label>
        <input className="pv-input" placeholder="you@example.com" />
      </div>
      <div className="pv-field">
        <div className="pv-fieldrow">
          <label>Password</label>
          <a className="pv-mutelink">Forgot?</a>
        </div>
        <input className="pv-input" type="password" placeholder="Your password" />
      </div>
      <button className="pv-btn pv-btn--primary" style={{ width: "100%", marginTop: 6 }}>
        Sign in
      </button>
      <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 18 }}>
        New here? <a className="pv-link">Request an invite</a>
      </p>
    </div>
  );

  if (f.darkside) {
    return (
      <div className={`pv pv--${t.key} pv--darkside`} style={t.vars as React.CSSProperties}>
        <PreviewStyles />
        <div className="pv-auth pv-auth--split">
          <div className="pv-authpanel">
            <div className="pv-brand" style={{ padding: 0, color: "#EDEAE0" }}>
              <div className="mark">
                <Bird size={22} weight="fill" />
              </div>
              <div>
                <h1 className="pv-display">Rishi Valley</h1>
                <span style={{ color: "#aab3a4" }}>Alumni</span>
              </div>
            </div>
            <p className="pv-quote pv-display">
              &ldquo;The valley is a place to watch — the birds, the hills, and yourself.&rdquo;
              <small>For the alumni of Rishi Valley School</small>
            </p>
            <div style={{ fontSize: 12.5, color: "#9aa298", letterSpacing: ".06em" }}>
              Est. 1926 · Madanapalle, Andhra Pradesh
            </div>
          </div>
          <div className="pv-authform">{cardInner()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pv pv--${t.key}${f.ambient ? " pv--ambient" : ""}${f.editorial ? " pv--editorial" : ""}`} style={t.vars as React.CSSProperties}>
      <PreviewStyles />
      <div className="pv-auth pv-auth--center">{card}</div>
    </div>
  );
}

/* form body re-used inside the split (no card chrome on the light side) */
function cardInner() {
  return (
    <div>
      <h2 className="pv-display" style={{ fontSize: 27, letterSpacing: "-.02em", margin: "0 0 6px" }}>
        Welcome back
      </h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
        Sign in to reconnect with the people who grew up under the same trees.
      </p>
      <div className="pv-field">
        <label>Email</label>
        <input className="pv-input" placeholder="you@example.com" />
      </div>
      <div className="pv-field">
        <div className="pv-fieldrow">
          <label>Password</label>
          <a className="pv-mutelink">Forgot?</a>
        </div>
        <input className="pv-input" type="password" placeholder="Your password" />
      </div>
      <button className="pv-btn pv-btn--primary" style={{ width: "100%", marginTop: 6 }}>
        Sign in
      </button>
      <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 18 }}>
        New here? <a className="pv-link">Request an invite</a>
      </p>
    </div>
  );
}
