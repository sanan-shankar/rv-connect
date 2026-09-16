"use client";

/* ------------------------------------------------------------------ *
 *  Today and the proposal, on real posts.
 *
 *  Everything below is the shipped PostCard and the shipped
 *  CommentsSection. The only thing this room does is hand them a
 *  `look`. That is deliberate: a pick here becomes the spec, so what he
 *  judges has to be the component and not a copy of it.
 *
 *  Four of the changes are not in the switch at all, because they are
 *  repairs rather than choices and they are already live in both
 *  columns: Reply takes you to the box, the heart and Reply are real
 *  targets, the admin shield hides until you point at a comment, and
 *  closing the thread no longer jerks.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { Seg, DelightShell } from "../_kit";

type Look = "rule" | "space";

const LOOKS: { v: Look; label: string }[] = [
  { v: "rule", label: "Today" },
  { v: "space", label: "Proposed" },
];

export function CommentsRoom({ busy, empty }: { busy: PostData | null; empty: PostData | null }) {
  const [look, setLook] = useState<Look>("space");

  return (
    <DelightShell
      title="The comment section, gone over"
      lede="Flip the switch. Then press Reply on a comment, and type a long one."
      css={ROOM_CSS}
    >
      <div className="cm-bar">
        <Seg options={LOOKS} value={look} onChange={setLook} />
      </div>

      <div className="cm-stage">
        <div className="cm-slot">
          <h2 className="cm-cap">A thread people are in</h2>
          {busy ? (
            <PostCard post={busy} commentsLook={look} defaultCommentsOpen />
          ) : (
            <p className="cm-none">No post on the feed has comments on it yet.</p>
          )}
        </div>

        <div className="cm-slot">
          <h2 className="cm-cap">Nobody has said anything</h2>
          {empty ? (
            <PostCard post={empty} commentsLook={look} defaultCommentsOpen />
          ) : (
            <p className="cm-none">Every post on the feed has comments on it.</p>
          )}
          <div className="cm-aside">
            <h3>In the switch</h3>
            <p>
              <b>The line goes.</b> It ran edge to edge under every open thread and
              was the strongest horizontal on the card. The design system already
              says sections are separated by space and never a hairline, written
              down on 2026-09-08 for dialogs and applied to the letters byline
              this morning. The gap that replaces it is 26px, half again the 16px
              between two comments.
            </p>
            <p>
              <b>&ldquo;No comments yet&rdquo; goes.</b> The box under it already
              says &ldquo;Write a comment&rdquo; and the button that opened the
              thread says 0. An empty thread drops from 114px to 84px.
            </p>
            <p>
              <b>The box grows with what you type.</b> It took 1000 characters and
              showed about 60. Enter sends, Shift and Enter make a new line, and it
              stops growing at five lines.
            </p>
            <p>
              <b>Reply brings the box to you.</b> It opens under the comment you
              pressed, already focused, and nothing scrolls. The &ldquo;Replying
              to&rdquo; chip goes with it: the box is under the comment, so there is
              nothing left for the chip to tell you. Escape backs out.
            </p>
            <p className="cm-keep">
              The reply spine stays. That vertical hairline is doing work the
              horizontal one was not: it says which comment these belong to.
            </p>
          </div>
        </div>
      </div>

      <div className="cm-note">
        <h3>Already live in both, because they were repairs</h3>
        <p>
          <b>Reply does something.</b> It used to set a chip and nothing else. On a
          real thread that chip was 337px below the Reply you pressed, off the
          bottom of the window, with nothing focused, so the control read as dead.
          Today&rsquo;s look now at least focuses the box; the proposed one moves
          the box instead.
        </p>
        <p>
          <b>The heart and Reply are targets you can hit.</b> Measured 26x18 and
          29x16, both under the 24px floor, on a phone as well as a laptop. The
          glyphs did not move and the row is the same height; only the hit area
          grew.
        </p>
        <p>
          <b>The admin shield hides until you point at a comment.</b> It was the
          one control on a row that was always painted, so five comments meant
          five shield glyphs down the right edge. Only an admin ever saw it, which
          is why it lasted.
        </p>
        <p>
          <b>Closing the thread is gradual all the way.</b> The 9px jump was a
          class toggling on the same render that started the collapse.
        </p>

        <h3>Why the box moves instead of the page</h3>
        <p>
          The obvious fix was to scroll down to the composer, and it cannot be made
          to work. Scrolling drags the infinite-scroll sentinel through the window
          on the way, which loads the next page, which grows the thread under the
          box you were heading for. Traced frame by frame: the box was down to
          570px and still closing, then the thread went 472px to 943px in three
          frames and it was flung back to 937 in a 900px window. Chasing it is
          worse, because every page that lands moves it again. A treadmill, not a
          race.
        </p>

        <h3>Not built, and it needs a decision</h3>
        <p>
          Your own comment waits on the server before it appears. Everything else
          here is instant, hearts included. Making it instant needs the viewer&rsquo;s
          own name and bird on the client, and this app has no client session at
          all, so that is a piece of plumbing rather than a tweak. The same piece
          would let your bird sit beside the box you type in, the way it sits
          beside every comment above it. Worth doing as one change, if you want it.
        </p>
      </div>
    </DelightShell>
  );
}

const ROOM_CSS = `
.cm-bar { margin-bottom: 2rem; }
.cm-stage { display: grid; gap: 2.5rem; grid-template-columns: 1fr; }
@media (min-width: 1100px) {
  .cm-stage { grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
}
.cm-cap {
  margin: 0 0 .75rem; font-size: .8rem; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.cm-none {
  margin: 0; padding: 1.5rem; border-radius: 1rem;
  background: var(--mist); color: var(--muted-foreground); font-size: .9rem;
}
.cm-aside { margin-top: 2rem; max-width: 46ch; }
.cm-aside h3, .cm-note h3 {
  margin: 0 0 .75rem; font-size: .8rem; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.cm-note h3 { margin-top: 2.5rem; }
.cm-note h3:first-child { margin-top: 0; }
.cm-aside p, .cm-note p {
  margin: 0 0 .9rem; font-size: .95rem; line-height: 1.6;
}
.cm-aside b, .cm-note b { font-weight: 600; color: var(--foreground); }
.cm-keep { color: var(--muted-foreground); }
.cm-note { margin-top: 3.5rem; max-width: 60ch; }
`;
