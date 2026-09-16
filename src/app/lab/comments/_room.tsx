"use client";

/* ------------------------------------------------------------------ *
 *  Three answers to one question, on real posts.
 *
 *  Everything below is the shipped PostCard and the shipped
 *  CommentsSection. The only thing this room does is hand them a `look`.
 *  That is deliberate: a pick here becomes the spec, so what he judges
 *  has to be the component and not a copy of it.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { Seg, DelightShell } from "../_kit";

type Look = "rule" | "space" | "well";

const LOOKS: { v: Look; label: string }[] = [
  { v: "rule", label: "Today" },
  { v: "space", label: "Space" },
  { v: "well", label: "Well" },
];

const SAYS: Record<Look, string> = {
  rule: "A line runs the full width of the card, then the thread. With nothing posted yet, a second sentence says so.",
  space: "No line. The gap does the separating, one golden step wider than it was. An empty thread is just the box you type in.",
  well: "The thread sits in a tray cut into the card. The change of surface separates it, so no line and a smaller gap above.",
};

export function CommentsRoom({ busy, empty }: { busy: PostData | null; empty: PostData | null }) {
  const [look, setLook] = useState<Look>("space");

  return (
    <DelightShell
      title="Is the line under a post a necessity?"
      lede="Flip between the three and watch the same two posts change."
      css={ROOM_CSS}
    >
      <div className="cm-bar">
        <Seg options={LOOKS} value={look} onChange={setLook} />
        <p className="cm-says">{SAYS[look]}</p>
      </div>

      <div className="cm-stage">
        <div className="cm-slot">
          <h2 className="cm-cap">A thread people are in</h2>
          {/* No `key` tied to the look. Remounting reloaded the thread on every
              switch and the panel was caught mid-measure with its tray clipped.
              The look is a prop, so it changes in place. */}
          {busy ? (
            <PostCard
              post={busy}
              commentsLook={look}
              defaultCommentsOpen
            />
          ) : (
            <p className="cm-none">No post on the feed has comments on it yet.</p>
          )}
        </div>

        <div className="cm-slot">
          <h2 className="cm-cap">Nobody has said anything</h2>
          {empty ? (
            <PostCard
              post={empty}
              commentsLook={look}
              defaultCommentsOpen
            />
          ) : (
            <p className="cm-none">Every post on the feed has comments on it.</p>
          )}
        </div>
      </div>

      <div className="cm-note">
        <p>
          The line is the thing to look at. It runs edge to edge under every open
          thread, and it is the strongest horizontal in the card.
        </p>
        <p>
          The design system already has a view on this. Sections are separated by
          space and never a hairline, written down on 2026-09-08 for dialogs. The
          reason given there was iOS: lines go between rows inside one box, and
          whole groups are told apart by space. A post and its thread are two
          groups. The byline hairline on a letter went for the same reason
          earlier today.
        </p>
        <p>
          One thing the Well costs: mist is reserved for one recessed region per
          card, never two adjacent. A post with a photograph in it is fine, but it
          does mean the thread has spent the card&rsquo;s one well.
        </p>
      </div>
    </DelightShell>
  );
}

const ROOM_CSS = `
.cm-bar {
  display: flex; flex-direction: column; gap: .75rem;
  margin-bottom: 2rem;
}
.cm-says {
  margin: 0; max-width: 46ch;
  font-size: .9rem; line-height: 1.5; color: var(--muted-foreground);
}
.cm-stage {
  display: grid; gap: 2.5rem;
  grid-template-columns: 1fr;
}
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
.cm-note {
  margin-top: 3rem; max-width: 60ch;
  display: flex; flex-direction: column; gap: 1rem;
}
.cm-note p { margin: 0; font-size: .95rem; line-height: 1.6; }
`;
