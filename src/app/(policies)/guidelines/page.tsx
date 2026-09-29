import type { Metadata } from "next";
import Link from "@/components/common/link";
import { DocTitle, Section, P, Bullets } from "../_shared";

export const metadata: Metadata = {
  // The root layout templates this into "Rishi Valley · Community guidelines".
  title: "Community guidelines",
  description: "How we treat each other on the Rishi Valley community website.",
};

/**
 * The community guidelines (audit H12). The warmest of the three documents:
 * this one is actually meant to be read, so it sounds like the community
 * talking rather than a policy talking.
 */
export default function GuidelinesPage() {
  return (
    <article>
      <DocTitle updated="20 August 2026">Community guidelines</DocTitle>

      <Section title="The spirit of the place">
        <P>
          This site exists so people who shared the valley can find each other again.
          Most of what makes it work is the same thing that made school work: knowing
          the people around you are real, and treating them well. Everything below is
          that, written down.
        </P>
      </Section>

      <Section title="Be who you say you are">
        <P>
          Real names, real histories. The directory is only worth anything because every
          name in it is a real person someone remembers. Do not sign up as someone else,
          invent a connection to the school, or run more than one account.
        </P>
      </Section>

      <Section title="Disagree well">
        <P>
          Argue with ideas as hard as you like; leave the person intact. No harassment,
          no bullying, no hate directed at who somebody is, and no piling on. If a thread
          is making you angry, the site will still be here tomorrow.
        </P>
      </Section>

      <Section title="Other people's details are theirs">
        <Bullets
          items={[
            "Contact details you can see here were shared for keeping in touch. Do not copy them into lists, pass them to people outside the community, or use them for promotion.",
            "Think before posting a photograph of someone else, especially of their children. If they ask you to take it down, take it down.",
            "What members share here stays here. Screenshotting someone's post into another group chat is the fastest way to make people stop writing honestly.",
          ]}
        />
      </Section>

      <Section title="What doesn't belong">
        <Bullets
          items={[
            "Spam, chain messages, or commercial advertising. Telling old friends about the thing you have built is welcome; using the directory as a lead list is not.",
            "Anything unlawful, and anything sexual involving minors, which is reported to the authorities without discussion.",
            "Deliberate misinformation presented as fact.",
          ]}
        />
      </Section>

      <Section title="When something goes wrong">
        <P>
          Every post has a report option, and any member can be flagged to the admin.
          Reports go to a person, not an algorithm; they are read, and the reporter hears
          back. The usual response is a conversation. Content that breaks these
          guidelines may be hidden, and accounts that repeatedly work against them may
          lose verification or be blocked. The full mechanics live in the{" "}
          <Link href="/terms" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            terms of use
          </Link>
          .
        </P>
      </Section>

      <Section title="The one-line version">
        <P>
          Be the person your housemaster thought you were.
        </P>
      </Section>
    </article>
  );
}
