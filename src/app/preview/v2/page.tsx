"use client";

import { useEffect, useState } from "react";
import {
  Newspaper,
  Users,
  FolderOpen,
  Feather,
  CalendarDays,
  Info,
  Search,
  Bell,
  Plus,
  MapPin,
  MessageCircle,
  Settings,
  Image as ImageIcon,
  BarChart3,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Mail,
  Globe,
  Phone,
  Instagram,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Heart, ShareFat } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Marks                                                              */
/* ------------------------------------------------------------------ */

/* working brand mark: a leaf (real logo work is deferred) */
function LeafMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M26 6 C12 6 6 14 6 26 C18 26 26 18 26 6 Z" fill="currentColor" />
      <path d="M10.5 21.5 C14 17.5 18 13.5 22.5 9" stroke="var(--sidebar)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* hoopoe: only for the password field's eye-cover delight */
function Hoopoe({ covered, size = 64 }: { covered: boolean; size?: number }) {
  return (
    <svg className={`hoopoe${covered ? " covered" : ""}`} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g className="crest">
        {[-24, -12, 0, 12, 24].map((dx, i) => (
          <g key={i} transform={`rotate(${dx} 32 27)`}>
            <rect x="30.3" y="1" width="3.4" height="17" rx="1.7" fill="var(--hp-crest)" />
            <circle cx="32" cy="2.6" r="2.3" fill="var(--hp-tip)" />
          </g>
        ))}
      </g>
      <ellipse cx="32" cy="40" rx="17" ry="16" fill="var(--hp-body)" />
      <ellipse cx="32" cy="30" rx="13.5" ry="12" fill="var(--hp-head)" />
      <path d="M32 33 L33.4 52 Q32 54 30.6 52 Z" fill="var(--hp-beak)" />
      <circle className="eye" cx="26.5" cy="28.5" r="2.6" fill="var(--hp-eye)" />
      <circle className="eye" cx="37.5" cy="28.5" r="2.6" fill="var(--hp-eye)" />
      <path className="wing wing-l" d="M23 37 Q15 21 30 18 Q34 27 30 37 Q26 39 23 37 Z" fill="var(--hp-wing)" />
      <path className="wing wing-r" d="M41 37 Q49 21 34 18 Q30 27 34 37 Q38 39 41 37 Z" fill="var(--hp-wing)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatars — valley birds + photo support                            */
/* ------------------------------------------------------------------ */

function BirdGlyph({ size = 22, variant = 0, eye = "#4F9E6B" }: { size?: number; variant?: number; eye?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <g transform="translate(0.6,1.6)">
        {variant === 2 ? (
          <path d="M7 20 L0 25 L4.5 21.5 L1.5 17.5 Z" fill="#fff" opacity="0.95" />
        ) : (
          <path d="M6 19 L1.5 16.5 L3.5 21.5 Z" fill="#fff" opacity="0.95" />
        )}
        <path
          d="M5.5 19 C5.5 13.5 10 10 16 10 C22 10 26 13.3 26 18.3 C26 23 21.8 25.6 16 25.6 C10 25.6 5.5 23.5 5.5 19 Z"
          fill="#fff"
          opacity="0.97"
        />
        {variant === 1 && (
          <path d="M15.5 10 L14.5 4 L17 8 L18.5 3 L20 8 L21.5 5 L21 10 Z" fill="#fff" opacity="0.97" />
        )}
        <path d="M25 16.4 L30.5 17.6 L25 19.4 Z" fill="#fff" opacity="0.97" />
        <circle cx="20.3" cy="16.2" r="1.5" fill={eye} />
      </g>
    </svg>
  );
}

function Avatar({
  initials,
  color,
  variant = 0,
  photo,
  style,
  size = 40,
  ring,
}: {
  initials: string;
  color: string;
  variant?: number;
  photo?: string;
  style: "initials" | "birds";
  size?: number;
  ring?: boolean;
}) {
  const box: React.CSSProperties = { width: size, height: size };
  if (ring) box.border = "4px solid var(--surface)";
  if (photo) {
    return (
      <div className="v2-av" style={box} aria-label={initials}>
        <img src={photo} alt="" />
      </div>
    );
  }
  if (style === "birds") {
    return (
      <div className="v2-av" style={{ ...box, background: color }} aria-label={initials}>
        <BirdGlyph size={size * 0.66} variant={variant} eye={color} />
      </div>
    );
  }
  return (
    <div className="v2-av" style={{ ...box, background: color, fontSize: size * 0.38 }} aria-label={initials}>
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const NAV = [
  { icon: Newspaper, label: "Feed" },
  { icon: Users, label: "Directory" },
  { icon: FolderOpen, label: "Groups" },
  { icon: Feather, label: "Letters" },
  { icon: CalendarDays, label: "Events" },
  { icon: Info, label: "About" },
];

interface Post {
  id: string;
  name: string;
  initials: string;
  color: string;
  batch: string;
  time: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
  kind: "text" | "fund";
  photo?: string;
  variant?: number;
}

const POSTS: Post[] = [
  {
    id: "p1",
    name: "Ananya Rao",
    initials: "AR",
    color: "#4F9E6B",
    batch: "Batch of '09",
    time: "3h",
    body: "Walked up to **Rishi Konda** at dawn and counted four hoopoes on the way down. The valley has a quiet way of resetting you.",
    likes: 24,
    comments: 6,
    liked: true,
    kind: "text",
    variant: 1,
  },
  {
    id: "p2",
    name: "Alumni Office",
    initials: "AO",
    color: "#3F7CA6",
    batch: "Official",
    time: "1d",
    body: "We've crossed **₹4,20,000** toward the new reading room. Every contribution is keeping the lamps on a little longer.",
    likes: 18,
    comments: 3,
    liked: false,
    kind: "fund",
    variant: 0,
  },
  {
    id: "p3",
    name: "Karthik Menon",
    initials: "KM",
    color: "#C8704A",
    batch: "Batch of '15",
    time: "2d",
    body: "Moving to **Berlin** next month. If any RV folks are around, I'd love to start a small monthly dinner, same long-table spirit as the dining hall.",
    likes: 31,
    comments: 12,
    liked: false,
    kind: "text",
    photo: "/images/landing.jpeg",
  },
];

function Body({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="v2-body">
      {parts.map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </p>
  );
}

type AvatarStyle = "initials" | "birds";

function PostList({
  avatars,
  sheet,
  likes,
  setLikes,
}: {
  avatars: AvatarStyle;
  sheet: boolean;
  likes: Record<string, boolean>;
  setLikes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const items = POSTS.map((post, idx) => {
    const liked = likes[post.id];
    return (
      <article key={post.id} className={sheet ? "v2-post sheet" : "v2-card v2-post"}>
        <header>
          <Avatar initials={post.initials} color={post.color} variant={post.variant ?? idx % 3} photo={post.photo} style={avatars} size={42} />
          <div className="who">
            <b>{post.name}</b>
            <div className="v2-batchline">
              <span className="v2-batch">{post.batch}</span>
              <span className="dotsep">·</span>
              <span>{post.time}</span>
            </div>
          </div>
          <button className="more" aria-label="More">···</button>
        </header>
        <Body text={post.body} />
        {post.kind === "fund" && (
          <div className="v2-fund">
            <div className="bar"><i style={{ width: "70%" }} /></div>
            <div className="row"><span>₹4.2L raised</span><span>Goal ₹6L</span></div>
          </div>
        )}
        <div className="v2-actions">
          <button
            className={`act like${liked ? " liked" : ""}`}
            onClick={() => setLikes((s) => ({ ...s, [post.id]: !s[post.id] }))}
            aria-label="Like"
          >
            <span className="heartwrap" key={String(liked)}>
              <Heart size={18} weight={liked ? "fill" : "regular"} />
            </span>
            {post.likes + (liked && !post.liked ? 1 : 0)}
          </button>
          <button className="act" aria-label="Comment"><MessageCircle size={17} /> {post.comments}</button>
          <button className="act share" aria-label="Share"><ShareFat size={17} /></button>
        </div>
      </article>
    );
  });
  return sheet ? <div className="v2-card v2-sheet">{items}</div> : <div className="v2-feed">{items}</div>;
}

function AppSidebar({ avatars, active }: { avatars: AvatarStyle; active: string }) {
  return (
    <aside className="v2-side">
      <div className="v2-brand">
        <span className="v2-mark"><LeafMark size={22} /></span>
        <div>
          <h1 className="v2-display">Rishi Valley</h1>
          <span>Alumni</span>
        </div>
      </div>
      <nav className="v2-nav">
        {NAV.map((n) => (
          <a key={n.label} className={`v2-navlink${n.label === active ? " active" : ""}`}>
            <n.icon size={18} strokeWidth={1.9} /> {n.label}
          </a>
        ))}
      </nav>
      <div className="v2-userchip">
        <Avatar initials="AR" color="#4F9E6B" variant={1} style={avatars} size={34} />
        <div className="who">
          <b>Ananya Rao</b>
          <small>Batch of &rsquo;09</small>
        </div>
        <Settings size={16} className="gear" />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

function ProfileView({
  avatars,
  likes,
  setLikes,
}: {
  avatars: AvatarStyle;
  likes: Record<string, boolean>;
  setLikes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const [tab, setTab] = useState<"posts" | "about" | "photos">("posts");
  const photos = Array.from({ length: 6 });
  return (
    <div className="v2-shell">
      <AppSidebar avatars={avatars} active="Directory" />
      <div className="v2-content">
        <div className="v2-bg" />
        <div className="v2-inner v2-inner--profile">
          <main className="v2-profile">
            <section className="v2-card v2-cover">
              <div className="cover-photo" />
              <div className="cover-body">
                <div className="cover-top">
                  <Avatar initials="AR" color="#4F9E6B" variant={1} style={avatars} size={104} ring />
                  <div className="id">
                    <h2 className="v2-display">Ananya Rao</h2>
                    <div className="cover-meta">
                      <span className="v2-batch">Batch of &rsquo;09</span>
                      <span className="dotsep">·</span>
                      <span className="loc"><MapPin size={13} /> Bengaluru</span>
                      <span className="dotsep">·</span>
                      <span>Biology teacher</span>
                    </div>
                  </div>
                  <div className="cover-actions">
                    <button className="v2-btn v2-btn-primary sm2"><Mail size={15} /> Message</button>
                    <button className="v2-btn v2-btn-ghost sm2">Save contact</button>
                  </div>
                </div>
                <p className="cover-bio">
                  Birder, biology teacher, slow-coffee evangelist. Came to the valley in 2003 and never
                  fully left. Always up for a campus walk or a dawn climb up Rishi Konda.
                </p>
                <div className="tag-row">
                  <span className="v2-tag-soft">Open to mentoring</span>
                  <span className="v2-tag-soft">Hosting visitors</span>
                  <span className="v2-tag-soft">Coffee in Bengaluru</span>
                </div>
                <div className="cover-stats">
                  <span><b>42</b> posts</span>
                  <span>In the valley <b>2003 to 2009</b></span>
                </div>
              </div>
            </section>

            <div className="v2-inner--profile-cols">
              <div className="col-main">
                <div className="profile-tabs">
                  {(["posts", "about", "photos"] as const).map((t) => (
                    <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {tab === "posts" && <PostList avatars={avatars} sheet likes={likes} setLikes={setLikes} />}

                {tab === "about" && (
                  <div className="v2-card about-card">
                    <h3>About</h3>
                    <p>
                      I teach biology at a school in Bengaluru and run a small weekend birding group.
                      Rishi Valley taught me to slow down and look closely, which turns out to be the
                      whole job. Happy to talk about teaching, the outdoors, or where to find good filter
                      coffee in any city.
                    </p>
                    <h3 style={{ marginTop: 18 }}>The valley years</h3>
                    <p>Joined in 2003, finished ISC in 2009. Krishna House. Choir, the nature club, and far too many hours under the banyan.</p>
                  </div>
                )}

                {tab === "photos" && (
                  <div className="photos-grid">
                    {photos.map((_, i) => (
                      <img key={i} src="/images/landing.jpeg" alt="" />
                    ))}
                  </div>
                )}
              </div>

              <aside className="col-rail">
                <section className="v2-card v2-railcard">
                  <h3>Details</h3>
                  <div className="fact"><GraduationCap size={15} /> Batch of &rsquo;09</div>
                  <div className="fact"><Briefcase size={15} /> Biology teacher</div>
                  <div className="fact"><MapPin size={15} /> Bengaluru, India</div>
                  <div className="fact"><CalendarDays size={15} /> At RV 2003 to 2009</div>
                </section>
                <section className="v2-card v2-railcard">
                  <h3>Contact</h3>
                  <a className="fact link"><Mail size={15} /> Message Ananya</a>
                  <a className="fact link"><Phone size={15} /> +91 98••• •••••</a>
                  <a className="fact link"><Instagram size={15} /> Instagram</a>
                  <a className="fact link"><Globe size={15} /> ananyarao.in</a>
                </section>
                <section className="v2-card v2-railcard">
                  <h3>Groups</h3>
                  <div className="v2-grow"><span className="nm">Birders of RV</span><span className="cnt">41</span></div>
                  <div className="v2-grow"><span className="nm">Class of &rsquo;09</span><span className="cnt">88</span></div>
                  <div className="v2-grow"><span className="nm">Bengaluru Alumni</span><span className="cnt">212</span></div>
                </section>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main preview                                                       */
/* ------------------------------------------------------------------ */

export default function PreviewV2() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<"feed" | "profile" | "login">("feed");
  const [avatars, setAvatars] = useState<AvatarStyle>("birds");
  const [layout, setLayout] = useState<"tiles" | "sheet">("sheet");
  const [showPw, setShowPw] = useState(false);
  const [intro, setIntro] = useState(true);
  const [likes, setLikes] = useState<Record<string, boolean>>({ p1: true, p2: false, p3: false });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("theme") === "dark") setTheme("dark");
    const v = q.get("view");
    if (v === "login" || v === "profile") setView(v);
    if (q.get("avatars") === "initials") setAvatars("initials");
    if (q.get("layout") === "tiles") setLayout("tiles");
  }, []);

  // hoopoe opens its eyes, then closes them shortly after load so people notice it
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`v2${theme === "dark" ? " dark" : ""}`}>
      <Styles />

      <div className="v2-controls">
        <Seg options={[{ v: "light", icon: <Sun size={15} /> }, { v: "dark", icon: <Moon size={15} /> }]} value={theme} onChange={(v) => setTheme(v as "light" | "dark")} />
        <Seg options={[{ v: "feed", label: "Feed" }, { v: "profile", label: "Profile" }, { v: "login", label: "Login" }]} value={view} onChange={(v) => setView(v as "feed" | "profile" | "login")} />
        <Seg options={[{ v: "sheet", label: "Sheet" }, { v: "tiles", label: "Tiles" }]} value={layout} onChange={(v) => setLayout(v as "tiles" | "sheet")} />
        <Seg options={[{ v: "birds", label: "Bird" }, { v: "initials", label: "Aa" }]} value={avatars} onChange={(v) => setAvatars(v as AvatarStyle)} />
      </div>

      {view === "profile" && <ProfileView avatars={avatars} likes={likes} setLikes={setLikes} />}

      {view === "feed" && (
        <div className="v2-shell">
          <AppSidebar avatars={avatars} active="Feed" />
          <div className="v2-content">
            <div className="v2-bg" />
            <div className="v2-inner">
              <main className="v2-main">
                <header className="v2-head">
                  <div>
                    <h2 className="v2-display">Feed</h2>
                    <p className="sub">What the valley&rsquo;s alumni are sharing today.</p>
                  </div>
                  <div className="v2-toolbar">
                    <div className="v2-search"><Search size={16} /> <span>Search the valley...</span></div>
                    <button className="v2-iconbtn bell" aria-label="Notifications"><Bell size={18} /><span className="dot" /></button>
                    <button className="v2-btn v2-btn-primary"><Plus size={17} /> New post</button>
                  </div>
                </header>

                <div className="v2-card v2-composer">
                  <Avatar initials="AR" color="#4F9E6B" variant={1} style={avatars} size={40} />
                  <span className="ph">Share a memory, a sighting, or a note for the valley</span>
                  <div className="acts">
                    <span className="v2-chip"><ImageIcon size={15} /> Photo</span>
                    <span className="v2-chip"><BarChart3 size={15} /> Poll</span>
                    <span className="v2-chip"><Feather size={15} /> Letter</span>
                  </div>
                </div>

                <PostList avatars={avatars} sheet={layout === "sheet"} likes={likes} setLikes={setLikes} />
              </main>

              <aside className="v2-rail">
                <section className="v2-card v2-railcard">
                  <h3>Coming up</h3>
                  <div className="v2-event">
                    <div className="v2-datechip"><span className="mon">Nov</span><span className="day">14</span></div>
                    <div>
                      <div className="ttl">Founders&rsquo; Week</div>
                      <div className="loc"><MapPin size={13} /> Rishi Valley, AP</div>
                      <button className="v2-btn v2-btn-soft sm">RSVP</button>
                    </div>
                  </div>
                </section>
                <section className="v2-card v2-railcard">
                  <h3>New in the directory</h3>
                  {[
                    { n: "Sanjana Pillai", d: "Batch of '12 · Bengaluru", c: "#5C9BC4", i: "SP" },
                    { n: "Dhruv Varma", d: "Batch of '04 · London", c: "#C8704A", i: "DV" },
                    { n: "Meera Iyer", d: "Batch of '18 · Chennai", c: "#C75F7A", i: "MI" },
                  ].map((p, i) => (
                    <div className="v2-railrow" key={p.n}>
                      <Avatar initials={p.i} color={p.c} variant={i} style={avatars} size={36} />
                      <div><div className="nm">{p.n}</div><div className="dt">{p.d}</div></div>
                    </div>
                  ))}
                </section>
                <section className="v2-card v2-railcard">
                  <h3>Your groups</h3>
                  <div className="v2-grow"><span className="nm">Bengaluru Alumni</span><span className="cnt">212</span></div>
                  <div className="v2-grow"><span className="nm">Class of &rsquo;09</span><span className="cnt">88</span></div>
                  <div className="v2-grow"><span className="nm">Birders of RV</span><span className="cnt">41</span></div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {view === "login" && (
        <div className="v2-login">
          <div className="v2-login-photo">
            <img src="/images/landing.jpeg" alt="" />
            <span className="v2-login-mark"><LeafMark size={20} /><span>Rishi Valley</span></span>
          </div>
          <div className="v2-login-form">
            <div className="v2-formbox">
              <div className="v2-hoopoe-stage"><Hoopoe covered={!showPw && !intro} size={92} /></div>
              <h2 className="v2-display">Welcome back</h2>
              <p className="sub">Sign in to reconnect with the people who grew up under the same trees.</p>
              <label className="v2-fl">Email</label>
              <input className="v2-input" placeholder="you@example.com" />
              <div className="v2-fl-row">
                <label className="v2-fl">Password</label>
                <a className="v2-mutelink">Forgot?</a>
              </div>
              <div className="v2-input-wrap">
                <input className="v2-input" type={showPw ? "text" : "password"} placeholder="Your password" defaultValue="valleybird" />
                <button className="v2-eye" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password">
                  {showPw ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
              <button className="v2-btn v2-btn-primary block">Sign in</button>
              <p className="v2-foot">New here? <a className="v2-link">Request an invite</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; label?: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="v2-seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.v2 {
  --bg:#E7E1D3; --surface:#F6F2E8; --surface-2:#EEE8DA; --ink:#22271F; --ink-soft:#6E7268;
  --border:#E0D8C8; --sidebar:#295A47; --sidebar-ink:#EBF3EE; --sidebar-muted:#9DBDAC;
  --primary:#1F6F57; --primary-ink:#FFFFFF; --blue:#3F7CA6; --cinnamon:#C26B39; --heart:#DD5043;
  --r-card:18px; --r-input:12px;
  --hp-body:#C98A5A; --hp-head:#D9A36F; --hp-wing:#A96B3C; --hp-crest:#C26B39; --hp-tip:#2C2A28;
  --hp-beak:#3A3632; --hp-eye:#2C2A28;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,sans-serif; -webkit-font-smoothing:antialiased;
}
.v2.dark {
  --bg:#10171A; --surface:#18211D; --surface-2:#1E2823; --ink:#E8EDE7; --ink-soft:#9DA8A0;
  --border:#28332D; --sidebar:#16271F; --sidebar-ink:#E8EDE7; --sidebar-muted:#8FA89A;
  --primary:#34B083; --primary-ink:#08120D; --blue:#5C9BC4; --cinnamon:#D98A4F; --heart:#F0675A;
}
.v2 * { box-sizing:border-box; }
.v2-display { font-family:var(--font-display),Georgia,serif; letter-spacing:-.01em; }

.v2-controls { position:fixed; right:16px; bottom:16px; z-index:80; display:flex; gap:8px; flex-wrap:wrap; max-width:62vw;
  padding:7px; border-radius:14px; background:var(--surface); border:1px solid var(--border);
  box-shadow:0 10px 30px -12px rgba(0,0,0,.35); }
.v2-seg { display:flex; gap:3px; background:var(--surface-2); border-radius:10px; padding:3px; }
.v2-seg button { display:flex; align-items:center; gap:5px; border:0; background:transparent; cursor:pointer;
  font:inherit; font-size:12.5px; font-weight:600; color:var(--ink-soft); padding:5px 10px; border-radius:8px; }
.v2-seg button.on { background:var(--surface); color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,.12); }

.v2-shell { display:flex; min-height:100vh; }
.v2-side { width:248px; flex:0 0 248px; position:sticky; top:0; height:100vh; align-self:flex-start;
  background:var(--sidebar); color:var(--sidebar-ink); display:flex; flex-direction:column; padding:20px 14px 16px; gap:3px; }
.v2-brand { display:flex; align-items:center; gap:11px; padding:6px 10px 18px; }
.v2-mark { display:grid; place-items:center; width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.14); color:var(--sidebar-ink); }
.v2-brand h1 { font-size:17px; margin:0; line-height:1.05; }
.v2-brand span { display:block; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--sidebar-muted); margin-top:3px; }
.v2-nav { display:flex; flex-direction:column; gap:2px; }
.v2-navlink { display:flex; align-items:center; gap:12px; padding:9px 12px; border-radius:11px; color:var(--sidebar-muted);
  font-size:14.5px; font-weight:500; cursor:pointer; transition:background .15s ease,color .15s ease; }
.v2-navlink:hover { background:rgba(255,255,255,.08); color:var(--sidebar-ink); }
.v2-navlink.active { background:rgba(255,255,255,.15); color:#fff; font-weight:600; }
.v2-userchip { margin-top:auto; display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:14px; background:rgba(255,255,255,.07); }
.v2-userchip .who b { font-size:13px; font-weight:600; display:block; line-height:1.2; color:var(--sidebar-ink); }
.v2-userchip .who small { font-size:11px; color:var(--sidebar-muted); }
.v2-userchip .gear { margin-left:auto; color:var(--sidebar-muted); }

.v2-content { flex:1; min-width:0; position:relative; }
.v2-bg { position:absolute; inset:0; pointer-events:none; z-index:0; background:url(/images/landing.jpeg) center 28%/cover; opacity:.09; }
.v2.dark .v2-bg { opacity:.05; filter:saturate(.7) brightness(.7); }
.v2-inner { position:relative; z-index:1; max-width:1180px; margin:0 auto; display:grid; grid-template-columns:minmax(0,1fr) 318px; gap:30px; padding:26px 34px 70px; }
.v2-inner--profile { display:block; max-width:1040px; }
.v2-main { min-width:0; }

.v2-av { display:grid; place-items:center; border-radius:50%; overflow:hidden; color:#fff; font-weight:600; flex:0 0 auto; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }
.v2-av img { width:100%; height:100%; object-fit:cover; }

.v2-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:22px; }
.v2-head h2 { font-size:30px; margin:0; line-height:1; }
.v2-head .sub { color:var(--ink-soft); font-size:14px; margin-top:7px; }
.v2-toolbar { display:flex; align-items:center; gap:10px; }

.v2-search { display:flex; align-items:center; gap:9px; height:42px; padding:0 18px; min-width:300px; border-radius:999px;
  background:var(--surface); border:1px solid var(--border); color:var(--ink-soft); font-size:13.5px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.v2-iconbtn { position:relative; display:grid; place-items:center; width:42px; height:42px; border-radius:999px; background:var(--surface); border:1px solid var(--border); color:var(--ink-soft); cursor:pointer; transition:background .15s ease, color .15s ease; }
.v2-iconbtn:hover { color:var(--ink); }
.v2-iconbtn .dot { position:absolute; top:9px; right:10px; width:8px; height:8px; border-radius:50%; background:var(--cinnamon); border:2px solid var(--surface); }
.v2-iconbtn.bell:hover svg { animation:bell .6s ease; transform-origin:50% 4px; }
@keyframes bell { 0%,100%{transform:rotate(0)} 20%{transform:rotate(13deg)} 40%{transform:rotate(-11deg)} 60%{transform:rotate(7deg)} 80%{transform:rotate(-4deg)} }
.v2-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; padding:0 20px; border-radius:999px; border:0; cursor:pointer; font:inherit; font-weight:600; font-size:14px; transition:transform .12s ease, filter .15s ease, background .15s ease; }
.v2-btn:active { transform:scale(.97); }
.v2-btn-primary { background:var(--primary); color:var(--primary-ink); box-shadow:0 5px 13px -12px var(--primary); }
.v2-btn-primary:hover { filter:brightness(1.07); }
.v2-btn-ghost { background:var(--surface); color:var(--ink); border:1px solid var(--border); }
.v2-btn-ghost:hover { background:var(--surface-2); }
.v2-btn-soft { background:color-mix(in srgb, var(--cinnamon) 14%, var(--surface)); color:var(--cinnamon); }
.v2-btn-soft:hover { background:color-mix(in srgb, var(--cinnamon) 22%, var(--surface)); }
.v2-btn.sm { height:34px; padding:0 16px; font-size:13px; margin-top:11px; }
.v2-btn.sm2 { height:38px; padding:0 16px; font-size:13.5px; }
.v2-btn.block { width:100%; margin-top:20px; }

.v2-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-card); box-shadow:0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5); }

.v2-composer { display:flex; align-items:center; gap:13px; padding:14px 16px; margin-bottom:18px; }
.v2-composer .ph { flex:1; color:var(--ink-soft); font-size:14px; }
.v2-composer .acts { display:flex; gap:3px; }
.v2-chip { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:500; color:var(--ink-soft); padding:7px 11px; border-radius:999px; cursor:pointer; }
.v2-chip:hover { background:var(--surface-2); color:var(--ink); }

.v2-feed { display:flex; flex-direction:column; gap:16px; }
.v2-post { padding:17px 19px 14px; }
.v2-sheet .v2-post.sheet { border-bottom:1px solid var(--border); }
.v2-sheet .v2-post.sheet:last-child { border-bottom:0; }
.v2-post header { display:flex; align-items:center; gap:12px; }
.v2-post .who b { font-size:14.5px; font-weight:650; }
.v2-batchline { display:flex; align-items:center; gap:7px; margin-top:2px; font-size:11.5px; color:var(--ink-soft); }
.v2-batch { letter-spacing:.07em; text-transform:uppercase; font-weight:600; font-size:10.5px; color:var(--ink-soft); }
.dotsep { font-size:16px; line-height:0; position:relative; top:1px; opacity:.65; }
.v2-post .more { margin-left:auto; border:0; background:transparent; color:var(--ink-soft); cursor:pointer; font-size:18px; letter-spacing:1px; line-height:1; padding:4px 6px; border-radius:8px; }
.v2-post .more:hover { background:var(--surface-2); }
.v2-body { margin:12px 0 13px; line-height:1.7; font-size:15px; }
.v2-body b { font-weight:700; }

.v2-fund { margin:0 0 14px; }
.v2-fund .bar { height:9px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
.v2-fund .bar > i { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--blue))); }
.v2-fund .row { display:flex; justify-content:space-between; font-size:12px; color:var(--ink-soft); margin-top:7px; }

.v2-actions { display:flex; align-items:center; gap:8px; }
.v2-actions .act { display:inline-flex; align-items:center; gap:7px; border:0; background:transparent; cursor:pointer; font:inherit; font-size:13px; color:var(--ink-soft); padding:6px 10px; border-radius:999px; transition:background .15s, color .15s; }
.v2-actions .act:hover { background:var(--surface-2); color:var(--ink); }
.v2-actions .act.like.liked { color:var(--heart); }
.v2-actions .act.share { margin-left:auto; }
.heartwrap { display:inline-flex; }
.act.liked .heartwrap { animation:pop .4s cubic-bezier(.34,1.56,.64,1); }
@keyframes pop { 0%{transform:scale(1)} 45%{transform:scale(1.4)} 100%{transform:scale(1)} }
/* heart colour must be INSTANT (never fade through the dark default): only transform animates */
.v2-actions .act.like, .v2-actions .act.like svg, .heartwrap, .heartwrap svg { transition:transform .15s ease; }
.v2-actions .act.like.liked, .v2-actions .act.like.liked svg { color:var(--heart); fill:var(--heart); }

.v2-rail, .col-rail { display:flex; flex-direction:column; gap:16px; }
.v2-rail { margin-top:84px; }
.v2-railcard { padding:15px 16px; }
.v2-railcard h3 { font-size:10.5px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 12px; }
.v2-event { display:flex; gap:13px; align-items:flex-start; }
.v2-datechip { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; width:52px; height:56px; border-radius:14px; flex:0 0 auto; background:color-mix(in srgb, var(--cinnamon) 13%, var(--surface)); }
.v2-datechip .mon { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--cinnamon); }
.v2-datechip .day { font-size:21px; font-weight:700; line-height:1; color:var(--ink); }
.v2-event .ttl { font-size:14.5px; font-weight:600; }
.v2-event .loc { display:flex; align-items:center; gap:5px; color:var(--ink-soft); font-size:12.5px; margin-top:4px; }
.v2-railrow { display:flex; align-items:center; gap:11px; padding:7px 0; }
.v2-railrow + .v2-railrow { border-top:1px solid var(--border); }
.v2-railrow .nm { font-size:13.5px; font-weight:600; line-height:1.2; }
.v2-railrow .dt { font-size:11.5px; color:var(--ink-soft); margin-top:1px; }
.v2-grow { display:flex; align-items:center; padding:8px 0; font-size:13.5px; font-weight:600; }
.v2-grow + .v2-grow { border-top:1px solid var(--border); }
.v2-grow .cnt { margin-left:auto; font-size:12px; font-weight:600; color:var(--blue); }

/* profile */
.v2-profile { min-width:0; }
.v2-cover { overflow:visible; padding:0; }
.cover-photo { height:160px; background:url(/images/landing.jpeg) center 35%/cover; position:relative; border-radius:var(--r-card) var(--r-card) 0 0; }
.cover-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(20,30,22,.12), rgba(20,30,22,.32)); }
.cover-body { padding:0 24px 20px; }
.cover-top { display:flex; align-items:flex-end; gap:18px; }
.cover-top .v2-av { margin-top:-52px; position:relative; z-index:1; }
.cover-top .id { flex:1; min-width:0; padding-bottom:4px; }
.cover-top .id h2 { font-size:25px; margin:0; line-height:1.1; }
.cover-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px; font-size:12.5px; color:var(--ink-soft); }
.cover-meta .loc { display:inline-flex; align-items:center; gap:4px; }
.cover-actions { display:flex; gap:8px; padding-bottom:4px; }
.cover-bio { margin:15px 0 0; font-size:14.5px; line-height:1.65; max-width:64ch; }
.tag-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.v2-tag-soft { padding:5px 12px; border-radius:999px; font-size:12px; font-weight:600; background:color-mix(in srgb, var(--primary) 11%, transparent); color:var(--primary); }
.cover-stats { display:flex; gap:22px; margin-top:16px; padding-top:15px; border-top:1px solid var(--border); font-size:13px; color:var(--ink-soft); }
.cover-stats b { color:var(--ink); font-weight:700; }

.v2-inner--profile-cols { display:grid; grid-template-columns:minmax(0,1fr) 290px; gap:24px; margin-top:20px; }
.col-main { min-width:0; }
.profile-tabs { display:flex; gap:2px; border-bottom:1px solid var(--border); margin-bottom:16px; }
.profile-tabs button { border:0; background:transparent; cursor:pointer; font:inherit; font-size:13.5px; font-weight:600; color:var(--ink-soft); padding:9px 14px; position:relative; }
.profile-tabs button.on { color:var(--primary); }
.profile-tabs button.on::after { content:""; position:absolute; left:10px; right:10px; bottom:-1px; height:2.5px; border-radius:2px; background:var(--primary); }
.about-card { padding:18px 20px; }
.about-card h3 { font-size:13px; font-weight:700; margin:0 0 7px; }
.about-card p { font-size:14px; line-height:1.7; color:var(--ink); margin:0; }
.photos-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
.photos-grid img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:13px; border:1px solid var(--border); }
.fact { display:flex; align-items:center; gap:10px; padding:7px 0; font-size:13.5px; color:var(--ink); }
.fact svg { color:var(--ink-soft); flex:0 0 auto; }
.fact.link { cursor:pointer; }
.fact.link:hover { color:var(--primary); }
.fact.link:hover svg { color:var(--primary); }

/* login */
.v2-login { display:grid; grid-template-columns:1.4fr 1fr; min-height:100vh; }
.v2-login-photo { position:relative; overflow:hidden; }
.v2-login-photo img { width:100%; height:100%; object-fit:cover; }
.v2-login-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg, rgba(20,30,22,.28), rgba(20,30,22,.05)); }
.v2-login-mark { position:absolute; top:26px; left:28px; z-index:1; display:flex; align-items:center; gap:9px; color:#fff; font-family:var(--font-display),serif; font-size:16px; text-shadow:0 1px 8px rgba(0,0,0,.4); }
.v2-login-form { display:grid; place-items:center; padding:32px; background:var(--bg); }
.v2-formbox { width:100%; max-width:360px; text-align:center; }
.v2-hoopoe-stage { display:grid; place-items:center; height:108px; margin-bottom:6px; }
.v2-formbox h2 { font-size:27px; margin:0 0 7px; }
.v2-formbox .sub { color:var(--ink-soft); font-size:13.5px; line-height:1.5; margin:0 auto 22px; max-width:30ch; }
.v2-fl { display:block; text-align:left; font-size:13px; font-weight:600; margin:0 0 6px; }
.v2-fl-row { display:flex; align-items:center; justify-content:space-between; margin-top:13px; }
.v2-input { width:100%; height:46px; border-radius:var(--r-input); border:1px solid var(--border); background:var(--surface); padding:0 14px; color:var(--ink); font:inherit; font-size:14.5px; }
.v2-input::placeholder { color:color-mix(in srgb, var(--ink-soft) 75%, transparent); }
.v2-input:focus-visible { outline:2px solid color-mix(in srgb, var(--primary) 55%, transparent); outline-offset:1px; border-color:var(--primary); }
.v2-input-wrap { position:relative; }
.v2-eye { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:34px; height:34px; display:grid; place-items:center; border:0; background:transparent; color:var(--ink-soft); cursor:pointer; border-radius:999px; }
.v2-eye:hover { color:var(--ink); background:var(--surface-2); }
.v2-mutelink { color:var(--ink-soft); font-size:12.5px; cursor:pointer; }
.v2-foot { font-size:13.5px; color:var(--ink-soft); margin-top:18px; }
.v2-link { color:var(--primary); font-weight:600; cursor:pointer; }
.v2-link:hover { text-decoration:underline; }

.hoopoe .wing { transition:transform .42s cubic-bezier(.34,1.5,.64,1); }
.hoopoe .wing-l { transform-origin:24px 37px; }
.hoopoe .wing-r { transform-origin:40px 37px; }
.hoopoe:not(.covered) .wing-l { transform:rotate(-68deg) translate(-2px,2px); }
.hoopoe:not(.covered) .wing-r { transform:rotate(68deg) translate(2px,2px); }

@media (max-width:1080px){ .v2-inner{grid-template-columns:minmax(0,1fr);} .v2-rail{display:none;} .v2-inner--profile-cols{grid-template-columns:minmax(0,1fr);} .col-rail{display:none;} }
@media (max-width:720px){ .v2-side{display:none;} .v2-login{grid-template-columns:1fr;} .v2-login-photo{display:none;} }
`,
      }}
    />
  );
}
