import { Chapter, P } from "../guide-kit";

/* Read off the code on 2026-09-27 (docs/spec/guide.md section 7): a letter
   shows in the Feed as a card as well as on /letters (post-feed.tsx); up
   to three photographs (feed/actions.ts); drafts live on the server and
   are listed under "Your drafts" on /letters, so they follow the member
   to any device (use-letter-persistence.ts, drafts-strip.tsx). The old
   chapter said a letter stayed out of the Feed and that drafts lived on
   the device; neither was true. */

export function LettersChapter() {
  return (
    <Chapter title="Letters">
      <P>
        Letters are for writing that is longer or more considered than a post: essays, poems,
        travelogues, an account of a year, a piece about a teacher. A post in the Feed lasts
        longer than a message in a WhatsApp group, and a letter lasts longer still. Each one gets
        a page of its own, set out to be read properly.
      </P>
      <P>
        Letters appear in the Feed and on the Letters page, and every member can read them.
        People can like and comment on a letter just as they would on a post, and you can add up
        to three photographs to one.
      </P>
      <P>
        You do not have to finish in one sitting. Save as draft keeps it for later, and you can
        pick it up again from Your drafts on the Letters page, on any device.
      </P>
    </Chapter>
  );
}
