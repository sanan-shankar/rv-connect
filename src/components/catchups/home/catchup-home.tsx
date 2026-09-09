"use client";

/* ------------------------------------------------------------------ *
 *  /catchups/[id] — a Catch-up's home. A PLACE, not a page that
 *  reshapes itself.
 *
 *  His question, and the answer this file takes (N40): "is there a home
 *  page that you then keep navigating from to do things like answer or
 *  whatever, or does the home page transform into something each time. I
 *  think the answer being its own page is good."
 *
 *  A place. Four regions, always in the same spot, at every state and for
 *  every member:
 *
 *    the head      the picture, the name, the two doors
 *    the Edition   what this cycle is right now, and ONE thing to do
 *    the state     one line under it, right-aligned
 *    the sidebar   the earlier Editions, as covers, and nothing else
 *
 *  Only what is inside the second region changes. The first draft
 *  reshaped the whole page per state, which is why he could not find the
 *  same thing twice: "you've just totally changed the homepage into this
 *  new UI. All the controls are gone ... now I don't know where they are."
 *
 *  THE RULE THAT STOPS THE CONTROLS FLOATING AGAIN, and it is the whole
 *  lesson of the rejected first pass (N44: "nudge everyone, close now,
 *  just hanging in the middle of nowhere"):
 *
 *    A control is either the page's ONE primary action, in the content,
 *    attached to the thing it acts on -- or it is behind the Settings
 *    door on the picture. There is no third place, and there is never a
 *    row of equal-weight pills in the content.
 *
 *  ANSWERING HAPPENS HERE. His: "maybe we should just tie in the huge
 *  answering UI we had with our home screen ... it doesn't make sense to
 *  have the collecting in the home screen and then the answering takes
 *  you away from it." Only the reader is still its own address.
 *
 *  NO EDITION NUMBERS, anywhere: "Why do we need to have the round 4? It
 *  doesn't matter what round, it's going to be round 15." An Edition is
 *  identified by its date.
 *
 *  NOTHING THAT TEACHES. The rhythm line under the name and the sentence
 *  explaining what an Edition is are both gone: "everyone from 1978,
 *  every 3 months, that doesn't need to be said", and "we don't need to
 *  teach them how to use it."
 *
 *  THE TYPE RULE, which he asked for by name (N96). SERIF is a title or
 *  a name -- the page's title, a Catch-up's name, a dialog's title, a
 *  card's own title, a question, and the date that identifies an Edition
 *  on its cover. SANS is the app talking -- the label over a group, a
 *  state line, a hint, a value, a control, a count. It needs writing
 *  down because globals.css puts the heading face on h1 to h4, so a
 *  section LABEL marked up as an <h2> came out serif while the state line
 *  beside it, a <p>, came out sans.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RAIL_GRID } from "@/components/layout/rail-grid";
import { EditionCoverCard } from "@/components/catchups/index/edition-cover-card";
import { AnswerExperience } from "@/components/catchups/answer/answer-experience";
import {
  SettingsDialogs,
  SettingsPanel,
  SettingsSheet,
  useSettings,
} from "@/components/catchups/settings/settings-surface";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWideViewport } from "@/components/common/use-wide-viewport";
import { HomeHead } from "./home-head";
import { PeoplePanel } from "./people-door";
import { AskBox, AskedPanel } from "./collecting";
import type { CatchupHomeData } from "./types";

/* ── the state line ────────────────────────────────────────────────── *
 *  One line, the stage in words. No Edition number, no counts, and
 *  nothing the thing underneath already says.
 *
 *  Two lines were deleted here on 2026-09-07, both his. "Open for
 *  questions is not necessary because if the box is there, it implies
 *  that it's open for questions" -- so collecting has no state line at
 *  all; the ask box IS the line. And "Answers close Thursday 20 August,
 *  and it comes out the same day. Well, you don't need to say it comes
 *  out the same day. That's almost like implied. That's so stupid."
 *
 *  UNDER the tile and hard right, with air above it: "move Answers close
 *  Thursday 20 August to under the tile and align it to the right", then
 *  "it's hugging the bottom of the tile give some space above it." Above
 *  the tile it pushed the whole column down and the sidebar's first cover
 *  stopped lining up with the main column's first tile. */
