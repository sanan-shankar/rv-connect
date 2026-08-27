import { Chapter, Section, P, Compare, Doorway } from "../guide-kit";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/upload-shared";

/* The limits are imported rather than typed out, so the chapter cannot drift
   from the rule it is describing (src/lib/upload-shared.ts). Approval follows
   isPhotoAutoApproved in src/lib/collection-photo.ts. */

export function CollectionChapter() {
  return (
    <Chapter
      title="The Valley Collection"
      lede="One archive of photographs of the valley, kept properly, so that pictures scattered across shoeboxes and phones end up somewhere they can be found again."
    >
      <Section title="What belongs here">
        <P>
          Photographs worth keeping. The valley itself, the buildings, assembly, the birds,
          a class on the steps, a play, a trek. Anything that shows what the place was like
          in a particular year, to someone who was not there.
        </P>
        <P>
          This is not the feed. A picture of your lunch from last Tuesday belongs there. So
          does a snapshot that means something only to the four people in it. The test worth
          applying: would somebody in twenty years be glad this was kept?
        </P>
      </Section>

      <Section title="Adding one">
        <P>
          Contribute takes as many photographs as you like, up to {MAX_PHOTOS_PER_ACCOUNT}{" "}
          per account, at up to 20MB each. Tell it roughly when the picture was taken and
          where in the valley it is. Both are optional and both make it findable later, which
          is the whole point of putting it here rather than in a chat.
        </P>
      </Section>

      <Section title="What happens after you add one">
        <P>Photographs are checked before they appear, and that gate lifts for you over time.</P>
        <Compare
          rows={[
            {
              key: "pending",
              mark: <span className="size-2.5 rounded-full bg-cinnamon" />,
              label: "Waiting",
              note: "An admin looks at it first. You can see your own while it waits.",
            },
            {
              key: "trusted",
              mark: <span className="size-2.5 rounded-full bg-canopy" />,
              label: "Straight in",
              note: "Once you are a trusted contributor, everything you add appears at once.",
            },
          ]}
        />
        <P>
          Nothing is rejected quietly. The check is for the obvious: a photograph that is not
          of the valley, or one somebody in it would not want kept.
        </P>
      </Section>

      <Section title="Somebody else is in the picture">
        <P>
          Think before adding a photograph of other people, particularly of children. If
          anyone in it asks for it to come down, it comes down. That is the same rule as the{" "}
          community guidelines, and it matters more here, because the point of an archive is
          that it lasts.
        </P>
      </Section>

      <Doorway href="/collection">Go to the Collection</Doorway>
    </Chapter>
  );
}
