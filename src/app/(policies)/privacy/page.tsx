import type { Metadata } from "next";
import Link from "@/components/common/link";
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
      <DocTitle updated="30 October 2026">Privacy policy</DocTitle>

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
              <strong>The entry question:</strong> what you typed at the question every new
              account starts with, right or wrong, whether you asked for a different one,
              the kind of device you used and your country. We read these to make the
              questions fairer. Once you join, they are linked to your account.
            </>,
            <>
              <strong>Security and usage records:</strong> sign-in attempts, the network
              address requests come from (used for rate limiting and abuse prevention),
              and a record of how you use the site. For each visit that is when it began
              and ended, the pages you went through, the site that sent you, your kind of
              device, its operating system and browser, your language, and your
              approximate location (country, region and city) worked out from your network
              address. The site also keeps what you search for, and which profiles,
              letters, photographs and Catch-up Editions you open and how often. PostHog,
              an analytics service listed below, separately records the pages you open and
              what you press on them.
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
          can undo at any time by editing your profile.
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
            ["Vercel", "Runs the website, in Mumbai, India, and delivers it through a global network"],
            ["Cloudflare", "Stores and serves images and voice recordings, and checks that sign-ups and sign-ins come from a person"],
            ["Resend", "Sends the site's emails (United States)"],
            ["Razorpay", "Processes contributions (India); card details never reach us"],
            ["Upstash", "Short-lived counters for rate limiting, such as recent sign-in attempts from one network address"],
            ["PostHog", "Usage analytics, in the European Union: the pages opened and what is pressed on them, with browser and device details, under an account number and batch year rather than a name. Clicks on anything showing a person, such as a name, photo or contact details, are not sent, and search words are hidden"],
            ["Sentry", "Error reporting, in the European Union: server errors, and timings for one request in ten, with the page address and browser type, but not your sign-in cookie, your location or your searches"],
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
            ["Notifications", "30 days"],
            ["Sign-in and security logs", "1 year"],
            ["Answers at the entry question", "1 year"],
            ["Email delivery records", "180 days"],
            ["Visit statistics and search history", "90 days"],
            ["What you opened, and how often", "Until your account is deleted"],
            ["A deleted account", "Fully erased 60 days after you ask (see below)"],
          ]}
        />
      </Section>

      <Section title="Deleting your account">
        <P>
          You can delete your account yourself, from your profile, at any time. To protect
          you from someone else doing it with a borrowed session, deletion asks for your
          password, and then waits 60 days before becoming final. During those 60 days
          your profile, posts, letters and comments are hidden from other members, while
          your photographs in the Collection and your Catch-up answers stay up; simply
          signing in again cancels the deletion and brings everything back. After 60 days
          the account, your posts, letters, comments, photographs, Catch-up answers,
          messages to the admin and profile are permanently erased, including the stored
          image files and voice recordings.
        </P>
        <P>
          A few things outlive deletion, deliberately: contribution records (kept for tax
          purposes, no longer linked to a profile), reports you filed (kept in the
          moderation record without your name), Catch-up questions you asked that someone
          answered (kept without your name; questions nobody answered are erased), and a
          one-line audit record that the deletion happened. Your sign-in and security
          logs, your answers at the entry question and your searches stay until their
          time in the table above runs out, the last two no longer linked to you.
          Backups age out on their own cycle within a few weeks.
        </P>
      </Section>

      <Section title="Your rights">
        <P>
          You can see and change everything on your profile by editing it, except the
          email address you sign in with: that cannot yet be changed from inside the
          site, so to change it, write to the admins from Reach out, in the site&apos;s
          menu. The email in your contact details is only the one other members see, and
          changing it does not change the address you sign in with.
        </P>
        <P>
          You can download a copy of your data, as one file, with &ldquo;Request your
          data&rdquo; on your profile. It holds your profile; everything you wrote, posted
          and uploaded; your hearts, saved posts and poll votes; your Catch-ups and their
          reminders; your contributions; and the site&apos;s record of your visits,
          searches, what you opened, your answers at the entry question, your
          notifications and the emails it sent you. It leaves out what would help someone
          get into your account and what belongs to other people, such as reports they
          filed about you and the admins&apos; own notes, and names those inside the file.
          The sign-in and security logs are not in it; write to the address below if you
          want them too.
        </P>
        <P>
          You can delete your account as described above. If you believe something about
          you is wrong and you cannot fix it yourself, or you want to object to how
          something is handled, write to the address below. If you are in the UK or the EU
          you also have the right to complain to your data protection authority, which in
          the UK is the ICO (ico.org.uk).
        </P>
      </Section>

      <Section title="Cookies">
        <P>
          The site uses a small number of first-party cookies, all listed here. There are
          no advertising or third-party tracking cookies.
        </P>
        <FactTable
          headers={["Cookie", "What it does"]}
          rows={[
            ["Signed in", "Keeps you signed in, for 90 days or until you sign out"],
            ["Sign-in form", "Two cookies the sign-in form needs while you sign in, gone when you close your browser"],
            ["Theme", "Remembers whether you chose light or dark on this device, for a year"],
            ["Visits", "Groups the pages of one visit for the visit statistics, and lapses 30 minutes after your last page"],
            ["Entry question", "Recognises the same browser at the entry question for 30 days, so that someone who tries again on another day is counted once"],
            ["Entry question passed", "Remembers for 30 minutes that you got the entry question right, so you can finish signing up"],
            ["Robot check", "After you sign up or reset your password, lets you sign in without a second robot check, for 5 minutes"],
            ["Analytics", "PostHog's identifier for this browser, which it also keeps in the browser's storage; it lasts a year from your last visit, and signing out replaces it with a new one"],
          ]}
        />
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
