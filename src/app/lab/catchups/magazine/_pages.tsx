"use client";

/* ------------------------------------------------------------------ *
 *  Drawing what the engine decided.
 *
 *  A `Magazine` is pages of blocks, each a whole number of baseline rows
 *  tall. This draws them and nothing more: no rule about content lives
 *  here, only how a block looks. Every measurement is in millimetres
 *  because the paper is, and one row is `--row` (5.3mm, the 15pt body
 *  leading), so a block's `rows` is its height.
 *
 *  The same markup prints and shows: `@page` and `break-after` are the
 *  only print-specific lines. The lab adds nothing inside a page, so what
 *  headless Chrome prints from `?print=1` is exactly what the room shows.
 *
 *  Type: Libre Baskerville for the question, the cover and a quote;
 *  Source Sans 3 for everything read at length. Warm paper, never white;
 *  ink, never black; the reader's cinnamon mark above every question, so
 *  a page says which app it came from without a logo.
 * ------------------------------------------------------------------ */

import { BirdAvatar } from "@/components/common/bird-avatar";
import { ArrowUpRight, MusicNotes } from "@phosphor-icons/react";
import { renderRichText } from "@/lib/rich-text";
import { linkRanges } from "@/lib/link-preview-core";
import { durationLabel, safeCut, visibleText } from "@/lib/magazine/measure";
import { rowsPerPage, spanMm, type Block, type MagPerson, type MagPhoto, type Magazine, type Page, type PhotoPlacement, type TextBlock } from "@/lib/magazine/types";
import { formatDisplayDateLong, metaLine } from "@/lib/utils";

/* ── The stylesheet ────────────────────────────────────────────────── */

