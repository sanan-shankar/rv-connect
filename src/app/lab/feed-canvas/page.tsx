"use client";

/* ------------------------------------------------------------------ *
 *  Feed canvas — a DECISION page about making the feed feel full.
 *
 *  Three questions the owner posed:
 *    A. The right rail has "New in the directory" and "Your groups"
 *       (Events was removed). What else earns a place there?
 *    B. There is an empty rectangle to the right of "New post" and
 *       above "New in the directory". What should live in it?
 *    C. The signup account-type control: canopy vs cinnamon thumb?
 *
 *  Everything here is a self-contained mock with fake, local Rishi
 *  Valley content. Nothing touches core app files. Rail mocks are built
 *  at the REAL rail width (318px) with the real card treatment so
 *  proportions read true. Built on the shared DelightShell + _kit.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import {
  DelightShell,
  BirdAvatar,
  SpringPress,
  FadeRise,
  SPRINGS,
  motion,
} from "../_kit";
import { HoopoeMascot } from "../_hoopoe";

/* ------------------------------------------------------------------ *
 *  Tiny inline icons (stroke = currentColor). Self-contained so the
 *  page pulls in no icon library.
 * ------------------------------------------------------------------ */
type IcProps = { size?: number; className?: string };
const svg = (d: ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const IcSearch = ({ size }: IcProps) => svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></>, size);
const IcBell = ({ size }: IcProps) => svg(<><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, size);
const IcBookmark = ({ size }: IcProps) => svg(<path d="M6 4h12v16l-6-4-6 4z" />, size);
const IcChevron = ({ size }: IcProps) => svg(<path d="M9 6l6 6-6 6" />, size);
const IcPlus = ({ size }: IcProps) => svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>, size);
const IcFeather = ({ size }: IcProps) => svg(<><path d="M20 5c-6 0-11 4-13 10l-3 3" /><path d="M14 6l4 4" /><path d="M6 15h7" /></>, size);
const IcCamera = ({ size }: IcProps) => svg(<><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>, size);
const IcCake = ({ size }: IcProps) => svg(<><path d="M4 20h16v-7H4z" /><path d="M4 13c2 0 2 1.5 4 1.5S10 13 12 13s2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M12 6.5V9" /><circle cx="12" cy="5" r="0.6" fill="currentColor" /></>, size);
const IcSpark = ({ size }: IcProps) => svg(<path d="M12 3l1.9 5.6L19.6 10l-5.7 1.4L12 17l-1.9-5.6L4.4 10l5.7-1.4z" />, size);
const IcUsers = ({ size }: IcProps) => svg(<><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.4-3 2.8-4.6 5.5-4.6S14.1 16 14.5 19" /><path d="M16 6.5a3 3 0 0 1 0 6M18 19c-.2-2-1-3.4-2.4-4.2" /></>, size);

/* ================================================================== *
 *  Shared rail primitives (faithful to src/components/feed/feed-rail)
 * ================================================================== */
function MicroHead({ children }: { children: ReactNode }) {
  return <h3 className="fc-microhead">{children}</h3>;
}

function RailCard({
  label,
  children,
  accent = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section className={`fc-rail-card${accent ? " accent" : ""} ${className}`}>
      <MicroHead>{label}</MicroHead>
      {children}
    </section>
  );
}

function MemberRow({
  seed,
  species,
  name,
  meta,
  size = 38,
  trailing,
}: {
  seed: string;
  species?: number;
  name: string;
  meta: ReactNode;
  size?: number;
  trailing?: ReactNode;
}) {
  return (
    <div className="fc-row">
      <BirdAvatar user={{ id: seed, name, avatarSpecies: species }} size={size} />
      <div className="fc-row-txt">
        <span className="fc-row-name">{name}</span>
        <span className="fc-row-meta">{meta}</span>
      </div>
      {trailing}
    </div>
  );
}

/* ================================================================== *
 *  Interactive module bits (kept transform/opacity-only)
 * ================================================================== */
function QuickPoll() {
  const [pick, setPick] = useState<number | null>(null);
  const opts = [
    { label: "The banyan courtyard", pct: 54 },
    { label: "Rishi Konda at dawn", pct: 31 },
    { label: "The dining hall", pct: 15 },
  ];
  return (
    <div className="fc-poll">
      <p className="fc-poll-q">Which corner of the valley do you miss most?</p>
      {pick === null ? (
        <div className="fc-poll-opts">
          {opts.map((o, i) => (
            <SpringPress key={o.label} as="div" className="fc-poll-opt" {...({ role: "button", tabIndex: 0 } as object)} onClick={() => setPick(i)}>
              {o.label}
            </SpringPress>
          ))}
        </div>
      ) : (
        <div className="fc-poll-res">
          {opts.map((o, i) => (
            <div key={o.label} className={`fc-poll-bar${i === pick ? " mine" : ""}`}>
              <motion.span
                className="fc-poll-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: o.pct / 100 }}
                transition={SPRINGS.settle}
              />
              <span className="fc-poll-lab">{o.label}</span>
              <span className="fc-poll-pct">{o.pct}%</span>
            </div>
          ))}
          <p className="fc-poll-foot">312 voted · you picked {opts[pick].label.split(" ")[1] ?? "one"}</p>
        </div>
      )}
    </div>
  );
}

function ConnectRow({ seed, species, name, meta }: { seed: string; species?: number; name: string; meta: string }) {
  const [sent, setSent] = useState(false);
  return (
    <MemberRow
      seed={seed}
      species={species}
      name={name}
      meta={meta}
      size={38}
      trailing={
        <SpringPress className={`fc-connect${sent ? " sent" : ""}`} onClick={() => setSent((s) => !s)}>
          {sent ? "Requested" : "Connect"}
        </SpringPress>
      }
    />
  );
}

/* ================================================================== *
 *  The eleven candidate rail modules
 * ================================================================== */
function ModFromCollection() {
  return (
    <RailCard label="From the Collection">
      <div className="fc-photo">
        <div className="fc-photo-img fc-img-konda" />
        <div className="fc-photo-cap">
          <span className="fc-photo-title">Rishi Konda at first light</span>
          <span className="fc-photo-by">Meera Nair · Batch of &rsquo;09</span>
        </div>
      </div>
    </RailCard>
  );
}

function ModLetters() {
  return (
    <RailCard label="This week in Letters">
      <div className="fc-letter">
        <span className="fc-letter-kicker"><IcFeather size={13} /> New letter</span>
        <p className="fc-letter-title">What the old library taught me about slowness</p>
        <p className="fc-letter-first">I keep going back to the reading room on the first floor, the one with the</p>
        <p className="fc-letter-by">Arjun Rao · Batch of &rsquo;03 · 6 min read</p>
      </div>
    </RailCard>
  );
}

function ModBirthdays() {
  const people = [
    { seed: "bday-kavya", name: "Kavya Reddy", meta: "Batch of &rsquo;12 · today", sp: 22 },
    { seed: "bday-ishaan", name: "Ishaan Verma", meta: "Batch of &rsquo;07 · Thu", sp: 8 },
    { seed: "bday-tara", name: "Tara Menon", meta: "Batch of &rsquo;18 · Sat", sp: 33 },
  ];
  return (
    <RailCard label="Birthdays this week">
      <div className="fc-divide">
        {people.map((p) => (
          <MemberRow
            key={p.seed}
            seed={p.seed}
            species={p.sp}
            name={p.name}
            size={36}
            meta={<span dangerouslySetInnerHTML={{ __html: p.meta }} />}
            trailing={<span className="fc-cake"><IcCake size={16} /></span>}
          />
        ))}
      </div>
    </RailCard>
  );
}

function ModBatchActivity() {
  return (
    <RailCard label="Batch of 2011 this week">
      <div className="fc-stat-grid">
        <div className="fc-stat"><span className="fc-stat-n">9</span><span className="fc-stat-l">posts</span></div>
        <div className="fc-stat"><span className="fc-stat-n">3</span><span className="fc-stat-l">new members</span></div>
        <div className="fc-stat"><span className="fc-stat-n">1</span><span className="fc-stat-l">letter</span></div>
      </div>
      <div className="fc-facepile">
        {["ba1", "ba2", "ba3", "ba4"].map((s, i) => (
          <span key={s} className="fc-face" style={{ zIndex: 4 - i }}>
            <BirdAvatar user={{ id: s, name: s, avatarSpecies: (i * 7 + 3) % 50 }} size={26} ring />
          </span>
        ))}
        <span className="fc-face-more">+5</span>
      </div>
    </RailCard>
  );
}

function ModBirdOfWeek() {
  return (
    <RailCard label="Bird of the week">
      <div className="fc-bow">
        <div className="fc-bow-disc">
          <BirdAvatar user={{ id: "bow-roller-9214", name: "Indian roller", avatarSpecies: 3 }} size={72} />
        </div>
        <div className="fc-bow-txt">
          <p className="fc-bow-name">Indian roller</p>
          <p className="fc-bow-fact">Andhra&rsquo;s state bird. It tumbles mid-air in a flash of blue. Look along the wires on the school road at dusk.</p>
        </div>
      </div>
    </RailCard>
  );
}

function ModOnThisDay() {
  return (
    <RailCard label="On this day in the valley">
      <div className="fc-otd">
        <div className="fc-otd-thumb fc-img-monsoon" />
        <div className="fc-otd-txt">
          <p className="fc-otd-year">2014 · 12 years ago</p>
          <p className="fc-otd-line">The banyan courtyard the morning after the first monsoon rain.</p>
        </div>
      </div>
    </RailCard>
  );
}

function ModPoll() {
  return (
    <RailCard label="Quick poll">
      <QuickPoll />
    </RailCard>
  );
}

function ModPeople() {
  return (
    <RailCard label="People you may know">
      <div className="fc-divide">
        <ConnectRow seed="pyk-nikhil" species={20} name="Nikhil Iyer" meta="Also Batch of &rsquo;23" />
        <ConnectRow seed="pyk-sanya" species={4} name="Sanya Kapoor" meta="Also in Bangalore" />
      </div>
    </RailCard>
  );
}

function ModSaved() {
  return (
    <RailCard label="Saved">
      <SpringPress as="div" className="fc-saved" {...({ role: "button", tabIndex: 0 } as object)}>
        <span className="fc-saved-ic"><IcBookmark size={18} /></span>
        <span className="fc-saved-txt">
          <span className="fc-saved-n">7 saved posts</span>
          <span className="fc-saved-sub">Kept to read again</span>
        </span>
        <span className="fc-saved-go"><IcChevron size={16} /></span>
      </SpringPress>
    </RailCard>
  );
}

function ModPulse() {
  const rows = [
    { n: "18", label: "members joined this month", ic: <IcUsers size={15} /> },
    { n: "42", label: "letters written this term", ic: <IcFeather size={15} /> },
    { n: "6", label: "new photos in the Collection", ic: <IcCamera size={15} /> },
  ];
  return (
    <RailCard label="Community pulse">
      <div className="fc-pulse">
        {rows.map((r) => (
          <div key={r.label} className="fc-pulse-row">
            <span className="fc-pulse-ic">{r.ic}</span>
            <span className="fc-pulse-n">{r.n}</span>
            <span className="fc-pulse-l">{r.label}</span>
          </div>
        ))}
      </div>
    </RailCard>
  );
}

function ModHoopoe() {
  return (
    <RailCard label="A resident, resting">
      <div className="fc-perch-scene">
        <div className="fc-hoopoe"><HoopoeMascot size={72} pose="idle" /></div>
        <div className="fc-branch" />
        <span className="fc-leaf fc-leaf-a" />
        <span className="fc-leaf fc-leaf-b" />
      </div>
      <p className="fc-perch-note">He just sits here. Breathes, blinks once in a long while. No sound, no popups.</p>
    </RailCard>
  );
}

/* ================================================================== *
 *  Specimen wrapper: a module + its number + ship badge + caption
 * ================================================================== */
function Specimen({ n, ship, why, children }: { n: string; ship?: boolean; why: ReactNode; children: ReactNode }) {
  return (
    <figure className="fc-spec">
      <div className={`fc-spec-frame${ship ? " ship" : ""}`}>{children}</div>
      <figcaption className="fc-spec-cap">
        <span className="fc-spec-tag">
          <span className="fc-spec-n">{n}</span>
          {ship && <span className="fc-ship">Ship first</span>}
        </span>
        <p className="fc-spec-why">{why}</p>
      </figcaption>
    </figure>
  );
}

/* ================================================================== *
 *  SECTION B — treatments for the empty top-right rectangle
 *  Each mock renders the feed's top strip in context: the main-column
 *  header on the left, the 318px rectangle on the right.
 * ================================================================== */
function TopStrip({ children, action = "post", cluster = true }: { children: ReactNode; action?: "post" | "none"; cluster?: boolean }) {
  return (
    <div className="fc-strip">
      <div className="fc-strip-main">
        <div className="fc-strip-head">
          <div>
            <p className="fc-strip-title">Feed</p>
            <p className="fc-strip-sub">What the valley is sharing today.</p>
          </div>
          <div className="fc-strip-actions">
            {cluster && (
              <>
                <span className="fc-circ"><IcSearch size={17} /></span>
                <span className="fc-circ fc-circ-dot"><IcBell size={17} /></span>
              </>
            )}
            {action === "post" && (
              <span className="fc-newpost"><IcPlus size={16} /> New post</span>
            )}
          </div>
        </div>
        <div className="fc-strip-composer">
          <BirdAvatar user={{ id: "me-sanan", name: "Sanan" }} size={34} />
          <span className="fc-strip-composer-ph">Share a memory, a sighting, or a note for the valley</span>
        </div>
      </div>
      <div className="fc-strip-rect">{children}</div>
    </div>
  );
}

function Treatments() {
  return (
    <div className="fc-treatments">
      {/* 1 — greeting */}
      <div className="fc-treat">
        <TopStrip>
          <div className="fc-greet">
            <p className="fc-greet-hi">Good evening, Sanan</p>
            <p className="fc-greet-date">Friday, 3 July</p>
            <p className="fc-greet-almanac"><IcSpark size={12} /> The pied cuckoos are calling the monsoon in.</p>
          </div>
        </TopStrip>
        <p className="fc-treat-cap"><b>1 · Warm greeting strip.</b> Personal and alive, and the almanac line gives a reason to glance up. Tradeoff: it is decorative, and the greeting repeats every visit, so it must stay small.</p>
      </div>

      {/* 2 — relocate search + bell */}
      <div className="fc-treat">
        <TopStrip cluster={false} action="none">
          <div className="fc-corner-cluster">
            <span className="fc-cc-search"><IcSearch size={16} /> Search the valley</span>
            <span className="fc-circ fc-circ-dot"><IcBell size={17} /></span>
          </div>
        </TopStrip>
        <p className="fc-treat-cap"><b>2 · Search and notifications, moved to the corner.</b> Clears the header and pairs with the composer becoming the New post button (see the composer lineup). Tradeoff: only works if we adopt that composer direction, or the header looks bare.</p>
      </div>

      {/* 3 — directory promoted up */}
      <div className="fc-treat">
        <TopStrip>
          <div className="fc-promote">
            <MicroHead>New in the directory</MicroHead>
            <MemberRow seed="promo-vedant" species={2} name="Vedant Srihari" meta={<span dangerouslySetInnerHTML={{ __html: "Batch of &rsquo;21 · Bangalore" }} />} size={30} />
          </div>
        </TopStrip>
        <p className="fc-treat-cap"><b>3 · Promote &ldquo;New in the directory&rdquo; up.</b> You doubted this. Mocked honestly: it does fill the corner with no new module. Tradeoff: the rail no longer starts level with the composer, so the top edges stop lining up, which is the alignment we set on purpose.</p>
      </div>

      {/* 4 — collection ribbon */}
      <div className="fc-treat">
        <TopStrip>
          <div className="fc-ribbon fc-img-ribbon">
            <div className="fc-ribbon-scrim" />
            <span className="fc-ribbon-tag"><IcCamera size={12} /> The Valley Collection</span>
            <span className="fc-ribbon-title">The banyan in monsoon light</span>
          </div>
        </TopStrip>
        <p className="fc-treat-cap"><b>4 · A slim Collection ribbon.</b> A seasonal photo band, the low cousin of the rail module. Tradeoff: warm and grounding, but it is a second Collection touch if the rail already carries one, so pick one home for it.</p>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  SECTION C — account-type control colour
 * ================================================================== */
function AccountSeg({ tone }: { tone: "canopy" | "cinnamon" }) {
  const [pick, setPick] = useState(0);
  const opts = ["Alumnus", "Teacher", "Former teacher"];
  return (
    <div className={`fc-acct fc-acct-${tone}`}>
      <p className="fc-acct-label">I am a...</p>
      <div className="fc-acct-seg">
        {opts.map((o, i) => (
          <button key={o} type="button" className={`fc-acct-btn${pick === i ? " on" : ""}`} onClick={() => setPick(i)}>
            {pick === i && <motion.span layoutId={`acctThumb-${tone}`} className="fc-acct-thumb" transition={SPRINGS.snappy} />}
            <span className="fc-acct-txt">{o}</span>
          </button>
        ))}
      </div>
      <button type="button" className="fc-acct-join">Join</button>
    </div>
  );
}

/* ================================================================== *
 *  PAGE
 * ================================================================== */
export default function FeedCanvas() {
  return (
    <DelightShell
      title="Feed canvas"
      lede="Filling the feed's right side, and the empty corner above it. Eleven rail modules to react to (with a recommended three), four fixes for the empty top-right rectangle, and the account-type colour call. Every mock is fake local content at the real 318px rail width."
      css={CSS}
    >
      <div className="fc">
        {/* ---- Orientation: the two empty zones ---- */}
        <FadeRise>
          <section className="fc-intro">
            <div className="fc-intro-copy">
              <h2 className="v2-display">Two zones with room to grow.</h2>
              <p>
                The rail carries <b>New in the directory</b> and <b>Your groups</b> now; Events is gone. Two things
                are underused: the empty rectangle above the rail, and the quiet space the rail leaves as you
                scroll. This page fills both with things that are useful first and warm second.
              </p>
            </div>
            <div className="fc-map" aria-hidden>
              <div className="fc-map-sidebar" />
              <div className="fc-map-feed">
                <div className="fc-map-bar" />
                <div className="fc-map-tile" />
                <div className="fc-map-tile tall" />
              </div>
              <div className="fc-map-rail">
                <div className="fc-map-zone rect"><span>1 · empty rectangle</span></div>
                <div className="fc-map-card">New in the directory</div>
                <div className="fc-map-card">Your groups</div>
                <div className="fc-map-zone room"><span>2 · room in the rail</span></div>
              </div>
            </div>
          </section>
        </FadeRise>

        {/* ================= SECTION A ================= */}
        <div className="fc-sec-head">
          <span className="fc-sec-kicker">Section A</span>
          <h2 className="fc-sec-title v2-display">Right-rail modules</h2>
          <p className="fc-sec-lede">Eleven candidates at the real rail width. Three are marked <b>Ship first</b>: the ones that are useful, cheap to keep fresh, and warm. The rest are strong benchwarmers. Poll and Connect are live, tap them.</p>
        </div>

        <div className="fc-specimens">
          <Specimen n="01" ship why="A photo of the week from the Valley Collection. Evergreen warmth, real archive content, and a standing reason to open the Collection.">
            <ModFromCollection />
          </Specimen>
          <Specimen n="02" ship why="The newest Letter, title and first line. Pulls people into long-form and refreshes on its own every time someone writes.">
            <ModLetters />
          </Specimen>
          <Specimen n="03" ship why="Proof the place is alive: who joined, what got written, what got added. Cheap to compute, quietly reassuring, good for return visits.">
            <ModPulse />
          </Specimen>
          <Specimen n="04" why="A species spotlight that reuses the exact avatar glyphs. Charming and a touch educational, and it earns the bird theme its keep. Rotates weekly.">
            <ModBirdOfWeek />
          </Specimen>
          <Specimen n="05" why="Batchmates with a birthday this week, bird avatars and a soft nudge to reach out. Warm, but only useful to people with a full batch on the site.">
            <ModBirthdays />
          </Specimen>
          <Specimen n="06" why="An archive moment tied to today's date. Nostalgic and lovely, but leans on a well-dated Collection to never repeat or run dry.">
            <ModOnThisDay />
          </Specimen>
          <Specimen n="07" why="A one-tap community question. Genuinely engaging and it seeds gentle conversation, but someone has to keep writing good prompts.">
            <ModPoll />
          </Specimen>
          <Specimen n="08" why="People from your batch or city you have not connected with yet. Useful for growing the graph, though it edges toward the social-network feel we keep light.">
            <ModPeople />
          </Specimen>
          <Specimen n="09" why="A quiet shortcut to what you saved. Handy once people actually save things; near useless on day one, so it should appear only when non-empty.">
            <ModSaved />
          </Specimen>
          <Specimen n="10" why="A per-batch snapshot with a small face pile. Nice for tight batches; weak for anyone whose batch is barely here yet.">
            <ModBatchActivity />
          </Specimen>
          <Specimen n="11" why="The resting hoopoe, with restraint. Your worry was that a mascot gets tiring in your face. This is the opposite: one small bird at the rail bottom, mostly still, a rare blink, no sound. Easy to ignore, there when you look.">
            <ModHoopoe />
          </Specimen>
        </div>

        {/* recommended composed rail */}
        <div className="fc-sub-head">
          <h3 className="v2-display">The rail I would ship</h3>
          <p>The two cards you have now, plus the three marked above. Proposed cards carry a canopy edge. This is the full rail at its real 318px width.</p>
        </div>

        <div className="fc-composed">
          <div className="fc-composed-rail">
            <RailCard label="New in the directory">
              <div className="fc-divide">
                <MemberRow seed="rc-vedant" species={2} name="Vedant Srihari" meta={<span dangerouslySetInnerHTML={{ __html: "Batch of &rsquo;21 · Bangalore" }} />} />
                <MemberRow seed="rc-ananya" species={8} name="Ananya Krishnan" meta={<span dangerouslySetInnerHTML={{ __html: "Batch of &rsquo;08" }} />} />
                <MemberRow seed="rc-rohan" species={0} name="Rohan Mehta" meta={<span dangerouslySetInnerHTML={{ __html: "Batch of &rsquo;96" }} />} />
              </div>
            </RailCard>
            <RailCard label="Your groups">
              <div className="fc-groups">
                {[["Birdwatchers of the valley", 34], ["Batch of 2011", 61], ["The old library club", 12]].map(([g, n]) => (
                  <div key={g as string} className="fc-group"><span>{g}</span><span className="fc-group-n">{n}</span></div>
                ))}
              </div>
            </RailCard>
            <div className="fc-tagged"><span className="fc-tagged-lab">proposed</span><ModFromCollection /></div>
            <div className="fc-tagged"><span className="fc-tagged-lab">proposed</span><ModLetters /></div>
            <div className="fc-tagged"><span className="fc-tagged-lab">proposed</span><ModPulse /></div>
          </div>
          <div className="fc-composed-note">
            <h4>Why these three</h4>
            <ul>
              <li><b>From the Collection</b> carries the warmth and never goes stale.</li>
              <li><b>This week in Letters</b> refreshes itself and feeds the Letters habit.</li>
              <li><b>Community pulse</b> answers &ldquo;is anyone here&rdquo; on every visit.</li>
            </ul>
            <p className="fc-composed-soft">
              If you want one character in the mix, add the resting hoopoe at the very bottom, below the fold, where it is a reward for scrolling rather than a greeter. Birthdays and the poll are the next two to add once the community is denser.
            </p>
          </div>
        </div>

        {/* ================= SECTION B ================= */}
        <div className="fc-sec-head">
          <span className="fc-sec-kicker">Section B</span>
          <h2 className="fc-sec-title v2-display">The empty top-right rectangle</h2>
          <p className="fc-sec-lede">The space to the right of New post and above the rail. Four honest treatments in context, each with its tradeoff. The header, composer and rectangle are drawn at close-to-real proportions.</p>
        </div>
        <Treatments />

        {/* ================= SECTION C ================= */}
        <div className="fc-sec-head">
          <span className="fc-sec-kicker">Section C</span>
          <h2 className="fc-sec-title v2-display">Account-type control, the colour</h2>
          <p className="fc-sec-lede">The signup &ldquo;I am a...&rdquo; control, with the selected thumb in canopy versus cinnamon. Tap the options; the Join button sits under each so you can judge them together.</p>
        </div>

        <div className="fc-acct-compare">
          <div className="fc-acct-cell">
            <AccountSeg tone="canopy" />
            <p className="fc-acct-cap"><b>Canopy #235C49.</b> On-system: selection uses the same green as every CTA, so the thumb and the Join button read as one system. White text clears AA comfortably, about 7.5 to 1.</p>
          </div>
          <div className="fc-acct-cell">
            <AccountSeg tone="cinnamon" />
            <p className="fc-acct-cap"><b>Cinnamon #C2622F.</b> Reads as a warning or an accent, not a selection, and it competes with the canopy Join button right below it. White text is borderline, about 4.4 to 1, and worse at 13px.</p>
          </div>
        </div>
        <div className="fc-verdict">
          <span className="fc-verdict-dot" />
          <p><b>Recommendation: canopy.</b> Selection should be the brand green everywhere; cinnamon is our accent for the hoopoe, saved, and highlights, and putting it on a chosen segment reads as alarm rather than choice. Canopy also keeps the thumb and Join in one voice.</p>
        </div>

        <p className="fc-closing">
          These are options, not a plan. Tell me which rail modules to build, which rectangle treatment to take, and I will wire the chosen set into the real feed against the shared rail-card kit.
        </p>
      </div>
    </DelightShell>
  );
}

/* ================================================================== */
const CSS = `
.fc {
  --canopy:#235C49; --leaf:#1F8A4C; --cinnamon:#C2622F; --sky:#3F7CA6; --heart:#E03A33;
  --paper:#F6F2E8; --page:#E7E1D3; --mist:#EEE8DA; --ink:#23241E; --soft:#6E7268; --hair:#E0D8C8;
  --rail:318px; --rc:16px;
  --sh-card:0 1px 2px rgba(30,28,22,.04), 0 18px 40px -28px rgba(30,28,22,.5);
  color:var(--ink);
}
.fc * { box-sizing:border-box; }

/* ---- section chrome ---- */
.fc-sec-head { margin:56px 0 22px; }
.fc-sec-kicker { display:inline-block; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--cinnamon);
  background:color-mix(in srgb, var(--cinnamon) 10%, var(--paper)); border:1px solid color-mix(in srgb, var(--cinnamon) 22%, var(--hair));
  padding:4px 11px; border-radius:999px; }
.fc-sec-title { font-size:27px; margin:12px 0 8px; letter-spacing:-.015em; }
.fc-sec-lede { font-size:14px; line-height:1.6; color:var(--soft); max-width:66ch; margin:0; }
.fc-sec-lede b { color:var(--ink); }

.fc-sub-head { margin:40px 0 18px; }
.fc-sub-head h3 { font-size:19px; margin:0 0 6px; }
.fc-sub-head p { font-size:13.5px; line-height:1.55; color:var(--soft); margin:0; max-width:70ch; }
.fc-sub-head b { color:var(--ink); }

/* ---- intro / map ---- */
.fc-intro { display:grid; grid-template-columns:1fr 460px; gap:30px; align-items:center;
  background:var(--paper); border:1px solid var(--hair); border-radius:20px; padding:26px 28px; box-shadow:var(--sh-card); }
.fc-intro-copy h2 { font-size:25px; margin:0 0 12px; letter-spacing:-.015em; }
.fc-intro-copy p { font-size:14.5px; line-height:1.65; color:var(--ink); margin:0; max-width:56ch; }
.fc-intro-copy b { font-weight:700; }
.fc-map { display:grid; grid-template-columns:34px 1fr 132px; gap:9px; height:210px; background:var(--page); border:1px solid var(--hair);
  border-radius:16px; padding:10px; }
.fc-map-sidebar { background:var(--canopy); border-radius:8px; opacity:.9; }
.fc-map-feed { display:flex; flex-direction:column; gap:8px; }
.fc-map-bar { height:26px; background:var(--paper); border:1px solid var(--hair); border-radius:8px; }
.fc-map-tile { flex:1; background:var(--paper); border:1px solid var(--hair); border-radius:10px; }
.fc-map-tile.tall { flex:2; }
.fc-map-rail { display:flex; flex-direction:column; gap:8px; }
.fc-map-card { font-size:8.5px; font-weight:700; color:var(--soft); background:var(--paper); border:1px solid var(--hair); border-radius:8px;
  padding:8px 8px; text-transform:uppercase; letter-spacing:.04em; line-height:1.2; }
.fc-map-zone { position:relative; border:1.5px dashed color-mix(in srgb, var(--cinnamon) 60%, transparent); border-radius:8px;
  background:color-mix(in srgb, var(--cinnamon) 8%, transparent); display:grid; place-items:center; }
.fc-map-zone.rect { height:34px; } .fc-map-zone.room { flex:1; min-height:34px; }
.fc-map-zone span { font-size:8px; font-weight:800; color:var(--cinnamon); text-transform:uppercase; letter-spacing:.05em; text-align:center; padding:0 4px; }

/* ---- rail card (faithful) ---- */
.fc-rail-card { width:var(--rail); background:var(--paper); border:1px solid var(--hair); border-radius:var(--rc); padding:16px; box-shadow:var(--sh-card); }
.fc-rail-card.accent { border-left:3px solid var(--canopy); }
.fc-microhead { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.13em; color:var(--soft); margin:0 0 6px; }

/* rows */
.fc-divide > .fc-row + .fc-row { border-top:1px solid var(--hair); }
.fc-row { display:flex; align-items:center; gap:12px; padding:9px 0; min-width:0; }
.fc-row-txt { display:flex; flex-direction:column; gap:4px; min-width:0; flex:1; }
.fc-row-name { font-size:13.5px; font-weight:600; color:var(--ink); line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-row-meta { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--soft); line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-cake { color:var(--cinnamon); display:inline-grid; place-items:center; flex-shrink:0; }

/* From the Collection */
.fc-photo { border-radius:12px; overflow:hidden; position:relative; }
.fc-photo-img { height:150px; }
.fc-img-konda { background:
  radial-gradient(120% 80% at 30% 120%, rgba(31,138,76,.55), transparent 60%),
  linear-gradient(180deg, #d8b784 0%, #c79a5c 34%, #6f7f52 70%, #3d5540 100%); }
.fc-photo-cap { position:absolute; left:0; right:0; bottom:0; padding:26px 12px 10px;
  background:linear-gradient(to top, rgba(20,22,16,.72), transparent); display:flex; flex-direction:column; gap:2px; }
.fc-photo-title { font-family:var(--font-display),Georgia,serif; font-size:14px; color:#fff; letter-spacing:-.01em; }
.fc-photo-by { font-size:10.5px; font-weight:600; color:rgba(255,255,255,.82); text-transform:uppercase; letter-spacing:.05em; }

/* Letters */
.fc-letter { display:flex; flex-direction:column; gap:6px; }
.fc-letter-kicker { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--leaf); }
.fc-letter-title { font-family:var(--font-display),Georgia,serif; font-size:15.5px; line-height:1.25; color:var(--ink); margin:0; letter-spacing:-.01em; }
.fc-letter-first { font-size:12.5px; line-height:1.45; color:var(--soft); margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.fc-letter-by { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--soft); margin:2px 0 0; }

/* Bird of the week */
.fc-bow { display:flex; align-items:center; gap:13px; }
.fc-bow-disc { flex:0 0 auto; width:92px; height:92px; border-radius:16px; display:grid; place-items:center;
  background:radial-gradient(110% 110% at 50% 25%, color-mix(in srgb, var(--sky) 16%, var(--mist)), var(--mist));
  border:1px solid var(--hair); }
.fc-bow-name { font-family:var(--font-display),Georgia,serif; font-size:15px; margin:0 0 4px; letter-spacing:-.01em; }
.fc-bow-fact { font-size:12px; line-height:1.5; color:var(--soft); margin:0; }

/* On this day */
.fc-otd { display:flex; gap:12px; align-items:center; }
.fc-otd-thumb { flex:0 0 auto; width:64px; height:64px; border-radius:12px; border:1px solid var(--hair); }
.fc-img-monsoon { background:linear-gradient(150deg, #8fae7e 0%, #56744d 55%, #33463a 100%); }
.fc-otd-year { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--cinnamon); margin:0 0 4px; }
.fc-otd-line { font-size:12.5px; line-height:1.45; color:var(--ink); margin:0; }

/* Community pulse */
.fc-pulse { display:flex; flex-direction:column; gap:11px; }
.fc-pulse-row { display:flex; align-items:center; gap:10px; }
.fc-pulse-ic { display:grid; place-items:center; width:26px; height:26px; border-radius:8px; color:var(--canopy);
  background:color-mix(in srgb, var(--canopy) 10%, var(--paper)); flex:0 0 auto; }
.fc-pulse-n { font-family:var(--font-display),Georgia,serif; font-size:18px; color:var(--ink); min-width:24px; }
.fc-pulse-l { font-size:12px; color:var(--soft); line-height:1.3; }

/* poll */
.fc-poll-q { font-size:13px; font-weight:600; color:var(--ink); margin:0 0 10px; line-height:1.35; }
.fc-poll-opts { display:flex; flex-direction:column; gap:7px; }
.fc-poll-opt { font-size:12.5px; font-weight:600; color:var(--canopy); text-align:left; padding:9px 13px; border-radius:999px; cursor:pointer;
  background:color-mix(in srgb, var(--canopy) 7%, var(--paper)); border:1px solid color-mix(in srgb, var(--canopy) 22%, var(--hair)); }
.fc-poll-res { display:flex; flex-direction:column; gap:7px; }
.fc-poll-bar { position:relative; height:32px; border-radius:8px; overflow:hidden; background:var(--mist); border:1px solid var(--hair); display:flex; align-items:center; padding:0 11px; }
.fc-poll-fill { position:absolute; left:0; top:0; bottom:0; width:100%; transform-origin:left; background:color-mix(in srgb, var(--canopy) 16%, var(--paper)); }
.fc-poll-bar.mine .fc-poll-fill { background:color-mix(in srgb, var(--canopy) 26%, var(--paper)); }
.fc-poll-lab { position:relative; font-size:12px; font-weight:600; color:var(--ink); z-index:1; }
.fc-poll-pct { position:relative; margin-left:auto; font-size:11.5px; font-weight:700; color:var(--canopy); z-index:1; }
.fc-poll-foot { font-size:10.5px; color:var(--soft); margin:3px 0 0; }

/* connect */
.fc-connect { font-size:12px; font-weight:700; color:var(--canopy); background:color-mix(in srgb, var(--canopy) 9%, var(--paper));
  border:1px solid color-mix(in srgb, var(--canopy) 26%, var(--hair)); border-radius:999px; padding:6px 13px; cursor:pointer; flex:0 0 auto; }
.fc-connect.sent { color:var(--soft); background:var(--mist); border-color:var(--hair); }

/* saved */
.fc-saved { display:flex; align-items:center; gap:12px; cursor:pointer; padding:3px 0; }
.fc-saved-ic { display:grid; place-items:center; width:38px; height:38px; border-radius:11px; color:var(--cinnamon);
  background:color-mix(in srgb, var(--cinnamon) 10%, var(--paper)); flex:0 0 auto; }
.fc-saved-txt { display:flex; flex-direction:column; gap:3px; flex:1; }
.fc-saved-n { font-size:13.5px; font-weight:600; color:var(--ink); line-height:1; }
.fc-saved-sub { font-size:11px; color:var(--soft); line-height:1; }
.fc-saved-go { color:var(--soft); }

/* batch activity */
.fc-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:13px; }
.fc-stat { display:flex; flex-direction:column; align-items:center; gap:2px; padding:9px 4px; border-radius:11px; background:var(--mist); border:1px solid var(--hair); }
.fc-stat-n { font-family:var(--font-display),Georgia,serif; font-size:20px; color:var(--ink); line-height:1; }
.fc-stat-l { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--soft); }
.fc-facepile { display:flex; align-items:center; }
.fc-face { margin-left:-8px; }
.fc-face:first-child { margin-left:0; }
.fc-face-more { margin-left:8px; font-size:11.5px; font-weight:700; color:var(--soft); }

/* groups (composed rail) */
.fc-groups > .fc-group + .fc-group { border-top:1px solid var(--hair); }
.fc-group { display:flex; align-items:center; padding:9px 0; font-size:13.5px; font-weight:600; color:var(--ink); }
.fc-group span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-group-n { margin-left:auto; padding-left:12px; font-size:12px; font-weight:700; color:var(--sky); }

/* resting hoopoe */
.fc-perch-scene { position:relative; height:120px; border-radius:12px; overflow:hidden; border:1px solid var(--hair);
  background:radial-gradient(130% 120% at 50% 4%, color-mix(in srgb, var(--cinnamon) 9%, var(--mist)), var(--mist)); }
.fc-hoopoe { position:absolute; left:50%; bottom:20px; transform:translateX(-50%); }
.fc-branch { position:absolute; left:16%; right:16%; bottom:22px; height:5px; border-radius:3px;
  background:linear-gradient(90deg, transparent, var(--cinnamon) 22%, #9a5127 80%, transparent); opacity:.75; }
.fc-leaf { position:absolute; width:14px; height:9px; border-radius:0 60% 0 60%; background:color-mix(in srgb, var(--leaf) 62%, var(--mist)); opacity:.7; }
.fc-leaf-a { left:20%; bottom:24px; transform:rotate(-24deg); }
.fc-leaf-b { right:22%; bottom:24px; transform:rotate(30deg) scaleX(-1); }
.fc-perch-note { font-size:12px; line-height:1.5; color:var(--soft); margin:11px 0 0; }

/* ---- specimen grid ---- */
.fc-specimens { display:grid; grid-template-columns:repeat(auto-fill, var(--rail)); gap:30px 26px; justify-content:center; }
.fc-spec { margin:0; }
.fc-spec-frame { position:relative; border-radius:20px; }
.fc-spec-frame.ship::after { content:""; position:absolute; inset:-7px; border-radius:22px; pointer-events:none;
  border:1.5px solid color-mix(in srgb, var(--canopy) 40%, transparent); }
.fc-spec-cap { margin-top:14px; width:var(--rail); }
.fc-spec-tag { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.fc-spec-n { font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--soft); background:var(--paper); border:1px solid var(--hair); border-radius:7px; padding:2px 8px; }
.fc-ship { font-size:9.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#fff; background:var(--canopy); border-radius:999px; padding:3px 9px; }
.fc-spec-why { font-size:12.5px; line-height:1.55; color:var(--soft); margin:0; }

/* ---- composed rail ---- */
.fc-composed { display:grid; grid-template-columns:calc(var(--rail) + 44px) 1fr; gap:34px; align-items:start; }
.fc-composed-rail { display:flex; flex-direction:column; gap:16px; padding:22px; border-radius:20px;
  background:var(--page); border:1px solid var(--hair); }
.fc-tagged { position:relative; }
.fc-tagged-lab { position:absolute; top:-9px; right:12px; z-index:1; font-size:9px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
  color:#fff; background:var(--canopy); border-radius:999px; padding:3px 9px; box-shadow:0 4px 10px -6px var(--canopy); }
.fc-tagged .fc-rail-card { border-left:3px solid var(--canopy); }
.fc-composed-note h4 { font-family:var(--font-display),Georgia,serif; font-size:17px; margin:2px 0 12px; letter-spacing:-.01em; }
.fc-composed-note ul { margin:0 0 16px; padding:0; list-style:none; display:flex; flex-direction:column; gap:9px; }
.fc-composed-note li { font-size:13.5px; line-height:1.5; color:var(--ink); padding-left:18px; position:relative; }
.fc-composed-note li::before { content:""; position:absolute; left:0; top:8px; width:7px; height:7px; border-radius:50%; background:var(--canopy); }
.fc-composed-note b { font-weight:700; }
.fc-composed-soft { font-size:13px; line-height:1.6; color:var(--soft); margin:0; }

/* ---- Section B: top strip ---- */
.fc-treatments { display:flex; flex-direction:column; gap:26px; }
.fc-treat { }
.fc-strip { display:grid; grid-template-columns:1fr var(--rail); gap:30px; align-items:start;
  background:var(--page); border:1px solid var(--hair); border-radius:18px; padding:22px 24px; }
.fc-strip-main { min-width:0; }
.fc-strip-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
.fc-strip-title { font-family:var(--font-display),Georgia,serif; font-size:28px; line-height:1; letter-spacing:-.02em; color:var(--ink); margin:0; }
.fc-strip-sub { font-size:13px; color:var(--soft); margin:8px 0 0; }
.fc-strip-actions { display:flex; align-items:center; gap:9px; flex:0 0 auto; }
.fc-circ { display:grid; place-items:center; width:40px; height:40px; border-radius:999px; background:var(--paper); border:1px solid var(--hair); color:var(--ink); position:relative; }
.fc-circ-dot::after { content:""; position:absolute; top:9px; right:10px; width:7px; height:7px; border-radius:50%; background:var(--heart); border:1.5px solid var(--paper); }
.fc-newpost { display:inline-flex; align-items:center; gap:7px; height:40px; padding:0 18px; border-radius:999px; background:var(--canopy); color:#fff; font-size:14px; font-weight:600; box-shadow:0 6px 16px -10px var(--canopy); }
.fc-strip-composer { display:flex; align-items:center; gap:12px; height:58px; padding:0 12px 0 14px; border-radius:999px; background:var(--paper); border:1px solid var(--hair); box-shadow:var(--sh-card); }
.fc-strip-composer-ph { font-size:14px; color:var(--soft); }
.fc-strip-rect { min-height:76px; }
.fc-treat-cap { font-size:13px; line-height:1.55; color:var(--soft); margin:12px 2px 0; max-width:96ch; }
.fc-treat-cap b { color:var(--ink); font-weight:700; }

/* treatment 1: greeting */
.fc-greet { height:100%; min-height:76px; display:flex; flex-direction:column; justify-content:center; gap:4px;
  background:linear-gradient(135deg, color-mix(in srgb, var(--cinnamon) 9%, var(--paper)), var(--paper));
  border:1px solid var(--hair); border-radius:14px; padding:14px 16px; box-shadow:var(--sh-card); }
.fc-greet-hi { font-family:var(--font-display),Georgia,serif; font-size:18px; letter-spacing:-.01em; color:var(--ink); margin:0; }
.fc-greet-date { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--soft); margin:0; }
.fc-greet-almanac { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--cinnamon); margin:5px 0 0; }

/* treatment 2: corner cluster */
.fc-corner-cluster { display:flex; align-items:center; justify-content:flex-end; gap:9px; height:100%; min-height:76px; }
.fc-cc-search { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 16px; border-radius:999px; background:var(--paper);
  border:1px solid var(--hair); color:var(--soft); font-size:13px; font-weight:500; flex:1; max-width:210px; }

/* treatment 3: promoted directory */
.fc-promote { background:var(--paper); border:1px solid var(--hair); border-radius:14px; padding:12px 14px; box-shadow:var(--sh-card); }
.fc-promote .fc-row { padding:6px 0 0; }

/* treatment 4: collection ribbon */
.fc-ribbon { position:relative; height:100%; min-height:76px; border-radius:14px; overflow:hidden; border:1px solid var(--hair); display:flex; flex-direction:column; justify-content:flex-end; padding:11px 14px; }
.fc-img-ribbon { background:linear-gradient(110deg, #6f8a55 0%, #47623f 48%, #2f4636 100%); }
.fc-ribbon-scrim { position:absolute; inset:0; background:linear-gradient(to top, rgba(20,22,16,.5), transparent 70%); }
.fc-ribbon-tag { position:relative; display:inline-flex; align-items:center; gap:5px; font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,.9); margin-bottom:4px; }
.fc-ribbon-title { position:relative; font-family:var(--font-display),Georgia,serif; font-size:15px; color:#fff; letter-spacing:-.01em; }

/* ---- Section C: account seg ---- */
.fc-acct-compare { display:grid; grid-template-columns:1fr 1fr; gap:22px; }
.fc-acct-cell { background:var(--paper); border:1px solid var(--hair); border-radius:18px; padding:22px; box-shadow:var(--sh-card); }
.fc-acct { max-width:360px; }
.fc-acct-label { font-size:13px; font-weight:600; color:var(--ink); margin:0 0 8px; }
.fc-acct-seg { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; border:1px solid var(--hair); background:var(--page); border-radius:999px; padding:5px; }
.fc-acct-btn { position:relative; border:0; background:transparent; cursor:pointer; font:inherit; font-size:13px; font-weight:500; padding:8px 6px; border-radius:999px; color:var(--soft); transition:transform .15s var(--ease-spring); }
.fc-acct-btn.on { color:#fff; font-weight:600; }
.fc-acct-btn:hover { color:var(--ink); }
.fc-acct-btn.on:hover { color:#fff; }
.fc-acct-btn:focus-visible { outline:2px solid var(--canopy); outline-offset:2px; }
.fc-acct-btn:active { transform:scale(.95); }
.fc-acct-txt { position:relative; z-index:1; }
.fc-acct-thumb { position:absolute; inset:0; border-radius:999px; z-index:0; }
.fc-acct-canopy .fc-acct-thumb { background:#235C49; }
.fc-acct-cinnamon .fc-acct-thumb { background:#C2622F; }
.fc-acct-join { margin-top:16px; width:100%; height:44px; border:0; border-radius:999px; background:#235C49; color:#fff; font:inherit; font-size:14.5px; font-weight:600; cursor:pointer; box-shadow:0 6px 16px -11px #235C49; transition:transform .15s var(--ease-spring), opacity .15s var(--ease-spring); }
.fc-acct-join:hover { opacity:.92; }
.fc-acct-join:focus-visible { outline:2px solid var(--canopy); outline-offset:2px; }
.fc-acct-join:active { transform:scale(.97); }
.fc-acct-cap { font-size:12.5px; line-height:1.55; color:var(--soft); margin:16px 0 0; }
.fc-acct-cap b { color:var(--ink); }

.fc-verdict { display:flex; gap:12px; align-items:flex-start; margin-top:18px; background:color-mix(in srgb, var(--canopy) 7%, var(--paper));
  border:1px solid color-mix(in srgb, var(--canopy) 24%, var(--hair)); border-radius:14px; padding:15px 17px; }
.fc-verdict-dot { flex:0 0 auto; width:10px; height:10px; border-radius:50%; background:var(--canopy); margin-top:5px; }
.fc-verdict p { font-size:13.5px; line-height:1.6; color:var(--ink); margin:0; }
.fc-verdict b { font-weight:700; }

.fc-closing { margin:52px 0 0; padding:20px 22px; background:var(--mist); border:1px solid var(--hair); border-radius:16px;
  font-size:14px; line-height:1.65; color:var(--ink); }

/* ---- responsive ---- */
@media (max-width:1040px){
  .fc-intro { grid-template-columns:1fr; }
  .fc-map { max-width:460px; }
  .fc-composed { grid-template-columns:1fr; gap:24px; }
  .fc-composed-rail { align-items:center; }
}
@media (max-width:900px){
  .fc-acct-compare { grid-template-columns:1fr; }
  .fc-strip { grid-template-columns:1fr; gap:18px; }
  .fc-strip-rect { min-height:0; }
}
@media (max-width:680px){
  .fc-sec-title { font-size:23px; }
  .fc-strip-title { font-size:24px; }
  .fc-strip-actions { gap:7px; }
  .fc-newpost { padding:0 14px; font-size:13px; }
}
`;
