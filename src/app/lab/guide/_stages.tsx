"use client";

/* ------------------------------------------------------------------ *
 *  Four containers for one piece of writing.
 *
 *  Every stage renders <GuideBody /> from ./_content, untouched. What
 *  changes is where it appears, what happens to the page you were on,
 *  and whether the address bar knows about it. Each stage sits inside a
 *  fake browser frame for exactly that last reason: the URL is half the
 *  argument, and it is invisible if you only draw the viewport.
 *
 *  The app behind is a mock, not the real /catchups. It has to be able
 *  to sit still, dim, and be half-covered on demand, and the real page
 *  would drag its data layer and the whole app shell in here to do it.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { GuideBody } from "./_content";

export type View = "desktop" | "phone";

/* ---------------------------------------------------------------- *
 *  Shared furniture
 * ---------------------------------------------------------------- */

/** A browser, so the address bar can take part in the comparison. */
function Frame({ url, view, children }: { url: string; view: View; children: React.ReactNode }) {
  return (
    <div className={`gd-frame gd-${view}`}>
      <div className="gd-chrome">
        <span className="gd-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="gd-url" key={url}>
          rishivalley.space<b>{url}</b>
        </span>
      </div>
      <div className="gd-viewport">{children}</div>
    </div>
  );
}

const RAIL = ["Feed", "Directory", "Collection", "Letters", "Catch-ups"];

/** The Catch-ups index, roughly. Enough of it to be recognisable behind glass. */
function AppMock({ view }: { view: View }) {
  return (
    <div className="gd-app">
      {view === "desktop" && (
        <aside className="gd-rail">
          <span className="gd-mark" />
          {RAIL.map((r) => (
            <span key={r} className={r === "Catch-ups" ? "on" : ""}>
              {r}
            </span>
          ))}
        </aside>
      )}
      <div className="gd-appmain">
        <div className="gd-apphead">
          <h2>Catch-ups</h2>
          <span className="gd-cta">New Catch-up</span>
        </div>
        <div className="gd-card">
          <span className="gd-card-k">Round 4 · answering</span>
          <strong>The Yellow House, 2011</strong>
          <span className="gd-card-s">Seven questions. Closes in three days.</span>
        </div>
        <div className="gd-card">
          <span className="gd-card-k">Round 1 · published</span>
          <strong>Sunday morning cricket</strong>
          <span className="gd-card-s">Nine people wrote. Read it when you have a cup of tea.</span>
        </div>
      </div>
    </div>
  );
}

/** The one control every stage shares. Sits outside the mock on purpose. */
function Trigger({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="gd-trigger">
      <button type="button" onClick={onToggle}>
        {open ? "Close the guide" : "Open the guide"}
      </button>
      <span>stand-in for whatever we end up using. Placement is the next conversation.</span>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  A. The page
 * ---------------------------------------------------------------- */

/** The quiet shell the three policy documents already use. */
function DocShell({
  children,
  wide = false,
  scrollRef,
}: {
  children: React.ReactNode;
  wide?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollRef} className={`gd-docshell${wide ? " wide" : ""}`}>
      <header>
        <span className="gd-mark dark" />
        <span>Rishi Valley</span>
      </header>
      <main>{children}</main>
      <footer>
        <span>Feed</span>
        <span>Directory</span>
        <span>Collection</span>
        <span>Letters</span>
        <span className="on">Catch-ups</span>
      </footer>
    </div>
  );
}

export function StagePage({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger open={open} onToggle={() => setOpen((o) => !o)} />
      <Frame url={open ? "/guide/catchups" : "/catchups"} view={view}>
        {open ? (
          <DocShell>
            <GuideBody />
          </DocShell>
        ) : (
          <AppMock view={view} />
        )}
      </Frame>
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  B. The panel
 * ---------------------------------------------------------------- */

export function StagePanel({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger open={open} onToggle={() => setOpen((o) => !o)} />
      {/* The query param is here because it should be: a panel CAN carry an
          address, and pretending otherwise would stack the comparison. */}
      <Frame url={open ? "/catchups?guide=1" : "/catchups"} view={view}>
        <div className="gd-layer">
          <AppMock view={view} />
          <div className={`gd-scrim${open ? " on" : ""}`} onClick={() => setOpen(false)} />
          <aside className={`gd-panel${open ? " on" : ""}`}>
            <div className="gd-panel-scroll">
              <div className="gd-sheet-bar">
                <button type="button" className="gd-x" onClick={() => setOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <GuideBody />
            </div>
          </aside>
        </div>
      </Frame>
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  C. One long document, jumped into
 * ---------------------------------------------------------------- */

/** Neighbours, so the section reads as part of something longer. */
const NEIGHBOURS = [
  ["Letters", "A letter is written to one person and kept. Nobody else ever sees it."],
  ["Collection", "The valley's photographs, gathered in one place and kept properly."],
];

export function StageAnchored({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  /* Arriving at #catchups means arriving AT the section, not at the top of the
     document with the section somewhere below. Without this the stage argues
     for C by showing it at its best and is a lie about what a jump feels
     like: you land mid-document, with the thing you did not ask about still
     on screen above you. */
  useEffect(() => {
    if (!open) return;
    const box = scroller.current;
    const target = box?.querySelector<HTMLElement>(".gd-doc");
    if (!box || !target) return;
    /* Rect delta rather than offsetTop: offsetTop is measured from the nearest
       positioned ancestor, which here is the frame's viewport and not the
       scroller, so it only happens to agree while scrollTop is still zero. */
    box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top - 56;
  }, [open]);

  return (
    <>
      <Trigger open={open} onToggle={() => setOpen((o) => !o)} />
      <Frame url={open ? "/guide#catchups" : "/catchups"} view={view}>
        {open ? (
          <DocShell wide scrollRef={scroller}>
            <div className="gd-anchored">
              {view === "desktop" && (
                <nav className="gd-toc">
                  {RAIL.map((r) => (
                    <span key={r} className={r === "Catch-ups" ? "on" : ""}>
                      {r}
                    </span>
                  ))}
                </nav>
              )}
              <div className="gd-anchored-body">
                <div className="gd-above">
                  <h1>Using Rishi Valley</h1>
                  {NEIGHBOURS.map(([t, d]) => (
                    <div key={t}>
                      <h2>{t}</h2>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
                <GuideBody />
              </div>
            </div>
          </DocShell>
        ) : (
          <AppMock view={view} />
        )}
      </Frame>
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  D. The page, over the page
 * ---------------------------------------------------------------- */

export function StageIntercept({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger open={open} onToggle={() => setOpen((o) => !o)} />
      <Frame url={open ? "/guide/catchups" : "/catchups"} view={view}>
        <div className="gd-layer">
          <AppMock view={view} />
          <div className={`gd-scrim${open ? " on" : ""}`} onClick={() => setOpen(false)} />
          <div className={`gd-over${open ? " on" : ""}`}>
            <div className="gd-over-scroll">
              <div className="gd-sheet-bar over">
                <button type="button" className="gd-x" onClick={() => setOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <GuideBody />
            </div>
          </div>
        </div>
      </Frame>
    </>
  );
}
