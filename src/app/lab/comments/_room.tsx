"use client";

/* ------------------------------------------------------------------ *
 *  The record of what the comment section became, on 2026-09-16.
 *
 *  It was a switch between Today and a proposal while the owner was
 *  choosing. He chose, the proposal shipped, and there is nothing left
 *  to compare against -- so the room keeps the live thing and the
 *  reasons, which is the half that stays useful. Everything below is
 *  the shipped PostCard and the shipped CommentsSection with no props
 *  this room invented.
 * ------------------------------------------------------------------ */

import { PostCard, type PostData } from "@/components/posts/post-card";
import { DelightShell } from "../_kit";

export function CommentsRoom({ busy, empty }: { busy: PostData | null; empty: PostData | null }) {
  return (
    <DelightShell
      title="The comment section, gone over"
      lede="Open a thread. Press Reply on a comment. Then write a long one and post it."
      css={ROOM_CSS}
    >
      <div className="cm-stage">
        <div className="cm-slot">
          <h2 className="cm-cap">A thread people are in</h2>
          {busy ? (
            <PostCard post={busy} />
          ) : (
            <p className="cm-none">No post on the feed has comments on it yet.</p>
          )}
        </div>

        <div className="cm-slot">
          <h2 className="cm-cap">Nobody has said anything</h2>
          {empty ? (
            <PostCard post={empty} />
          ) : (
            <p className="cm-none">Every post on the feed has comments on it.</p>
          )}
        </div>
      </div>

      <div className="cm-note">
        <h3>What it used to do</h3>
        <p>
          <b>A line ran edge to edge under every open thread</b>, and it was the
          strongest horizontal on the card. The design system already said
          sections are separated by space and never a hairline, written down on
          2026-09-08 for dialogs; the letters byline went the same morning as
          this. The gap that replaced it is 26px, half again the 16px between two
          comments. The first attempt was 42 and read as a hole, because the line
          had been breaking 36px into two halves and the eye never saw one void.
        </p>
        <p>
          <b>&ldquo;No comments yet. Be the first.&rdquo;</b> The box under it
          already said &ldquo;Write a comment&rdquo; and the button that opened
          the thread said 0. An empty thread went from 114px to 84.
        </p>
        <p>
          <b>Reply did nothing you could see.</b> It set a chip 337px below the
          button you pressed, off the bottom of the window, with nothing focused.
          The obvious repair was to scroll down to the box, and it cannot be made
          to work: the scroll drags the infinite-scroll sentinel through the
          window, which loads a page, which grows the thread under the box you
          were heading for. Traced frame by frame, the box got to 570px and was
          still closing, then the thread went 472px to 943px in three frames and
          it was flung back to 937 in a 900px window. Chasing it is worse, because
          every page that lands moves it again. A treadmill, not a race. So the
          box comes to you: it opens under the comment you pressed. It also says
          which comment better than a chip could, so the chip is gone.
        </p>
        <p>
          <b>The heart and Reply were 26x18 and 29x16</b>, under the 24px floor on
          a laptop and nowhere near 44 on a phone. The glyphs did not move and the
          row is the same height; only the hit area grew.
        </p>
        <p>
          <b>The admin shield was painted on every comment</b>, at full opacity,
          permanently. Five comments meant five of them down the right edge. Only
          an admin could see it, which is why it lasted. It hides until you point
          at a row now, like the menu beside it always has.
        </p>
        <p>
          <b>The box took 1000 characters and showed about sixty.</b> Enter sends,
          Shift and Enter make a new line, and it stops growing at five.
        </p>
        <p>
          <b>Closing jerked 9px before it closed.</b> A class was toggling on the
          same render that started the collapse, so the panel leapt up a frame
          before the tween drew anything. Pinned by e2e/comments-close.spec.ts,
          which asserts that nothing above the panel moves while it collapses.
        </p>

        <h3>What it does now that it did not</h3>
        <p>
          <b>The thread unrolls.</b> It was one flat fade of the whole list. Each
          comment rises into place a beat after the one above it, and a reply
          rises with the comment it hangs off.
        </p>
        <p>
          <b>The one you just wrote is yours for a moment.</b> A wash of the
          app&rsquo;s own warm ink behind the row, receding; your bird arrives
          rather than appears; the arrow flies up out of the send button and a
          fresh one rises into its place.
        </p>
        <p>
          <b>A comment answers the pointer</b>, so the Reply and the heart belong
          to a row instead of floating between two.
        </p>
        <p>
          <b>A reply&rsquo;s bird is a rung smaller</b>, 28 against 34, so the
          shape of a conversation is legible without reading it. An indent and a
          1px line were carrying that alone.
        </p>
        <p>
          <b>A date stops saying the year when it is this year.</b> Eighteen rows
          each ending &ldquo;2026&rdquo; told you nothing. App-wide, not just here.
        </p>
        <p>
          <b>The close is 380ms, not 550.</b> It was slowed on purpose, because the
          close read as an abrupt snap &mdash; but it also began with that 9px
          jump, and a movement that starts with a discontinuity reads as abrupt
          however long it takes. The duration was compensating for a bug.
        </p>

        <h3>One thing deliberately not done</h3>
        <p>
          Your own comment still waits on the server before it appears. Making it
          instant needs the viewer&rsquo;s own name and bird on the client, and
          this app has no client session anywhere, so it is plumbing rather than a
          tweak &mdash; the same plumbing that would put your bird beside the box
          you type in. Parked on 2026-09-16, to be revisited if the wait reads as
          slow in production rather than in a dev build.
        </p>
        <p className="cm-keep">
          The reply spine stays, and it is the one hairline here that earns its
          place: it says which comment these belong to. iOS draws lines inside a
          group and space between groups, and that is exactly the difference.
        </p>
      </div>
    </DelightShell>
  );
}

const ROOM_CSS = `
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
.cm-note h3 {
  margin: 2.5rem 0 .75rem; font-size: .8rem; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.cm-note h3:first-child { margin-top: 0; }
.cm-note p { margin: 0 0 .9rem; font-size: .95rem; line-height: 1.6; }
.cm-note b { font-weight: 600; color: var(--foreground); }
.cm-keep { color: var(--muted-foreground); }
.cm-note { margin-top: 3.5rem; max-width: 60ch; }
`;
