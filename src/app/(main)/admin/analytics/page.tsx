import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import {
  loadCatchups,
  loadContent,
  loadGeography,
  loadMail,
  loadPeople,
  loadPresence,
  loadSupport,
  loadTrends,
} from "@/lib/admin-analytics";
import { BarList, Panel, StatGrid, type Stat } from "@/components/admin/analytics/stat";
import { PresenceList } from "@/components/admin/analytics/presence";

export const metadata: Metadata = { title: "Analytics" };

/* This room reads live tables. Caching it would show a number that is wrong
   by however long the cache lived, on a page whose whole job is to be true. */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 *  The analytics room.
 *
 *  Built from the question list the placeholder version of this file
 *  carried, plus the owner's own list from the session that commissioned
 *  it: who joins and when, who they are, where they are, what gets
 *  written and whether it gets read, whether Catch-ups are answered, what
 *  has been given and how, whether email arrives, and who is still here.
 *
 *  TWO KINDS OF NUMBER, and the difference matters:
 *    LIVE      counted from the tables on every load. Exact. Can be
 *              broken down by batch, city, person.
 *    HISTORY   from MetricSnapshot, written nightly. The sparklines. The
 *              only numbers that outlive Sentry's 30-day window.
 *
 *  Sparklines stay absent until there are two nights of history. An empty
 *  chart frame is worse than no chart, so nothing draws one.
 *
 *  LAYOUT, against the owner's complaint about the tools this replaces
 *  ("a lot of white space, a lot of tiles that are full width when it can
 *  be in columns"): four tiles per row on desktop, two on a phone, and
 *  every panel half-width. Nothing on this page is full-bleed.
 * ------------------------------------------------------------------ */

export default async function AdminAnalyticsPage() {
  const [trends, people, geo, content, catchups, support, mail, presence] = await Promise.all([
    loadTrends(90),
    loadPeople(),
    loadGeography(),
    loadContent(),
    loadCatchups(),
    loadSupport(),
    loadMail(),
    loadPresence(),
  ]);

  const t = (key: string) => trends.get(key);

  /* --- The community ------------------------------------------------ */
  const communityStats: Stat[] = [
    {
      label: "Members",
      value: people.total,
      trend: t("db.members.total"),
      hint: `${people.joined30} joined in the last 30 days`,
    },
    {
      label: "Confirmed",
      value: people.verified,
      trend: t("db.members.verified"),
      hint: `${people.total - people.verified} still unconfirmed`,
      tone: people.total - people.verified > people.total * 0.2 ? "warn" : undefined,
    },
    {
      label: "Here this week",
      value: people.active7,
      trend: t("db.members.active_7d"),
      hint:
        people.neverSeen === people.total
          ? "Collecting from today onward"
          : `${people.active30} in the last 30 days`,
    },
    {
      label: "On the map",
      value: people.placed,
      trend: t("db.members.placed"),
      hint: `${people.total - people.placed} have given no city`,
    },
    {
      label: "With a photo",
      value: people.withPhoto,
      hint: `the rest carry their bird`,
    },
    {
      label: "Dark mode",
      value: people.dark,
      trend: t("db.members.dark_mode"),
      hint: `${((people.dark / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`,
    },
    {
      label: "Never signed in",
      value: people.neverSeen,
      hint: "since the column was added",
      tone: people.neverSeen > people.total * 0.5 ? "warn" : undefined,
    },
    {
      label: "Blocked",
      value: people.blocked,
      hint: "removed from the community",
      tone: people.blocked > 0 ? "bad" : undefined,
    },
  ];

  /* --- What gets made ------------------------------------------------ */
  const contentStats: Stat[] = [
    { label: "Letters", value: content.letters, trend: t("db.letters.total"), hint: "published" },
    { label: "Posts", value: content.posts, trend: t("db.posts.total"), hint: "published" },
    { label: "Comments", value: content.comments, trend: t("db.comments.total") },
    { label: "Hearts", value: content.likes, trend: t("db.likes.total") },
    {
      label: "Response per piece",
      value: content.responsePerPost,
      kind: "ratio",
      hint: "comments and hearts per published thing",
      tone: content.responsePerPost < 1 ? "warn" : "good",
    },
    { label: "Saved", value: content.bookmarks, hint: "bookmarked by someone" },
    { label: "Photos", value: content.photos, trend: t("db.photos.total") },
    { label: "Drafts", value: content.drafts, hint: "written, never published" },
  ];

  /* --- Support ------------------------------------------------------- */
  const supportStats: Stat[] = [
    {
      label: "Given",
      value: support.totalPaise,
      kind: "money",
      trend: t("db.contributions.paise"),
      hint: `from ${support.people} ${support.people === 1 ? "person" : "people"}`,
    },
    {
      label: "Completed",
      value: support.paid,
      trend: t("db.contributions.count"),
      hint: `${support.recent} in the last 30 days`,
    },
    {
      label: "Finished paying",
      value: support.completion,
      kind: "percent",
      trend: t("db.contributions.completion_rate"),
      hint: `${support.started - support.paid} opened a payment and stopped`,
      tone: support.completion < 0.5 ? "bad" : "good",
    },
    {
      label: "Members who gave",
      value: support.participation,
      kind: "percent",
      trend: t("db.contributions.rate"),
      hint: `${support.people} of ${people.total}`,
    },
    {
      label: "Typical gift",
      value: support.avgPaise,
      kind: "money",
      hint: "mean of completed payments",
    },
    { label: "Started", value: support.started, hint: "payments opened, live mode only" },
    {
      label: "Failed",
      value: support.failed,
      hint: "declined or errored",
      tone: support.failed > 0 ? "warn" : undefined,
    },
  ];

  /* --- Catch-ups ----------------------------------------------------- */
  const catchupStats: Stat[] = [
    { label: "Answers", value: catchups.entries, trend: t("db.catchups.entries") },
    {
      label: "Per question",
      value: catchups.answersPerPrompt,
      kind: "ratio",
      trend: t("db.catchups.answers_per_prompt"),
      hint: "the number that says they are working",
      tone: catchups.answersPerPrompt < 2 ? "warn" : "good",
    },
    {
      label: "People answering",
      value: catchups.people,
      hint: `${((catchups.people / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`,
    },
    { label: "Rounds", value: catchups.editions, hint: `${catchups.prompts} questions asked` },
  ];

  /* --- Mail ---------------------------------------------------------- */
  const mailStats: Stat[] = [
    { label: "Sent", value: mail.sent, trend: t("db.mail.sent"), hint: "accepted by Resend" },
    {
      label: "Confirmed delivered",
      value: mail.delivered,
      trend: t("db.mail.delivered"),
      hint:
        mail.delivered === 0
          ? "the webhook only started recently"
          : `${(mail.deliveryRate * 100).toFixed(0)}% of sent`,
    },
    {
      label: "Bounced",
      value: mail.bounced,
      trend: t("db.mail.bounced"),
      hint: "the address did not accept it",
      tone: mail.bounced > 0 ? "bad" : undefined,
    },
    {
      label: "Waiting",
      value: mail.queued,
      hint: "held by the daily budget",
      tone: mail.queued > 0 ? "warn" : undefined,
    },
  ];

  const hasHistory = trends.size > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" />

      {/* One line, only while it is true, because a reader who does not know
          the sparklines are still filling will read their absence as a bug. */}
      {!hasHistory && (
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
          Every number below is live and exact. The trend lines appear once the nightly
          snapshot has run twice, which is the first thing on this page that has to wait.
        </p>
      )}

      <Section title="Right now">
        <StatGrid
          stats={[
            {
              label: "Here now",
              value: presence.online.length,
              hint: "active in the last 15 minutes",
              tone: presence.online.length > 0 ? "good" : undefined,
            },
            {
              label: "Typical visit",
              value: presence.avgSessionSec / 60,
              kind: "ratio",
              hint: "minutes, over the last 30 days",
            },
            {
              label: "Pages a visit",
              value: presence.avgViews,
              kind: "ratio",
              hint: `${presence.visits30d} visits by ${presence.people30d} people`,
            },
            {
              label: "Came back",
              value: presence.returning,
              hint: "people here on more than one day",
              tone: presence.returning > 0 ? "good" : undefined,
            },
          ]}
        />
        <div className="grid items-start gap-2 lg:grid-cols-2">
          <Panel
            title="Here now"
            note="Who is on the site, what they are looking at, and on what"
          >
            <PresenceList
              rows={presence.online}
              live
              empty="Nobody on the site in the last 15 minutes."
            />
          </Panel>
          <Panel title="Earlier today" note="The last 24 hours">
            <PresenceList rows={presence.recent} empty="Nobody else today." />
          </Panel>
        </div>
        <div className="grid items-start gap-2 lg:grid-cols-3">
          <Panel title="What they are on" note="Visits by device, last 30 days">
            <BarList items={presence.byDevice} empty="No visits recorded yet." />
          </Panel>
          <Panel title="Operating system">
            <BarList items={presence.byOs} empty="No visits recorded yet." />
          </Panel>
          <Panel title="Where visits end" note="The last page of a visit, which is where people stop">
            <BarList items={presence.byPath} empty="No visits recorded yet." />
          </Panel>
        </div>
      </Section>

      <Section title="The community">
        <StatGrid stats={communityStats} />
        <div className="grid items-start gap-2 lg:grid-cols-3">
          <Panel title="By decade" note="When they left the valley">
            <BarList items={people.byDecade} empty="No batch years recorded." />
          </Panel>
          <Panel title="Where they are" note="Cities with the most members">
            <BarList items={geo.cities} empty="No cities recorded." />
          </Panel>
          <Panel title="Countries">
            <BarList items={geo.countries} empty="No countries recorded." />
          </Panel>
        </div>
      </Section>

      <Section title="What gets written, and whether it gets read">
        <StatGrid stats={contentStats} />
        <div className="grid items-start gap-2 lg:grid-cols-2">
          <Panel title="Who writes" note="Published posts and letters, by author">
            <BarList items={content.topAuthors} empty="Nothing published yet." />
          </Panel>
          <Panel title="Kinds of account" note="How the community is made up">
            <BarList items={people.byType} empty="No account types recorded." />
          </Panel>
        </div>
      </Section>

      <Section title="Support">
        <StatGrid stats={supportStats} />
        <div className="grid items-start gap-2 lg:grid-cols-2">
          <Panel title="How people pay" note="Completed payments, by method">
            <BarList items={support.byMethod} empty="No completed payments yet." />
          </Panel>
          <Panel
            title="The gap"
            note="Everyone who opened a payment, against everyone who finished one"
          >
            <BarList
              items={[
                { label: "Opened a payment", value: support.started },
                { label: "Finished", value: support.paid },
                { label: "Gave up", value: support.started - support.paid },
              ]}
              total={support.started}
            />
          </Panel>
        </div>
      </Section>

      <Section title="Catch-ups">
        <StatGrid stats={catchupStats} />
        <div className="grid items-start gap-2 lg:grid-cols-2">
          <Panel title="Answers by Round" note="Whether interest is holding up">
            <BarList items={catchups.byEdition} empty="No answers yet." />
          </Panel>
          <Panel title="Hearts on answers" note="Whether anyone is reading them">
            <BarList
              items={[
                { label: "Answers written", value: catchups.entries },
                { label: "Hearts given", value: catchups.loves },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section title="Email">
        <StatGrid stats={mailStats} />
        <div className="grid items-start gap-2 lg:grid-cols-2">
          <Panel title="What we send" note="Every message, by template">
            <BarList items={mail.byKind} empty="No mail sent yet." />
          </Panel>
          <Panel
            title="What happened to it"
            note={
              mail.delivered === 0
                ? "Delivery reports only started when the webhook was wired, so this fills from here on"
                : "Accepted by Resend, against what reached a mailbox"
            }
          >
            <BarList
              items={[
                { label: "Accepted by Resend", value: mail.sent },
                { label: "Confirmed delivered", value: mail.delivered },
                { label: "Bounced", value: mail.bounced },
                { label: "Marked as spam", value: mail.complained },
              ]}
              total={mail.sent}
            />
          </Panel>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[17px] leading-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}
