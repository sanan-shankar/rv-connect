import { Chapter, Section, P, Doorway } from "../guide-kit";

export function DirectoryChapter() {
  return (
    <Chapter
      title="The Directory"
      lede="Everyone who has joined, and where they are now. This is the part of the site people came for."
    >
      <Section title="Two ways to look">
        <P>
          The people view searches by name, by city, or by what somebody does. The map view
          shows where everyone is, with a headcount per city, and it fills in as people add
          theirs. If the map looks empty for a country you know people live in, it means they
          have not filled in a city yet, not that they are not here.
        </P>
      </Section>

      <Section title="What other members can see about you">
        <P>
          Your name, your batch, and whatever you have chosen to put on your profile. Your
          email address is yours to show or hide, and it is hidden unless you say otherwise.
          Change any of it from your own profile.
        </P>
      </Section>

      <Section title="What the directory is not">
        <P>
          It is not a mailing list. Contact details here were shared so that old friends
          could get back in touch, and copying them into a list, passing them on, or using
          them to sell something is the fastest way to make people take their details down.
          That one is in the community guidelines too.
        </P>
      </Section>

      <Doorway href="/directory">Go to the Directory</Doorway>
    </Chapter>
  );
}
