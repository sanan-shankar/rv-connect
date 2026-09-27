import { Chapter, Section, P, GuideLink } from "../guide-kit";
import { Tap } from "../tap";

/* Read off the code on 2026-09-27 (docs/spec/guide.md section 7). Valley
   photographs wait for an admin unless the uploader is marked trusted
   (collection-photo.ts); the kinds along the top are the six buckets
   (collection.ts); search reads the description and the contributor's
   name, not the kinds (collection/actions.ts); the year rail and the phone
   scrubber both sit on the right. A photograph is re-encoded at full
   resolution and the original file is not kept (upload-shared.ts), so this
   says "full resolution" and never "original". The Class Collection is
   reached through the caret beside the title, shown to verified members
   with a batch year, and skips review (scope-caret.tsx,
   photo-visibility-rule.ts). */

export function CollectionChapter() {
  return (
    <Chapter title="The Valley Collection">
      <P>
        Almost everyone from Rishi Valley has tried to describe the place to someone, then found
        they did not have a single good photograph to show them. The Valley Collection is meant
        to fix that. Instead of one person building an archive, everyone adds to it.
      </P>

      <Section title="Adding photographs">
        <P>
          Anyone can add photographs with Contribute. Please give each one at least the year it
          was taken, even a guess. A line about what is happening and where helps too, because
          that is what people search for later. An admin looks at every photograph before it
          appears, to keep the standard high enough that the good ones are not buried under
          blurry or very small pictures.
        </P>
        <P>
          If you have a large set to add, more than twenty or so, write to us from{" "}
          <GuideLink href="/messages">Reach out</GuideLink> and we will help you with it.
        </P>
      </Section>

      <Section title="Finding photographs">
        <P>
          The words along the top (People, Birds, Nature and so on) show one kind of photograph
          at a time. You can sort by newest or oldest added, by most loved, or by the
          year each was taken, and the years down the right-hand side take you to any year.
          Search reads the descriptions people have written, so &ldquo;banyan&rdquo; or
          &ldquo;cave rock&rdquo; finds the photographs that mention them.
        </P>
        <P>
          Photographs are kept at full resolution, and the download button gives you the
          full-size picture. If you want to use someone&rsquo;s photograph for anything, ask the
          person who added it first.
        </P>
      </Section>

      <Section title="Your Class Collection">
        <P>
          Once your profile is verified, a small arrow appears beside the title. <Tap cap /> it to
          switch to your Class Collection: photographs only people from your batch can see.
        </P>
        <P>
          Batches have tried shared albums before, usually on Google Photos, and they tend to
          stall: everyone who adds to one uses up their own storage, so people stop adding.
          The Class Collection costs you nothing. The storage is paid for by the site, out of
          what members give on the Support page, so there is room for thousands of photographs
          of your class.
        </P>
        <P>
          Nothing added to the Class Collection is reviewed. Photographs of the valley that
          everyone should see belong in the Valley Collection; anything else you want to keep,
          however blurry or particular to your class, belongs here.
        </P>
      </Section>
    </Chapter>
  );
}
