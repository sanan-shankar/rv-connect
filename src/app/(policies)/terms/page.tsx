import type { Metadata } from "next";
import Link from "next/link";
import { DocTitle, Section, P, Bullets } from "../_shared";

export const metadata: Metadata = {
  title: "Rishi Valley · Terms",
  description: "The terms of use for the Rishi Valley community website.",
};

/**
 * The terms of use (audit H12). Short on purpose: a volunteer-run community
 * site needs the handful of clauses that genuinely protect the members and
 * the person running it, not a transplanted corporate boilerplate.
 */
export default function TermsPage() {
  return (
    <article>
      <DocTitle updated="20 August 2026">Terms of use</DocTitle>

      <Section title="What this is">
        <P>
          rishivalley.space is a private community website for people connected to Rishi
          Valley School: former students, teachers and staff. It is run personally by a
          member of the alumni community, on a volunteer basis, and is not operated by or
          affiliated with the school. By creating an account or using the site you agree
          to these terms, to the{" "}
          <Link href="/guidelines" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            community guidelines
          </Link>
          , and to the handling of your information described in the{" "}
          <Link href="/privacy" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            privacy policy
          </Link>
          .
        </P>
      </Section>

      <Section title="Your account">
        <Bullets
          items={[
            "Membership is for people with a genuine connection to Rishi Valley School. Sign up as yourself, with your real name and your own history.",
            "One person, one account. Keep your password to yourself; what happens under your sign-in is your responsibility, so tell us straight away if you think someone else has it.",
            "Some parts of the site open only after the admin has verified that you are who you say you are. Verification is manual and may take a little while; it can also be declined or withdrawn if an account does not check out.",
          ]}
        />
      </Section>

      <Section title="What you post">
        <P>
          Everything you write or upload stays yours. By posting it you give the site
          permission to store it and show it to other members, which is the whole point
          of posting it. That permission ends when you delete the content or your
          account, except as described in the privacy policy&apos;s section on deletion.
        </P>
        <P>
          Post only what is yours to post. That matters most for photographs of other
          people and for other members&apos; contact details, which are shared with you
          for staying in touch, not for lists, marketing or passing on.
        </P>
      </Section>

      <Section title="Acceptable use">
        <P>
          The community guidelines say how to behave here; they are part of these terms.
          Beyond them: do not attempt to break into the site, probe it for weaknesses,
          scrape or bulk-download member information, use it to send unsolicited
          messages, or use it for anything unlawful.
        </P>
      </Section>

      <Section title="Contributions">
        <P>
          The site runs on member contributions. Contributing is voluntary, buys nothing,
          and is not a charitable donation in the tax sense. Payments are processed by
          Razorpay; contributions are not refundable except where the law requires it.
        </P>
      </Section>

      <Section title="Moderation">
        <P>
          The admin may hide content, decline or withdraw verification, or block or
          remove an account, where the guidelines or these terms are being worked
          against. The aim is always the lightest touch that keeps the place good.
          You can delete your own account at any time from settings.
        </P>
      </Section>

      <Section title="The honest limits">
        <P>
          The site is provided as it is, free, run by a volunteer in their spare time. We
          work to keep it available and to keep your data safe, but we cannot promise
          uninterrupted service or that nothing will ever go wrong, and to the extent the
          law allows, the site and the person running it are not liable for losses
          arising from using it. Nothing in these terms limits liability that the law
          does not allow to be limited.
        </P>
      </Section>

      <Section title="Changes and contact">
        <P>
          These terms may change as the site grows; meaningful changes will be announced
          on the site before they take effect. These terms are governed by the law of
          England and Wales. Questions go to{" "}
          <a href="mailto:sanan.shankar@gmail.com" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            sanan.shankar@gmail.com
          </a>{" "}
          or the message-the-admin page once signed in.
        </P>
      </Section>
    </article>
  );
}
