import type { Metadata } from "next";
import Link from "next/link";
import { DocTitle, Section, P, Bullets, FactTable } from "../_shared";

export const metadata: Metadata = {
  // The root layout templates this into "Rishi Valley · Privacy".
  title: "Privacy",
  description: "How the Rishi Valley community website looks after your information.",
};

/**
 * The privacy policy (audit H12). Written to be read by a member, not a
 * lawyer: plain sentences, honest about where things live, and complete on
 * the points GDPR actually requires (what, why, where, how long, your
 * rights, who to talk to). The controller's contact details sit at the end,
 * findable but not featured, per the owner's decision of 2026-08-19.
 */
export default function PrivacyPage() {
  return (
    <article>
      <DocTitle updated="20 August 2026">Privacy policy</DocTitle>

      <Section title="The short version">
        <P>
          This is a private community website for people who studied or worked at Rishi
          Valley School. What you share here is shown to other members of that community,
          and to no one else. We do not sell your information, we do not show
          advertisements, and we collect nothing beyond what the site needs to work.
        </P>
      </Section>

      <Section title="What this covers">
        <P>
          This policy covers rishivalley.space, a website run privately by a member of the
          alumni community. It is not run by Rishi Valley School, and the school does not
          receive or provide any personal information for it.
        </P>
      </Section>

      <Section title="What we hold about you">
        <Bullets
          items={[
            <>
              <strong>Your account:</strong> your name, email address and password. The
              password is stored only in a hashed form that cannot be read back.
            </>,
            <>
              <strong>Your profile, as much of it as you choose to fill in:</strong> your
              years at the school and batch, the cities you live in, work and job title,
              phone numbers, social links, a photo, a short bio, houses, and admission
              number. All of it is optional except your name.
            </>,
            <>
              <strong>What you write and share:</strong> posts, letters, comments,
              photographs, Catch-up answers, and messages to the admin.
            </>,
            <>
              <strong>Contribution records</strong> if you choose to support the site:
              the amount, date and payment status. Card and bank details go directly to
              the payment provider (Razorpay) and never touch this site.
            </>,
            <>
              <strong>Security and usage records:</strong> sign-in attempts, the network
              address requests come from (used for rate limiting and abuse prevention),
              and basic, first-party usage analytics that help us understand which parts
              of the site are used.
            </>,
          ]}
        />
      </Section>

      <Section title="What we use it for">
        <Bullets
          items={[
            <>
              <strong>Running the community</strong> is the point of all of it: your
              profile and what you post exist to be seen by other members.
            </>,
            <>
              <strong>Verification:</strong> to keep the community genuine, new accounts
              are checked against the school community, either against the alumni
              registration lists or by the admin personally.
            </>,
            <>
              <strong>Safety:</strong> sign-in records, rate limits and the moderation
              tools protect members from abuse and the site from break-ins.
            </>,
            <>
              <strong>Email:</strong> we email you to confirm your address, to reset your
              password, and for security notices about your account. There is no
              marketing email.
            </>,
          ]}
        />
        <P>
          In legal terms: most processing is necessary to provide the service you signed
          up for; security, verification and analytics rest on legitimate interest; and
          optional profile details are processed because you chose to add them, which you
          can undo at any time in settings.
        </P>
      </Section>

      <Section title="Who can see what">
        <P>
          Nothing about you is public. The site sits behind a sign-in, and what members
          can see grows with trust: a brand-new account can read the feed but sees no
          names in the directory; an account with a confirmed email can see profiles; and
          contact details are shown only to members the admin has verified as genuinely
          part of the community. Your own profile is always fully visible to you.
        </P>
        <P>
          One honest caveat: images are served from a content delivery network. Their
          addresses are long and not guessable, but anyone who has an image&apos;s exact
          address can view that image without signing in. Keep that in mind for
          photographs you would not want forwarded.
        </P>
      </Section>

      <Section title="Where it lives">
        <P>
          The site runs on well-known infrastructure providers, each bound by its own
          data-processing agreement. Some of them process data outside the UK and the EU;
          those transfers rest on the providers&apos; standard contractual clauses.
        </P>
        <FactTable
          headers={["Provider", "What it does"]}
          rows={[
            ["Supabase", "The database, hosted in Mumbai, India"],
            ["Vercel", "Hosts and serves the website (United States and global edge)"],
            ["Cloudflare", "Stores and serves images"],
            ["Resend", "Sends the site's emails (United States)"],
            ["Razorpay", "Processes contributions (India); card details never reach us"],
            ["PostHog", "First-party usage analytics"],
            ["Sentry", "Error reporting, so breakages get noticed and fixed"],
          ]}
        />
      </Section>

      <Section title="How long we keep things">
        <P>
          Content you post stays until you remove it or your account is deleted. Records
          with a shelf life are cleared on a schedule that runs automatically:
        </P>
        <FactTable
          headers={["Record", "Kept for"]}
          rows={[
            ["Messages to the admin", "2 years"],
            ["Reports and moderation records", "3 years"],
            ["Contribution records", "10 years, in line with tax record keeping"],
            ["Notifications", "1 year"],
            ["Sign-in and security logs", "1 year"],
            ["Email delivery records", "180 days"],
            ["A deleted account", "Fully erased 60 days after you ask (see below)"],
          ]}
        />
      </Section>

      <Section title="Deleting your account">
        <P>
          You can delete your account yourself, from settings, at any time. To protect
          you from someone else doing it with a borrowed session, deletion asks for your
          password, and then waits 60 days before becoming final. During those 60 days
          your profile disappears from the directory, and simply signing in again cancels
          the deletion. After 60 days the account, your posts, comments, photographs and
          profile are permanently erased, including the stored image files.
        </P>
        <P>
          A few things outlive deletion, deliberately: contribution records (kept for tax
          purposes, no longer linked to a profile), reports that were part of moderation
          decisions, and a one-line audit record that the deletion happened. Backups age
          out on their own cycle within a few weeks.
        </P>
      </Section>

      <Section title="Your rights">
        <P>
          You can see and change everything on your profile in settings. You can download
          a copy of your data, as one file, from the same place. You can delete your
          account as described above. If you believe something about you is wrong and you
          cannot fix it yourself, or you want to object to how something is handled,
          write to the address below. If you are in the UK or the EU you also have the
          right to complain to your data protection authority, which in the UK is the
          ICO (ico.org.uk).
        </P>
      </Section>

      <Section title="Cookies">
        <P>
          The site uses a small number of first-party cookies: one that keeps you signed
          in, one that remembers your theme, one short-lived cookie that groups a
          browsing session for the visit statistics, and the analytics described above.
          There are no advertising or third-party tracking cookies.
        </P>
      </Section>

      <Section title="Changes">
        <P>
          If this policy changes in a way that matters, the change will be announced on
          the site before it takes effect, and the date at the top always says when it
          was last touched.
        </P>
      </Section>

      <Section title="Who is responsible, and how to reach them">
        <P>
          The site is run personally by a member of the alumni community, who is the data
          controller for it. For anything in this policy, including exercising your
          rights: email{" "}
          <a href="mailto:sanan.shankar@gmail.com" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            sanan.shankar@gmail.com
          </a>
          , or write to Margravine Gardens, London, United Kingdom. You can also use the{" "}
          <Link href="/messages" className="font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy">
            message the admin
          </Link>{" "}
          page once signed in.
        </P>
      </Section>
    </article>
  );
}
