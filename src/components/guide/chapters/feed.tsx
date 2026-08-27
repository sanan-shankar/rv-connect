import { Chapter, Section, P, Compare, BlankMark, Doorway } from "../guide-kit";

/* Targeting follows src/lib/post-visibility-rule.ts: a post with no
   targetBatches is visible to every member, one with them is visible only to
   those batches. */

export function FeedChapter() {
  return (
    <Chapter
      title="The Feed"
      lede="Where the everyday things go. Somebody moved cities, somebody found a photograph, somebody has a question only this lot can answer."
    >
      <Section title="What a post is for here">
        <P>
          Write the thing you would tell a friend from your year if you ran into them. Where
          you are now, what you are doing, who you saw last month, a question you want a
          straight answer to. Short is fine.
        </P>
        <P>
          If a piece of writing is long enough that you are thinking about paragraphs, it is
          a letter. If a photograph is one that should still be here in twenty years, it is
          for the Collection. Both have their own place so that neither has to compete with
          a post about lunch.
        </P>
      </Section>

      <Section title="Who sees it">
        <P>A post reaches everyone unless you narrow it, and you can narrow it by batch.</P>
        <Compare
          rows={[
            {
              key: "all",
              mark: <span className="size-2.5 rounded-full bg-canopy" />,
              label: "Everyone",
              note: "The default. Every member of the site can see it.",
            },
            {
              key: "batch",
              mark: <BlankMark />,
              label: "Chosen batches only",
              note: "Nobody outside those years sees it at all, not even in search.",
            },
          ]}
        />
        <P>
          Nothing here is public. The whole site is behind a sign-in, so a post is never
          visible to somebody who did not go to Rishi Valley.
        </P>
      </Section>

      <Section title="What a post can hold">
        <P>
          Text, photographs, and a poll if you want a count rather than a conversation.
          Everything can be commented on, and the heart is the cheap way to say you read it
          without making somebody feel obliged to reply.
        </P>
      </Section>

      <Section title="If something is wrong">
        <P>
          Every post has a report option and it goes to a person, not an algorithm. You will
          hear back. The usual outcome is a conversation rather than anything dramatic.
        </P>
      </Section>

      <Doorway href="/feed">Go to the Feed</Doorway>
    </Chapter>
  );
}