function StateLine({ words }: { words: string | null }) {
  if (!words) return null;
  return <p className="mt-3.5 text-right font-sans text-[13.5px] text-muted-foreground">{words}</p>;
}

/* ── the sidebar ───────────────────────────────────────────────────── *
 *  The back numbers, and nothing else. His: "the sidebar is either empty
 *  or filled with nonsense. just put the previous rounds there."
 *
 *  He is right on both counts, and the second is measurable. The rail
 *  held a list of verbs, so on a batch Catch-up -- where nobody keeps
 *  anything and there is nothing to run -- it was ONE row, Reminders,
 *  alone in a 300px column. The verbs are behind the Settings door now.
 *
 *  NO HEADING over it. It said "Earlier Rounds" over a column of covers,
 *  each of which is a photograph with a date on it in a sidebar -- there
 *  is nothing else they could be. His: "delete the Earlier Rounds text
 *  completely. so both tiles move up and let their tops cleanly align."
 *  The alignment is the better argument: with a label here and a state
 *  line above the tile opposite, the two columns started twenty-odd
 *  pixels apart for no reason either of them could see. */
function EarlierEditions({
  covers,
  picture,
}: {
  covers: CatchupHomeData["earlier"];
  picture: { src: string; focus: string };
}) {
  /* THE COLUMN NEVER GOES EMPTY. On a Catch-up whose first Edition is
     still being made there are no back numbers, and the sidebar simply
     vanished -- so the page had a wide column and a void beside it, and
     then grew a sidebar out of nowhere the day Edition one came out. His:
     "make sure you have a pretty way of having at least something even
     maybe placeholder on the sidebar when it's the first catch up and
     there's no previous ones."

     What stands in is the Catch-up's own photograph at the cover's exact
     shape, quietened, with one line on it. Not a dashed box and not an
     empty-state illustration: the same object the column is made of, so
     when the first Edition arrives nothing moves. */
  if (covers.length === 0) {
    return (
      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="relative aspect-[16/9] min-[500px]:aspect-[5/2]">
          <Image
            src={picture.src}
            alt=""
            fill
            sizes="318px"
            style={{ objectPosition: picture.focus }}
            className="object-cover opacity-[0.45] grayscale-[0.35]"
          />
        </div>
        <p className="px-4 py-2.5 font-sans text-[13px] text-muted-foreground">
          Your previous Editions appear here
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {covers.map((e) => (
        <EditionCoverCard key={e.editionId} e={e} />
      ))}
    </div>
  );
}

/* ── the Edition region ────────────────────────────────────────────── */
function EditionRegion({
  data,
  onChanged,
}: {
  data: CatchupHomeData;
  onChanged: () => void;
}) {
  const { edition } = data;

  /* Over. Tested BEFORE the branches below, because an ended Catch-up has
     no live Edition: `!edition` was true and it fell through to offering
     "Start the first Edition" on a Catch-up that is finished and has
     already had several. His: "why is ended start the first round? ...
     Firstly, it wouldn't be the first round anyway." */
  if (data.catchupStatus === "ended") return null;
  if (!edition) return null;

  /* HELD. It used to render exactly what `answering` renders with one word
     changed, and he caught it: "why is paused the same as answering?" A
     held Catch-up is not one you can write in -- the clock is stopped, so
     the box would be a lie. It says so, once, and offers the one control
     that changes it.

     The sentence that used to sit here -- "Nothing goes out and no clock
     is running until someone starts it again" -- is deleted at his word.
     It explained the mechanism of a state whose name already says it. */
  if (data.catchupStatus === "paused") {
    return (
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
        <p className="font-heading text-[17px] text-foreground">This Catch-up is on hold</p>
        {data.viewer.isKeeper && (
          <Button size="sm" className="mt-4" onClick={onChanged} data-resume>
            Start it again
          </Button>
        )}
      </div>
    );
  }

  if (edition.status === "collecting") {
    return (
      <div>
        <AskBox
          editionId={edition.id}
          first={edition.prompts.length === 0}
          library={data.promptLibrary}
          onAsked={onChanged}
        />
        <AskedPanel
          editionId={edition.id}
          prompts={edition.prompts}
          youKeep={data.viewer.isKeeper && !data.isBatch}
          onChanged={onChanged}
        />
      </div>
    );
  }

  if (edition.status === "answering") {
    return (
      <AnswerExperience
        catchupId={data.catchupId}
        groupName={data.title}
        prompts={data.answering}
      />
    );
  }

  /* Out. The cover, and nothing else -- the same component the list and
     the sidebar draw, which is the whole of his "15 different ways in 15
     different places" complaint answered in one import. */
  return data.latest ? <EditionCoverCard e={data.latest} /> : null;
}

export function CatchupHome({ data }: { data: CatchupHomeData }) {
  const router = useRouter();
  /* Which SHELL the two doors open, chosen from the viewport rather than
     from a media query in CSS, because a dialog and a sheet are different
     components and only one of them may mount. Below 1024 a centred dialog is
     a sheet with worse manners. */
  const phone = !useWideViewport();
  const [people, setPeople] = useState(false);
  const [settings, setSettings] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const s = useSettings(data.settings, () => router.push("/catchups"));
  const refresh = () => router.refresh();

  const edition = (
    <div className="mt-5 min-[500px]:mt-6">
      <EditionRegion data={data} onChanged={refresh} />
      <StateLine words={data.stateLine} />
    </div>
  );

  const sidebar = <EarlierEditions covers={data.earlier} picture={data.picture} />;

  return (
    <div>
      <HomeHead
        name={s.live.name}
        picture={data.picture}
        onPeople={() => setPeople(true)}
        onSettings={() => setSettings(true)}
      />

      {/* THE GRID IS THE APP'S OWN, `layout/rail-grid.ts`: a fluid main
          column, a 318px rail, 30px between them, from 1180px up. This page
          had invented 300 and 56 and capped itself at 1096, which is why the
          right margin measured 148 against the left's 40 -- "the margin on
          the right is so much bigger than the margin on the left. That makes
          no sense."

          Below 1180 the rail stacks under the content, which is what the
          phone layout wants anyway: the back numbers come last. */}
      <div className={RAIL_GRID}>
        <div className="min-w-0">{edition}</div>
        <aside className="mt-11 self-start min-[1180px]:sticky min-[1180px]:top-10 min-[1180px]:mt-0 min-[1180px]:pt-6">
          {sidebar}
        </aside>
      </div>

      <PeoplePanel
        people={data.members}
        catchupId={data.catchupId}
        viewerId={data.viewer.id}
        /* Keeper of a PEOPLE Catch-up. Nobody keeps a batch one and its
           membership is the batch, so all three roster verbs are refused
           server-side there; this decides what is OFFERED, never what is
           allowed. */
        canManage={data.viewer.isKeeper && !data.isBatch}
        open={people}
        onClose={() => setPeople(false)}
        onChanged={refresh}
        phone={phone}
      />

      {/* ONE settings implementation, two frames. A sheet from the foot on a
          phone, a dialog on a laptop, and the panel inside them is the same
          component the /lab/catchups/settings room draws -- so the room he
          signed off and the shipped surface cannot drift. */}
      {phone ? (
        <SettingsSheet open={settings} onClose={() => setSettings(false)} title="Settings">
          <SettingsPanel {...s.panel} className="pb-3" />
        </SettingsSheet>
      ) : (
        <Dialog open={settings} onOpenChange={setSettings}>
          {/* `initialFocus` ON THE PANEL, and it is load-bearing. Base UI
              otherwise focuses the first focusable CHILD, which here is a
              settings row -- so the dialog opened with "Open answering"
              wearing a focus ring and a selected tint, which is to say the one
              control in the list that cannot be undone looked armed. Seen in a
              real browser at 1440, not reasoned about. */}
          <DialogContent initialFocus={panel} ref={panel} tabIndex={-1}>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <SettingsPanel {...s.panel} className="max-h-[60dvh]" />
          </DialogContent>
        </Dialog>
      )}
      <SettingsDialogs {...s.dialogs} />
    </div>
  );
}