export const PAGE_CSS = `
@page { size: A4; margin: 0; }
.mz-sheet { --row: 5.3mm; --paper: #F5F2EA; --ink: #23241E; --muted: #5F6359; --cinnamon: #C2622F; --canopy: #235C49; --hair: #DFD8CB;
  display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0 48px; background: #E4E1D5; color: var(--ink);
  font-family: var(--font-body), 'Source Sans 3', sans-serif; font-size: 10.5pt; line-height: var(--row); -webkit-font-smoothing: antialiased; }
.mz-sheet.print { gap: 0; padding: 0; background: none; }
.mz-page { position: relative; width: 210mm; height: 297mm; background: var(--paper); overflow: hidden; box-shadow: 0 10px 30px -18px rgba(35,36,30,.45), 0 1px 0 rgba(35,36,30,.06); break-after: page; page-break-after: always; }
.mz-sheet.print .mz-page { box-shadow: none; }
.mz-sheet.print > div:last-child .mz-page { break-after: auto; page-break-after: auto; }
.mz-body { position: absolute; left: 14mm; right: 14mm; top: 16mm; bottom: 18mm; display: flex; flex-direction: column; }
.mz-block { flex: none; position: relative; }
.mz-block[data-overflow="1"] { outline: 0.6mm solid #E03A33; outline-offset: -0.6mm; }
.mz-sheet.print .mz-block[data-overflow="1"] { outline: none; }
.mz-folio { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; display: flex; justify-content: space-between; gap: 6mm; font-size: 8pt; line-height: 1; color: var(--muted); letter-spacing: .01em; }
.mz-folio .mz-run { flex: 1; text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mz-folio .mz-num { font-variant-numeric: tabular-nums; }
.mz-heading { font-family: var(--font-display), 'Libre Baskerville', serif; letter-spacing: -0.01em; }
.mz-mark { width: 12mm; height: 0.7mm; background: var(--cinnamon); margin-bottom: 2.6mm; }
.mz-opener { display: grid; gap: 0 6mm; align-items: start; }
.mz-opener h2 { margin: 0; font-weight: 400; font-size: 24pt; line-height: 1.2; }
.mz-opener h2.small { font-size: 17pt; line-height: 1.25; }
.mz-opener h2.brief { font-size: 13pt; line-height: 1.3; padding-top: 1mm; border-top: .25mm solid var(--cinnamon); }
.mz-asked { margin-top: 1.6mm; font-size: 8.5pt; color: var(--muted); }
.mz-deck { margin-top: 3mm; font-size: 12.5pt; line-height: 1.35; color: var(--muted); font-style: italic; }
.mz-lead { position: relative; overflow: hidden; border-radius: 1mm; background: #ECE8DD; }
.mz-lead img, .mz-photo img { display: block; width: 100%; height: 100%; }
.mz-credit { font-size: 7.5pt; color: var(--muted); margin-top: 1.2mm; }
.mz-cols { display: grid; gap: 0 6mm; align-items: start; }
.mz-col { min-width: 0; }
.mz-note { display: block; overflow-wrap: anywhere; }
.mz-note .mz-bird { display: inline-block; vertical-align: -1.1mm; margin-right: 1.4mm; }
.mz-note b { font-weight: 600; margin-right: 1.4mm; }
.mz-para { overflow-wrap: anywhere; }
.mz-byline { display: flex; align-items: center; gap: 2.2mm; height: calc(var(--row) * 2); font-weight: 600; }
.mz-byline small { display: block; font-weight: 400; font-size: 8pt; color: var(--muted); line-height: 1; margin-top: .6mm; }
.mz-text p { margin: 0; white-space: pre-line; }
.mz-text a { color: var(--canopy); text-decoration: none; }
.mz-text u { text-decoration: underline; text-decoration-thickness: .2mm; text-underline-offset: .6mm; }
.mz-tape { font-size: 8pt; color: var(--muted); }
.mz-tape .dot { display: inline-block; width: 1.6mm; height: 1.6mm; border-radius: 50%; background: var(--cinnamon); margin-right: 1.2mm; vertical-align: 0.1mm; }
.mz-essay { display: grid; grid-template-columns: 1fr 58mm; gap: 0 6mm; align-items: start; }
.mz-cont { font-size: 8pt; color: var(--muted); height: var(--row); font-style: italic; }
.mz-photo { position: relative; overflow: hidden; border-radius: 1mm; background: #ECE8DD; }
.mz-dpi { position: absolute; right: 1.5mm; bottom: 1.5mm; font-size: 6.5pt; line-height: 1; padding: .8mm 1.2mm; border-radius: 1mm; background: rgba(35,36,30,.72); color: #F5F2EA; font-variant-numeric: tabular-nums; }
.mz-sheet.print .mz-dpi { display: none; }
.mz-phototext { display: grid; gap: 0 6mm; align-items: start; }
.mz-band { display: flex; gap: 2mm; align-items: flex-start; }
.mz-gallery { display: flex; gap: 3mm; align-items: flex-start; }
.mz-gallery .mz-item { min-width: 0; }
.mz-wallrow { display: flex; gap: 2mm; align-items: flex-start; }
.mz-wallname { font-size: 7pt; color: var(--muted); line-height: 1.1; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mz-cards { display: grid; gap: 4mm; align-items: start; }
.mz-card { display: grid; grid-template-columns: auto 1fr; gap: 1mm 3mm; align-items: center; }
.mz-card .mz-art { width: 14mm; height: 14mm; border-radius: 1mm; background: #ECE8DD; overflow: hidden; display: grid; place-items: center; color: var(--muted); font-size: 12pt; }
.mz-card .mz-art.video { width: 22mm; }
.mz-card .mz-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mz-card .mz-who { grid-column: 1 / -1; display: flex; align-items: center; gap: 1.6mm; font-size: 8.5pt; font-weight: 600; }
.mz-card .mz-title { font-size: 9.5pt; font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.mz-card .mz-sub { font-size: 8pt; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mz-card .mz-words { grid-column: 1 / -1; font-size: 9.5pt; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mz-vote .mz-choice { margin-bottom: var(--row); }
.mz-vote .mz-label { font-weight: 600; font-size: 11pt; height: var(--row); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mz-vote .mz-birds { display: flex; flex-wrap: wrap; gap: 1.2mm; height: calc(var(--row) * 2); align-items: center; }
.mz-vote .mz-names { font-size: 8pt; color: var(--muted); line-height: 1.3; }
.mz-vote .mz-none { font-size: 8.5pt; color: var(--muted); font-style: italic; }
.mz-quote { display: grid; grid-template-columns: 12mm 1fr; align-items: start; padding-top: var(--row); }
.mz-quote .q { font-family: var(--font-display), 'Libre Baskerville', serif; font-size: 40pt; line-height: .7; color: var(--cinnamon); }
.mz-quote p { margin: 0; font-family: var(--font-display), 'Libre Baskerville', serif; font-style: italic; font-size: 16pt; line-height: 22pt; max-width: 140mm; }
.mz-quote .by { margin-top: 2mm; font-size: 8.5pt; color: var(--muted); }
.mz-cover { position: absolute; inset: 0; }
.mz-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.mz-cover .scrim { position: absolute; left: 0; right: 0; height: 60%; }
.mz-cover .scrim.bottom { bottom: 0; background: linear-gradient(to top, rgba(28,22,16,.82), rgba(28,22,16,.42) 55%, rgba(28,22,16,0)); }
.mz-cover .scrim.top { top: 0; background: linear-gradient(to bottom, rgba(28,22,16,.82), rgba(28,22,16,.42) 55%, rgba(28,22,16,0)); }
.mz-cover .words { position: absolute; left: 16mm; right: 16mm; color: #F5F2EA; }
.mz-cover .words.bottom { bottom: 18mm; }
.mz-cover .words.top { top: 20mm; }
.mz-cover .eyebrow { font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; opacity: .9; }
.mz-cover h1 { margin: 2mm 0 0; font-family: var(--font-display), 'Libre Baskerville', serif; font-weight: 400; font-size: 44pt; line-height: 1.05; letter-spacing: -0.015em; overflow-wrap: anywhere; }
.mz-cover .date { margin-top: 3mm; font-size: 12.5pt; }
.mz-cover .lines { margin-top: 8mm; padding-top: 3mm; border-top: .25mm solid rgba(245,242,234,.5); font-family: var(--font-display), 'Libre Baskerville', serif; font-style: italic; font-size: 12.5pt; line-height: 1.35; }
.mz-cover .lines div + div { margin-top: 1.4mm; }
.mz-cover .credit { position: absolute; right: 6mm; bottom: 6mm; font-size: 7pt; color: #F5F2EA; opacity: .75; }
.mz-cover.paper { color: var(--ink); }
.mz-cover.paper .band { position: absolute; left: 0; right: 0; top: 0; height: 62%; overflow: hidden; }
.mz-cover.paper .band img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.mz-cover.paper .words { color: var(--ink); }
.mz-cover.paper .lines { border-top-color: var(--hair); color: var(--muted); }
.mz-cover.paper .mark { width: 18mm; height: .9mm; background: var(--cinnamon); }
.mz-cover.paper .credit { color: var(--muted); opacity: 1; }
.mz-contents { margin-bottom: var(--row); }
.mz-contents h2 { margin: 0 0 calc(var(--row) * 1); font-family: var(--font-display), 'Libre Baskerville', serif; font-weight: 400; font-size: 20pt; line-height: 1.2; }
.mz-contents ol { list-style: none; margin: 0; padding: 0; columns: var(--cols, 1); column-gap: 8mm; }
.mz-contents li { display: grid; grid-template-columns: 1fr auto; gap: 4mm; align-items: baseline; break-inside: avoid; margin-bottom: 2mm; font-family: var(--font-display), 'Libre Baskerville', serif; font-size: 11pt; line-height: 1.25; }
.mz-contents li span:last-child { font-family: var(--font-body), sans-serif; font-size: 9pt; color: var(--muted); font-variant-numeric: tabular-nums; }
.mz-back .eyebrow { font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: var(--cinnamon); height: var(--row); }
.mz-back h2 { margin: 0 0 calc(var(--row) * 1); font-family: var(--font-display), 'Libre Baskerville', serif; font-weight: 400; font-size: 20pt; line-height: 1.2; }
.mz-back .people { display: grid; gap: 3mm 2mm; }
.mz-back .person { text-align: center; font-size: 8pt; line-height: 1.15; }
.mz-back .person .name { margin-top: 1.2mm; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.mz-back .also { margin-top: calc(var(--row) * 2); }
.mz-back .also h3 { margin: 0; font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: var(--cinnamon); font-weight: 600; height: var(--row); }
.mz-back .also p { margin: 0; font-family: var(--font-display), 'Libre Baskerville', serif; font-style: italic; font-size: 11pt; line-height: var(--row); }
.mz-back .colophon { position: absolute; left: 0; right: 0; bottom: 0; font-size: 8.5pt; color: var(--muted); line-height: 1.5; border-top: .25mm solid var(--hair); padding-top: 2.4mm; }
.mz-empty { font-family: var(--font-display), 'Libre Baskerville', serif; font-style: italic; font-size: 14pt; color: var(--muted); }
`;

