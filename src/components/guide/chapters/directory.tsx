import { Chapter, Section, P, type ChapterProps } from "../guide-kit";
import { Tap } from "../tap";

/* Read off the code on 2026-09-27 (docs/spec/guide.md section 7): a blue
   circle is a cluster of cities and zooms in when pressed, a green one is
   a single city and opens its people (alumni-map.tsx); wheel, pinch and
   the +/- buttons zoom; search matches name, work and city (where.ts).
   The privacy paragraph says only what the code enforces: sign-in
   everywhere (proxy.ts), search engines kept out (robots.ts), contact
   details only to verified viewers (profile/[id]/page.tsx). Nothing stops
   a signed-in member paging through the directory, so it makes no promise
   about scraping. */

export function DirectoryChapter({ bare }: ChapterProps) {
  return (
    <Chapter title="The Directory" bare={bare}>
      <P>
        The Directory is everyone who has joined, and where they live now. You can look through
        it three ways: Map, Batches and People.
      </P>

      <Section title="The map">
        <P>
          Each circle on the map is a group of members. A blue circle covers several cities:{" "}
          <Tap /> it, or zoom in, and it splits apart. A green circle is a single city. <Tap cap />{" "}
          it to see everyone who lives there, then <Tap /> a name to open that person&rsquo;s
          profile.
        </P>
        <P>
          To zoom, pinch on a phone or scroll on a computer. Members who have not added a city
          are not on the map yet; the note in the corner says how many.
        </P>
      </Section>

      <Section title="Batches and People">
        <P>
          Batches groups everyone by the year their class finished school. <Tap cap /> a year to
          see who is in it. People is everyone in one list: search it by name, city or work, or
          use Filters to narrow it by city, batch, profession, or alumni and teachers.
        </P>
      </Section>

      <Section title="Your profile">
        <P>
          Everything on your profile can be seen by other members. Please fill in as much as you
          are comfortable sharing: every detail makes the Directory more useful, and the city you
          live in is what puts you on the map. To change anything, open your profile and{" "}
          <Tap /> Edit profile.
        </P>
        <P>
          None of it is public. The site is closed to search engines and to anyone without an
          account, and your contact details (email, phone numbers and social accounts) are shown
          only to members an admin has verified as having been at Rishi Valley. Please use other
          people&rsquo;s details only to get in touch, never for a mailing list or to sell
          something.
        </P>
      </Section>
    </Chapter>
  );
}
