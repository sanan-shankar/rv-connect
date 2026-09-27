import { Chapter, Section, P } from "../guide-kit";
import { Tap } from "../tap";

/* Read off the code on 2026-09-27 (docs/spec/guide.md section 7): the
   audience is Everyone or ONE of the poster's own cities, never a batch
   (city-scope.ts; the composer never sends targetBatches); up to three
   photographs and a poll can share a post (upload-ownership-rule.ts,
   create-post-form.tsx); a poll never names its voters (poll-display.tsx);
   Add to the Collection sends the photographs to the review queue
   (collection-intake.ts); Saved is private (saved-posts-feed.tsx); a post
   is reported from its menu and a person flagged from their profile
   (report-action.ts). Comments cannot be reported, so it does not say so. */

export function FeedChapter() {
  return (
    <Chapter title="The Feed">
      <P>
        The Feed is for anything worth sharing with the whole Rishi Valley community: a memory
        of the school, news about your life, a question, something useful you have come across.
      </P>
      <P>
        Some things are better on WhatsApp. Class groups, political discussions, videos and
        forwards all work better there, and we are not trying to replace any of them. Post here
        when something is likely to interest most people and is worth keeping for a while.
      </P>
      <P>
        A lot of people have muted or left the big alumni groups on WhatsApp, because there are
        too many messages to keep up with. The Feed is meant to work for them too:
        somewhere you can look in now and then, read what is worth reading, and get on with
        your day.
      </P>

      <Section title="Posting">
        <P>
          A post can have up to three photographs and a poll. Polls never show who voted for
          what. If a post only concerns people in one of the cities on your profile, such as a
          get-together in Bengaluru, you can show it to the members in that city alone. Otherwise
          every member sees it.
        </P>
        <P>
          If your photographs belong in the Valley Collection as well, choose Add to the
          Collection from the + menu before you post. They join the Collection once an admin has
          looked at them.
        </P>
      </Section>

      <Section title="What you can do with a post">
        <P>
          <Tap cap /> the heart to like a post and the ribbon to save it. Everything you save is
          kept on your profile under Saved, where only you can see it. You can comment on any
          post and reply to any comment.
        </P>
        <P>
          If a post seems inappropriate, or you are unsure about the person who wrote it, report
          the post from its menu, or flag the person from their profile. An admin will look into
          it.
        </P>
      </Section>
    </Chapter>
  );
}