/* ── Helpers ───────────────────────────────────────────────────────── */

const mm = (n: number) => `${n}mm`;
const rowsMm = (rows: number) => `calc(var(--row) * ${rows})`;

function Bird({ person, size }: { person: MagPerson; size: number }) {
  return <BirdAvatar user={{ id: person.id, name: person.name, photoUrl: person.photoUrl, birdOverride: person.birdOverride }} size={size} />;
}

function Photo({ placement, heightMm, widthMm, label = true }: { placement: PhotoPlacement; heightMm?: string; widthMm?: string; label?: boolean }) {
  const p = placement.photo;
  const style: React.CSSProperties = { height: heightMm, width: widthMm };
  return (
    <div className="mz-photo" style={style}>
      <img src={p.src} alt="" loading="eager" decoding="sync" style={{ objectFit: placement.fit, objectPosition: `${p.focalX * 100}% ${p.focalY * 100}%` }} />
      {label && <span className="mz-dpi">{Math.round(placement.dpi)} dpi</span>}
    </div>
  );
}

function Rich({ text, className }: { text: string; className?: string }) {
  return <div className={`mz-text ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: `<p>${renderRichText(text, { linkRanges })}</p>` }} />;
}

function Text({ t }: { t: TextBlock; span?: number }) {
  const a = t.answer;
  const body = a.body ?? "";
  if (t.kind === "note") {
    return (
      <div className="mz-note" style={{ minHeight: rowsMm(t.rows) }}>
        <span className="mz-bird"><Bird person={a.author} size={16} /></span>
        <b>{a.author.name}{a.author.line2 ? <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {a.author.line2}</span> : null}</b>
        {t.aside ? <span className="mz-tape">{t.aside}</span> : <span className="mz-text" dangerouslySetInnerHTML={{ __html: renderRichText(body, { linkRanges }) }} />}
      </div>
    );
  }
  if (t.kind === "transcript") {
    const dur = durationLabel(a.audio?.seconds ?? null);
    if (!visibleText(body)) {
      return (
        <div className="mz-note" style={{ minHeight: rowsMm(t.rows) }}>
          <span className="mz-bird"><Bird person={a.author} size={16} /></span>
          <b>{a.author.name}</b>
          <span className="mz-tape"><span className="dot" />{dur ? `spoke for ${dur}` : "answered out loud"}, on Rishi Valley</span>
        </div>
      );
    }
    return (
      <div className="mz-para" style={{ minHeight: rowsMm(t.rows) }}>
        <div className="mz-byline"><Bird person={a.author} size={26} /><span>{a.author.name}{a.author.line2 && <small>{a.author.line2}</small>}</span></div>
        <div className="mz-tape" style={{ height: "var(--row)" }}><span className="dot" />{dur ? `${dur}, ` : ""}from a recording, as the browser heard it</div>
        <Rich text={body} />
      </div>
    );
  }
  /* A split essay is sliced on the same string the engine measured (the
     visible text), so the cut lands where the rows were counted. Emphasis
     inside a 9,000-character essay is lost across the split; the whole
     essay keeps it when it fits a page. */
  const plain = visibleText(body);
  const sliced = t.slice ? plain.slice(safeCut(plain, t.slice[0]), t.slice[1] >= plain.length ? plain.length : safeCut(plain, t.slice[1])) : body;
  return (
    <div className="mz-para" style={{ minHeight: rowsMm(t.rows) }}>
      {t.continued ? (
        t.kind === "essay" ? null : <div className="mz-cont">{a.author.name}, continued</div>
      ) : (
        <div className="mz-byline"><Bird person={a.author} size={26} /><span>{a.author.name}{a.author.line2 && <small>{a.author.line2}</small>}</span></div>
      )}
      <Rich text={sliced} />
    </div>
  );
}

/* ── Blocks ────────────────────────────────────────────────────────── */

function Opener({ b, paper }: { b: Extract<Block, { kind: "opener" }>; paper: Magazine["paper"] }) {
  const q = b.question;
  const text = visibleText(q.text) || "A question";
  const small = text.length > 120;
  const lead = b.lead as (PhotoPlacement & { rows?: number }) | null;
  const leadSpan = lead ? (b.rows > 0 ? Math.round(12 - Math.max(5, Math.min(7, 12 - 5))) : 6) : 0;
  const asked = q.askedBy ? `Asked by ${q.askedBy}` : q.anonymous ? "Asked anonymously" : null;
  if (b.brief) {
    return (
      <div className="mz-opener">
        <div>
          <h2 className="mz-heading brief">{text}</h2>
          {asked && <div className="mz-asked" style={{ marginTop: "0.6mm" }}>{asked}</div>}
        </div>
      </div>
    );
  }
  const words = (
    <div>
      <div className="mz-mark" />
      <h2 className={`mz-heading${small ? " small" : ""}`}>{text}</h2>
      {asked && <div className="mz-asked">{asked}</div>}
      {b.deck && <div className="mz-deck">{b.deck}</div>}
    </div>
  );
  if (!lead) return <div className="mz-opener">{words}</div>;
  const leadWidth = spanMm(paper, leadSpan);
  const leadAnswer = q.answers.find((a) => a.photos.includes(lead.photo));
  return (
    <div className="mz-opener" style={{ gridTemplateColumns: `${mm(leadWidth)} 1fr` }}>
      <div>
        <Photo placement={lead} heightMm={rowsMm(Math.max(2, b.rows - 1))} />
        {leadAnswer && <div className="mz-credit">Photograph: {leadAnswer.author.name}</div>}
      </div>
      {words}
    </div>
  );
}

function Columns({ b, paper }: { b: Extract<Block, { kind: "columns" }>; paper: Magazine["paper"] }) {
  /* A run of one is measured at eight columns and must be drawn at eight,
     not stretched to twelve (the judge's page 23: 37 rows of air under a
     paragraph set 120 characters wide). */
  const template = b.columns.length === 1 ? mm(spanMm(paper, b.span)) : `repeat(${b.columns.length}, minmax(0, 1fr))`;
  return (
    <div className="mz-cols" style={{ gridTemplateColumns: template }}>
      {b.columns.map((col, i) => (
        <div className="mz-col" key={i}>
          {col.map((t) => <Text key={t.answer.id} t={t} span={b.span} />)}
        </div>
      ))}
    </div>
  );
}

/** An essay's byline sits in the margin column beside its first lines,
 *  the way a magazine credits a long piece, so the wide measure starts at
 *  the top and the aside is not air. */
function Essay({ b }: { b: Extract<Block, { kind: "essay" }> }) {
  const a = b.text.answer;
  return (
    <div className="mz-essay">
      <Text t={{ ...b.text, continued: true }} span={8} />
      <div>
        <div className="mz-byline" style={{ alignItems: "flex-start", height: "auto", flexDirection: "column", gap: "1.6mm" }}>
          <Bird person={a.author} size={34} />
          <span>{a.author.name}{a.author.line2 && <small>{a.author.line2}</small>}{b.text.continued && <small>continued</small>}</span>
        </div>
        {b.aside && <Quote text={b.aside.quote} by={b.aside.by} />}
      </div>
    </div>
  );
}

function PhotoText({ b, paper }: { b: Extract<Block, { kind: "photo-text" }>; paper: Magazine["paper"] }) {
  const photoW = spanMm(paper, b.photoSpan);
  const photoRows = (b.photo as PhotoPlacement & { rows?: number }).rows ?? b.rows;
  const photo = <Photo placement={b.photo} heightMm={rowsMm(Math.min(photoRows, b.rows))} />;
  const text = (
    <div className="mz-col">
      {b.column.map((t) => <Text key={t.answer.id} t={t} span={12 - b.photoSpan} />)}
    </div>
  );
  return (
    <div className="mz-phototext" style={{ gridTemplateColumns: b.side === "left" ? `${mm(photoW)} 1fr` : `1fr ${mm(photoW)}` }}>
      {b.side === "left" ? photo : text}
      {b.side === "left" ? text : photo}
    </div>
  );
}

function PhotoBand({ b, paper }: { b: Extract<Block, { kind: "photo-band" }>; paper: Magazine["paper"] }) {
  const captionRows = b.caption ? b.caption.rows : 2;
  const photoRows = b.rows - captionRows;
  const a = b.answer;
  let at = 0;
  return (
    <div>
      {b.layout ? (
        b.layout.map((row, ri) => (
          <div className="mz-band" key={ri} style={{ height: mm(row.heightMm), marginBottom: "2mm" }}>
            {row.widths.map((w, i) => <Photo key={i} placement={b.photos[at++]} heightMm="100%" widthMm={mm(w)} />)}
          </div>
        ))
      ) : (
        <div className="mz-band" style={{ height: rowsMm(photoRows) }}>
          {b.photos.map((p, i) => {
            const r = (p.photo.width ?? 640) / (p.photo.height ?? 640);
            return <Photo key={i} placement={p} heightMm="100%" widthMm={mm(Math.min(spanMm(paper, 12), r * photoRows * 5.3))} />;
          })}
        </div>
      )}
      {b.caption ? (
        <div style={{ marginTop: "1.2mm" }}><Text t={b.caption} span={12} /></div>
      ) : (
        <div className="mz-note" style={{ marginTop: "1mm" }}><span className="mz-bird"><Bird person={a.author} size={16} /></span><b>{a.author.name}</b></div>
      )}
    </div>
  );
}

function Gallery({ b }: { b: Extract<Block, { kind: "gallery" }> }) {
  const byline = (it: (typeof b.items)[number]) =>
    it.caption ? <Text t={it.caption} span={4} /> : it.first ? <div className="mz-note"><span className="mz-bird"><Bird person={it.answer.author} size={16} /></span><b>{it.answer.author.name}</b></div> : null;
  if (b.captionsBeside) {
    return (
      <div className="mz-gallery">
        {b.items.map((it, i) => (
          <div className="mz-item" key={`${it.answer.id}-${i}`} style={{ width: mm(it.widthMm), flex: "none" }}>
            <Photo placement={it.placement} heightMm={mm(b.heightMm)} />
          </div>
        ))}
        <div className="mz-col" style={{ flex: 1, minWidth: 0, paddingLeft: "3mm" }}>
          {b.items.map((it, i) => (it.first ? <div key={`${it.answer.id}-c${i}`}>{byline(it)}</div> : null))}
        </div>
      </div>
    );
  }
  return (
    <div className="mz-gallery">
      {b.items.map((it, i) => (
        <div className="mz-item" key={`${it.answer.id}-${i}`} style={{ width: mm(it.widthMm) }}>
          <Photo placement={it.placement} heightMm={mm(b.heightMm)} />
          <div style={{ marginTop: "1.2mm" }}>{byline(it)}</div>
        </div>
      ))}
    </div>
  );
}

function Wall({ b }: { b: Extract<Block, { kind: "wall" }> }) {
  return (
    <div>
      {b.rowsOfPhotos.map((row, ri) => (
        <div className="mz-wallrow" key={ri}>
          {row.shots.map((s, i) => (
            <div key={i} style={{ width: mm(s.widthMm), flex: "none" }}>
              <Photo placement={s.placement} heightMm={mm(row.heightMm)} label={false} />
              {s.first && <div className="mz-wallname">{s.by.name}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Cards({ b }: { b: Extract<Block, { kind: "cards" }> }) {
  return (
    <div className="mz-cards" style={{ gridTemplateColumns: `repeat(${b.perRow}, minmax(0, 1fr))` }}>
      {b.cards.map((c, i) => {
        const a = c.answer;
        const l = c.link;
        /* An answer's words print under its first card only (the judge's
           page 11: one sentence three times under three cards). */
        const words = b.cards.findIndex((o) => o.answer.id === a.id) === i ? visibleText(a.body) : "";
        return (
          <div className="mz-card" key={`${a.id}-${i}`}>
            <div className="mz-who"><Bird person={a.author} size={14} />{a.author.name}</div>
            <div className={`mz-art${l?.kind === "youtube" || l?.kind === "link" ? " video" : ""}`}>
              {l?.thumbUrl ? (
                <img src={l.thumbUrl} alt="" loading="eager" decoding="sync" />
              ) : (
                <span>{l?.kind === "link" ? <ArrowUpRight size={18} weight="regular" /> : <MusicNotes size={18} weight="duotone" />}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="mz-title">{l ? l.title : words || "A song"}</div>
              {l && <div className="mz-sub">{l.subtitle ?? (l.kind === "link" ? new URL(l.url).hostname.replace(/^www\./, "") : l.kind === "spotify" ? "On Spotify" : "On YouTube")}</div>}
            </div>
            {l && words && <div className="mz-words">{words}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Vote({ b }: { b: Extract<Block, { kind: "vote" }> }) {
  return (
    <div className="mz-vote">
      {b.result.map((r) => (
        <div className="mz-choice" key={r.choice.id}>
          <div className="mz-label">{visibleText(r.choice.text) || "(a choice with no words)"}</div>
          {r.voters.length ? (
            <>
              <div className="mz-birds">{r.voters.map((v) => <Bird key={v.id} person={v} size={22} />)}</div>
              <div className="mz-names">{r.voters.map((v) => v.name).join(", ")}</div>
            </>
          ) : (
            <div className="mz-none">Nobody</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Quote({ text, by }: { text: string; by: string }) {
  return (
    <div className="mz-quote">
      <span className="q">“</span>
      <div>
        <p>{text}</p>
        <div className="by">{by}</div>
      </div>
    </div>
  );
}

function Cover({ b, m }: { b: Extract<Block, { kind: "cover" }>; m: Magazine }) {
  const s = m.source;
  const date = formatDisplayDateLong(s.publishedAt);
  const capsule = s.sealedAt ? `Written ${formatDisplayDateLong(s.sealedAt)}, opened ${date}` : null;
  const words = (
    <div className={`words ${b.textAt}`}>
      <div className="eyebrow">A Catch-up</div>
      <h1>{s.catchupName}</h1>
      <div className="date">{capsule ?? date}</div>
      {b.lines.length > 0 && <div className="lines">{b.lines.map((l, i) => <div key={i}>{l}</div>)}</div>}
    </div>
  );
  if (b.lead && b.bleed === "full") {
    const p = b.lead.photo;
    return (
      <div className="mz-cover">
        <img src={p.src} alt="" loading="eager" decoding="sync" style={{ objectPosition: `${p.focalX * 100}% ${p.focalY * 100}%` }} />
        <div className={`scrim ${b.textAt}`} />
        {words}
        {b.credit && <div className="credit">Photograph: {b.credit.name}</div>}
      </div>
    );
  }
  const band = b.lead ? { src: b.lead.photo.src, position: `${b.lead.photo.focalX * 100}% ${b.lead.photo.focalY * 100}%` } : s.picture ? { src: s.picture.src, position: s.picture.focus } : null;
  return (
    <div className="mz-cover paper">
      {band && b.bleed === "band" && (
        <div className="band">
          <img src={band.src} alt="" loading="eager" decoding="sync" style={{ objectPosition: band.position }} />
        </div>
      )}
      <div className="words bottom">
        <div className="mark" style={{ marginBottom: "4mm" }} />
        <div className="eyebrow" style={{ color: "var(--cinnamon)" }}>A Catch-up</div>
        <h1>{s.catchupName}</h1>
        <div className="date">{capsule ?? date}</div>
        {b.lines.length > 0 && <div className="lines">{b.lines.map((l, i) => <div key={i}>{l}</div>)}</div>}
      </div>
      {b.credit && <div className="credit">Photograph: {b.credit.name}</div>}
    </div>
  );
}

function Contents({ b }: { b: Extract<Block, { kind: "contents" }> }) {
  return (
    <div className="mz-contents" style={{ ["--cols" as string]: b.entries.length > 14 ? 2 : 1 }}>
      <h2>In this Edition</h2>
      <ol>
        {b.entries.map((e) => (
          <li key={e.question.id}><span>{visibleText(e.question.text) || "A question"}</span><span>{e.page}</span></li>
        ))}
      </ol>
    </div>
  );
}

function Back({ b, m }: { b: Extract<Block, { kind: "contributors" }>; m: Magazine }) {
  const s = m.source;
  const size = b.perRow >= 12 ? 30 : b.perRow >= 10 ? 36 : 44;
  return (
    <div className="mz-back" style={{ height: rowsMm(b.rows), position: "relative" }}>
      {b.people.length > 0 ? (
        <>
          <div className="eyebrow">Written by</div>
          <div className="people" style={{ gridTemplateColumns: `repeat(${b.perRow}, minmax(0, 1fr))` }}>
            {b.people.map((p) => (
              <div className="person" key={p.id}>
                <Bird person={p} size={size} />
                <div className="name">{p.name}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mz-empty">Nobody wrote in this time.</div>
      )}
      {b.alsoAsked.length > 0 && (
        <div className="also">
          <h3>Also asked</h3>
          {b.alsoAsked.map((q, i) => <p key={i}>{visibleText(q) || "A question"}</p>)}
        </div>
      )}
      <div className="colophon">
        {metaLine(s.catchupName, formatDisplayDateLong(s.publishedAt))}
        <br />
        A Catch-up is a newsletter a group writes to itself: questions the group asked, answered by whoever wrote in. Made on Rishi Valley.
      </div>
    </div>
  );
}

function BlockView({ b, m }: { b: Block; m: Magazine }) {
  switch (b.kind) {
    case "cover":
      return <Cover b={b} m={m} />;
    case "contents":
      return <Contents b={b} />;
    case "opener":
      return <Opener b={b} paper={m.paper} />;
    case "columns":
      return <Columns b={b} paper={m.paper} />;
    case "essay":
      return <Essay b={b} />;
    case "photo-text":
      return <PhotoText b={b} paper={m.paper} />;
    case "photo-band":
      return <PhotoBand b={b} paper={m.paper} />;
    case "gallery":
      return <Gallery b={b} />;
    case "wall":
      return <Wall b={b} />;
    case "cards":
      return <Cards b={b} />;
    case "vote":
      return <Vote b={b} />;
    case "quote":
      return <Quote text={b.text} by={b.by} />;
    case "contributors":
      return <Back b={b} m={m} />;
    case "space":
      return null;
  }
}

/* ── Pages ─────────────────────────────────────────────────────────── */

export function PageView({ page, m }: { page: Page; m: Magazine }) {
  const isCover = page.blocks[0]?.kind === "cover";
  const perPage = rowsPerPage(m.paper);
  return (
    <section className="mz-page" data-page={page.number} aria-label={`Page ${page.number}`}>
      {isCover ? (
        <BlockView b={page.blocks[0]} m={m} />
      ) : (
        <>
          <div className="mz-body">
            {page.blocks.map((b, i) => (
              <div className="mz-block" key={i} data-kind={b.kind} data-rows={b.rows} style={{ height: b.kind === "columns" ? undefined : rowsMm(Math.min(b.rows, perPage)), minHeight: b.kind === "columns" ? rowsMm(b.rows) : undefined }}>
                <BlockView b={b} m={m} />
              </div>
            ))}
          </div>
          <div className="mz-folio">
            <span>{metaLine(m.source.catchupName, formatDisplayDateLong(m.source.publishedAt))}</span>
            <span className="mz-run">{page.running ?? ""}</span>
            <span className="mz-num">{page.number}</span>
          </div>
        </>
      )}
    </section>
  );
}

export function Sheet({ m, print, children }: { m: Magazine; print: boolean; children?: (page: Page) => React.ReactNode }) {
  return (
    <div className={`mz-sheet${print ? " print" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      {m.pages.map((p) => (
        <div key={p.number} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <PageView page={p} m={m} />
          {children?.(p)}
        </div>
      ))}
    </div>
  );
}

export type { MagPhoto };
