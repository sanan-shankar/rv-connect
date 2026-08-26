import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import {
  loadArrivals,
  loadCatchups,
  loadContent,
  loadFaces,
  loadGeography,
  loadGrowth,
  loadInteractions,
  loadJourney,
  loadMail,
  loadMemberMetrics,
  loadNotifications,
  loadProfiles,
  loadReading,
  loadPeople,
  loadPresence,
  loadRetention,
  loadRhythm,
  loadSearches,
  loadTrends,
} from "@/lib/admin-analytics";
import type { LoginReason } from "@/lib/login-attempt";
import { AnalyticsTabs, isViewKey, VIEWS, type ViewKey } from "@/components/admin/analytics/tabs";
import { BarList, Panel, StatGrid, type Stat } from "@/components/admin/analytics/stat";
import { PresenceList } from "@/components/admin/analytics/presence";
import { Heatmap } from "@/components/admin/analytics/heatmap";
import { CohortMatrix } from "@/components/admin/analytics/cohort";
import {
  CorrelationGrid,
  GROUPINGS,
  GroupTable,
  isGroup,
  isMeasure,
  MEASURES,
  PickerRow,
} from "@/components/admin/analytics/compare";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { MetaDots } from "@/components/common/meta-dots";

export const metadata: Metadata = { title: "Analytics" };

/* Live tables. Caching would show a number wrong by however long the cache
   lived, on a page whose whole job is to be true. */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 *  The analytics room.
 *
 *  VIEWS, NOT ONE PAGE (this used to name a count, and the count was
 *  wrong; tabs.tsx's VIEWS is the list). The single-page version was getting
 *  cluttered (owner, 2026-08-19), and the problem was structural rather
 *  than cosmetic: every new metric made the scroll longer, panels of
 *  different natural heights left ragged gaps, and ~40 queries ran on
 *  every load to render things nobody had scrolled to.
 *
 *  Each view is one question somebody actually arrives with, and only the
 *  active view queries anything -- so this gets FASTER as it grows.
 *
 *  The contribution funnel deliberately does NOT live here: it moved to
 *  /admin/support, where the ledger already is. This room is for looking
 *  around, not for the money's own arithmetic.
 * ------------------------------------------------------------------ */

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; measure?: string; by?: string }>;
}) {
  // The role, re-established on this page and not borrowed from the layout.
  // Soft navigation re-renders only the segments that changed, so a shared
  // layout is not re-evaluated on every move -- and this page reads member
  // data. One line, and the demotion window closes (bug audit B-024).
  await requireAdminPage();
  const { view, measure, by } = await searchParams;
  const active: ViewKey = isViewKey(view) ? view : "live";
  const blurb = VIEWS.find((v) => v.key === active)!.blurb;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Analytics" />
      <AnalyticsTabs active={active} />
      <p className="-mt-1 text-[12.5px] text-muted-foreground">{blurb}</p>

      {active === "live" && <LiveView />}
      {active === "people" && <PeopleView />}
      {active === "content" && <ContentView />}
      {active === "rhythms" && <RhythmsView />}
      {active === "faces" && <FacesView />}
      {active === "reach" && <ReachView />}
      {active === "journey" && <JourneyView />}
      {active === "compare" && <CompareView measure={measure} by={by} />}
      {active === "health" && <HealthView />}
    </div>
  );
}

function Row({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[cols];
  return <div className={`grid items-start gap-2 sm:grid-cols-2 ${c}`}>{children}</div>;
}

/* ---------------------------------------------------------------- */

async function LiveView() {
  const p = await loadPresence();
  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "On the site now",
            value: p.online.length,
            hint: "Members who loaded a page in the last 15 minutes.",
            tone: p.online.length > 0 ? "good" : undefined,
          },
          {
            label: "Average visit length",
            value: p.avgSessionSec / 60,
            kind: "ratio",
            hint: "Minutes from a member's first page to their last, averaged over 30 days.",
          },
          {
            label: "Pages per visit",
            value: p.avgViews,
            kind: "ratio",
            hint: `${p.visits30d} visits by ${p.people30d} people. Counts layout renders, so prefetches inflate it slightly.`,
          },
          {
            label: "Returned another day",
            value: p.returning,
            hint: "Members who came back on a second, separate day. The clearest sign this is a habit and not a one-off.",
            tone: p.returning > 0 ? "good" : undefined,
          },
        ]}
      />
      <Row cols={2}>
        <Panel title="On the site now" note="Each row: who, the page they are on, where they are, and how long they have been here.">
          <PresenceList rows={p.online} live empty="Nobody in the last 15 minutes." />
        </Panel>
        <Panel title="Earlier today" note="Members who were here in the last 24 hours but have since left.">
          <PresenceList rows={p.recent} empty="Nobody else today." />
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel title="Phone, tablet or computer" note="How many visits came from each, over 30 days.">
          <BarList items={p.byDevice} empty="No visits yet." />
        </Panel>
        <Panel title="Operating system" note="iOS, Android, Windows, macOS.">
          <BarList items={p.byOs} empty="No visits yet." />
        </Panel>
        <Panel title="The last page people saw" note="Where each visit ended. A page high on this list is where members give up or run out of things to do.">
          <BarList items={p.byPath} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function PeopleView() {
  const [trends, people, geo, retention, profiles, growth] = await Promise.all([
    loadTrends(90),
    loadPeople(),
    loadGeography(),
    loadRetention(),
    loadProfiles(),
    loadGrowth(),
  ]);
  const t = (k: string) => trends.get(k);

  const stats: Stat[] = [
    {
      label: "Members",
      value: people.total,
      trend: t("db.members.total"),
      hint: `${people.joined30} of them joined in the last 30 days.`,
    },
    {
      label: "Confirmed their email",
      value: people.verified,
      trend: t("db.members.verified"),
      hint: `${people.total - people.verified} have never clicked the link in their confirmation email.`,
      tone: people.total - people.verified > people.total * 0.2 ? "warn" : undefined,
    },
    {
      label: "Visited this week",
      value: people.active7,
      trend: t("db.members.active_7d"),
      hint: `${people.active30} have visited in the last 30 days.`,
    },
    {
      label: "Told us where they live",
      value: people.placed,
      trend: t("db.members.placed"),
      hint: `${people.total - people.placed} have given no city, so they do not appear on the directory map.`,
    },
    {
      label: "Uploaded a photo",
      value: people.withPhoto,
      hint: "Everyone else is shown as their assigned bird.",
    },
    {
      label: "Use dark mode",
      value: people.dark,
      trend: t("db.members.dark_mode"),
      hint: `${((people.dark / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`,
    },
    {
      label: "Not seen since tracking began",
      value: people.neverSeen,
      hint: "Visit tracking started 19 Aug 2026, so this only means they have not been back since then.",
      tone: people.neverSeen > people.total * 0.5 ? "warn" : undefined,
    },
    {
      label: "Blocked",
      value: people.blocked,
      hint: "Accounts an admin has removed from the community.",
      tone: people.blocked > 0 ? "bad" : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <StatGrid stats={stats} />
      <Row cols={2}>
        <Panel
          title="Which generations come back"
          note="Of the members who left in each decade, the share who have visited in the last 30 days. Needs a few weeks of data before it means anything."
        >
          {retention.length === 0 ? (
            <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
              No batch years recorded.
            </p>
          ) : (
            <BarList
              items={retention.map((r) => ({
                label: r.decade,
                value: Math.round(r.rate * 100),
                hint: `${r.recent} of ${r.joined} back this month`,
              }))}
              total={100}
              unit="%"
            />
          )}
        </Panel>
        <Panel title="Members by decade" note="Which decade each member left Rishi Valley in.">
          <BarList items={people.byDecade} empty="No batch years recorded." />
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel title="Cities" note="Where members say they live now.">
          <BarList items={geo.cities} empty="No cities recorded." />
        </Panel>
        <Panel title="Countries" note="Where members say they live now.">
          <BarList items={geo.countries} empty="No countries recorded." />
        </Panel>
        <Panel title="Alumni and teachers" note="How the community is made up.">
          <BarList items={people.byType} empty="None recorded." />
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel
          title="How many members filled in each field"
          note="Emptiest first. Members with blank profiles are harder to find in the directory and get less response."
        >
          <BarList
            items={profiles.fields.map((f) => ({
              ...f,
              hint: `of ${profiles.total}`,
            }))}
            total={profiles.total}
            empty="No members yet."
          />
        </Panel>
        <Panel title="New members each month" note="When people signed up.">
          <BarList items={growth} empty="No members yet." />
        </Panel>
        <Panel title="Identity checks" note="Whether an admin has confirmed each member really is an alumnus.">
          <BarList
            items={[
              { label: "Verified", value: profiles.verified },
              { label: "Pending", value: profiles.pending },
              {
                label: "Neither",
                value: profiles.total - profiles.verified - profiles.pending,
              },
            ]}
            total={profiles.total}
          />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function ContentView() {
  const [trends, content, catchups, people, reading, inter] = await Promise.all([
    loadTrends(90),
    loadContent(),
    loadCatchups(),
    loadPeople(),
    loadReading(),
    loadInteractions(),
  ]);
  const t = (k: string) => trends.get(k);

  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "Letters published",
            value: content.letters,
            trend: t("db.letters.total"),
            hint: "Long-form pieces, not counting drafts.",
          },
          {
            label: "Feed posts",
            value: content.posts,
            trend: t("db.posts.total"),
            hint: "Short posts on the main feed.",
          },
          {
            label: "Comments written",
            value: content.comments,
            trend: t("db.comments.total"),
            hint: "Replies left on posts and letters.",
          },
          {
            label: "Hearts given",
            value: content.likes,
            trend: t("db.likes.total"),
            hint: "Likes on posts and letters.",
          },
          {
            label: "Reactions per post",
            value: content.responsePerPost,
            kind: "ratio",
            hint: "Comments plus hearts, divided by everything published. Below 1 means most things get no response at all.",
            tone: content.responsePerPost < 1 ? "warn" : "good",
          },
          {
            label: "Bookmarked",
            value: content.bookmarks,
            hint: "Times someone saved a post to read later. Only the saver ever sees this.",
          },
          {
            label: "Photos in the Collection",
            value: content.photos,
            trend: t("db.photos.total"),
          },
          {
            label: "Unfinished drafts",
            value: content.drafts,
            hint: "Letters someone started and never published.",
          },
        ]}
      />
      <Row cols={2}>
        <Panel title="Who writes the most" note="Number of published posts and letters, by author.">
          <BarList items={content.topAuthors} empty="Nothing published yet." />
        </Panel>
        <Panel
          title="How each letter did"
          note="Opens is how many times it was viewed; readers is how many different people; hearted is how many liked it. A letter read a lot but hearted by nobody is a different problem from one nobody opened."
        >
          {reading.letters.length === 0 ? (
            <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
              No letters published yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {reading.letters.map((l) => (
                <li key={l.title} className="flex items-baseline gap-2 py-0.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                    {l.title}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                    <MetaDots
                      parts={[
                        `${l.reads} ${l.reads === 1 ? "open" : "opens"}`,
                        `${l.readers} ${l.readers === 1 ? "reader" : "readers"}`,
                        `${l.hearts} hearted`,
                      ]}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel title="Who replies the most" note="Members who leave the most comments. These people keep conversations alive.">
          <BarList items={inter.topCommenters} empty="No comments yet." />
        </Panel>
        <Panel title="Who bookmarks the most" note="Members saving posts to read later.">
          <BarList items={inter.bookmarkers} empty="Nothing bookmarked yet." />
        </Panel>
        <Panel title="Who hearts photos the most" note="Likes given on the Valley Collection.">
          <BarList items={inter.photoLovers} empty="No photo hearts yet." />
        </Panel>
      </Row>
      <StatGrid
        stats={[
          {
            label: "Catch-up answers",
            value: catchups.entries,
            trend: t("db.catchups.entries"),
            hint: "Total answers members have written to catch-up questions.",
          },
          {
            label: "Answers per question",
            value: catchups.answersPerPrompt,
            kind: "ratio",
            trend: t("db.catchups.answers_per_prompt"),
            hint: "How many people answer a typical catch-up question. Under 2 means questions are mostly going unanswered.",
            tone: catchups.answersPerPrompt < 2 ? "warn" : "good",
          },
          {
            label: "Members who have answered",
            value: catchups.people,
            hint: `${((catchups.people / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`,
          },
          {
            label: "Hearts on catch-up answers",
            value: catchups.loves,
            hint: "Whether anyone reads what gets written back.",
          },
          {
            label: "Photo opens",
            value: reading.photoViews,
            hint: "Times a Collection photo was opened full-size.",
          },
          {
            label: "Catch-up round opens",
            value: reading.roundViews,
            hint: "Times someone opened a finished round to read it.",
          },
          { label: "Poll votes cast", value: inter.pollVotes, hint: "Votes on polls attached to posts." },
          {
            label: "Messages sent to you",
            value: inter.adminMsgs,
            hint: `Across ${inter.threads} ${inter.threads === 1 ? "conversation" : "conversations"} in the Reach out inbox.`,
          },
        ]}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function RhythmsView() {
  const [rhythm, presence] = await Promise.all([loadRhythm(), loadPresence()]);
  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="When members are on the site"
        note="Every hour of the week over the last 90 days, in Indian time. Darker means busier."
        cap={false}
        className="lg:max-w-4xl"
      >
        <Heatmap grid={rhythm.grid} peak={rhythm.peak} />
      </Panel>
      <Row cols={3}>
        <Panel title="Device" note="Visits, last 30 days">
          <BarList items={presence.byDevice} empty="No visits yet." />
        </Panel>
        <Panel title="Operating system">
          <BarList items={presence.byOs} empty="No visits yet." />
        </Panel>
        <Panel title="The last page people saw" note="Where each visit ended.">
          <BarList items={presence.byPath} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function FacesView() {
  const [faces, people] = await Promise.all([loadFaces(), loadPeople()]);

  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "Only ever read",
            value: faces.lurkers,
            hint: `Of ${people.total} members, these have visited but never written a post or a comment. Normal: most people in any community read rather than write.`,
          },
          {
            label: "Got no response from anyone",
            value: faces.isolated.length,
            hint: "Nobody has hearted their posts, replied to them, or opened their profile. These are the members most likely to quietly drift away.",
            tone: faces.isolated.length > 0 ? "warn" : "good",
          },
          {
            label: "Profile opens",
            value: faces.mostViewed.reduce((n, m) => n + m.value, 0),
            hint: "Times a member opened somebody else's profile. Started recording 19 Aug 2026.",
          },
          {
            label: "Most-opened profile",
            value: faces.mostViewed[0]?.value ?? 0,
            hint: faces.mostViewed[0]
              ? `${faces.mostViewed[0].label}. Nobody's own visits to their own profile are counted.`
              : "No profile has been opened by anyone else yet.",
          },
        ]}
      />

      <Row cols={2}>
        <Panel
          title="Members nobody has responded to"
          note="No hearts on their posts, no replies, and nobody has opened their profile. Worth saying hello to."
        >
          {faces.isolated.length === 0 ? (
            <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
              Everyone has had some response. Rare and good.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/70">
              {faces.isolated.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 py-2">
                  <BirdAvatar user={{ id: m.id, name: m.name }} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {m.name}
                  </span>
                  {m.batchYear && (
                    <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                      {m.batchYear}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Whose profiles get opened" note="How many times each member's profile has been opened by someone else.">
          <BarList items={faces.mostViewed} empty="No profile views recorded yet." />
        </Panel>
      </Row>

      <Row cols={3}>
        <Panel title="Who looks people up" note="How many profiles each member has opened.">
          <BarList items={faces.watchers} empty="No profile views yet." />
        </Panel>
        <Panel title="Who gives the most hearts" note="Likes each member has given to other people's posts.">
          <BarList items={faces.heartsGiven} empty="No hearts yet." />
        </Panel>
        <Panel title="Whose writing gets the most hearts" note="Likes received on their own posts and letters.">
          <BarList items={faces.heartsGot} empty="No hearts yet." />
        </Panel>
      </Row>

      <Row cols={3}>
        <Panel title="Who visits on the most days" note="Number of separate days each member has been on the site. Turning up often beats one long session.">
          <BarList items={faces.loyal} empty="No visits yet." />
        </Panel>
        <Panel title="Longest single visit" note="The longest one sitting each member has had, in minutes.">
          <BarList items={faces.longest} empty="No visits yet." />
        </Panel>
        <Panel title="Most pages in one sitting" note="The busiest single visit each member has had.">
          <BarList items={faces.deepest} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function ReachView() {
  const [searches, arrivals] = await Promise.all([loadSearches(), loadArrivals()]);
  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "Searches made",
            value: searches.total,
            hint: "Across the feed search box, the people picker and the city picker, over 90 days.",
          },
          {
            label: "Searches that found nothing",
            value: searches.empty.reduce((n, e) => n + e.value, 0),
            hint: "Someone typed this and got zero results. Each one is a person looking for something the site could not give them.",
            tone: searches.empty.length > 0 ? "warn" : undefined,
          },
          {
            label: "Arrived from another site",
            value: arrivals.referrer.reduce((n, r) => n + r.value, 0),
            hint: "Visits that came from a link somewhere else rather than typing the address or using a bookmark.",
          },
          {
            label: "Browser languages",
            value: arrivals.language.length,
            hint: "How many different languages members' browsers are set to. Tells you whether anyone needs this site in another language.",
          },
        ]}
      />
      <Row cols={3}>
        <Panel title="What people search for" note="The exact words typed, most frequent first.">
          <BarList items={searches.top} empty="Nothing searched yet." />
        </Panel>
        <Panel title="Searches that returned nothing" note="Worth reading. Each is a gap between what someone expected and what exists.">
          <BarList items={searches.empty} empty="Every search found something." />
        </Panel>
        <Panel title="Which search box" note="Feed search, people picker, or city picker.">
          <BarList items={searches.byScope} empty="Nothing searched yet." />
        </Panel>
      </Row>
      <Row cols={4}>
        <Panel title="The first page of a visit" note="Where members land when they arrive.">
          <BarList items={arrivals.entry} empty="No visits yet." />
        </Panel>
        <Panel title="Which site sent them" note="The domain they clicked a link on. Only the domain is stored, never the full address.">
          <BarList items={arrivals.referrer} empty="Everyone arrived directly." />
        </Panel>
        <Panel title="Browser language" note="What each member's browser is set to.">
          <BarList items={arrivals.language} empty="No visits yet." />
        </Panel>
        <Panel title="State or province" note="Worked out from the network connection, not from anything the member typed.">
          <BarList items={arrivals.region} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function HealthView() {
  const [trends, mail, notif] = await Promise.all([
    loadTrends(90),
    loadMail(),
    loadNotifications(),
  ]);
  const t = (k: string) => trends.get(k);
  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "Emails sent",
            value: mail.sent,
            trend: t("db.mail.sent"),
            hint: "Handed to Resend, our email provider. This does not mean they arrived.",
          },
          {
            label: "Confirmed delivered",
            value: mail.delivered,
            trend: t("db.mail.delivered"),
            hint:
              mail.delivered === 0
                ? "Delivery reporting was only switched on 19 Aug 2026, so older emails cannot be counted."
                : `${(mail.deliveryRate * 100).toFixed(0)}% of everything sent actually reached a mailbox.`,
          },
          {
            label: "Bounced",
            value: mail.bounced,
            trend: t("db.mail.bounced"),
            hint: "The receiving mail server rejected it. Usually a dead or mistyped address.",
            tone: mail.bounced > 0 ? "bad" : undefined,
          },
          {
            label: "Queued to send",
            value: mail.queued,
            hint: "Written but not sent yet, held back by the 100-a-day limit on our email plan.",
            tone: mail.queued > 0 ? "warn" : undefined,
          },
        ]}
      />
      <StatGrid
        stats={[
          {
            label: "In-app notifications",
            value: notif.total,
            hint: "The bell icon alerts, not emails.",
          },
          {
            label: "Notifications opened",
            value: notif.rate,
            kind: "percent",
            hint: `${notif.read} of ${notif.total} were actually read. A low share means the bell is being ignored.`,
            tone: notif.rate < 0.3 ? "warn" : "good",
          },
          {
            label: "Types of notification",
            value: notif.byType.length,
            hint: "How many different reasons the app has to alert someone.",
          },
          {
            label: "Never opened",
            value: notif.total - notif.read,
            hint: "Notifications still sitting unread.",
            tone: notif.total - notif.read > notif.read ? "warn" : undefined,
          },
        ]}
      />
      <Row cols={2}>
        <Panel title="Kinds of email we send" note="Confirmation links, password resets, and so on.">
          <BarList items={mail.byKind} empty="No mail sent yet." />
        </Panel>
        <Panel
          title="What happened to those emails"
          note={
            mail.delivered === 0
              ? "Delivery reporting started 19 Aug 2026, so this only covers emails sent since then."
              : "Handed to our provider, against what actually reached a mailbox."
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
      </Row>
      <Row cols={2}>
        <Panel title="What notifications are about" note="Which events cause the bell to light up.">
          <BarList items={notif.byType} empty="No notifications yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function CompareView({ measure, by }: { measure?: string; by?: string }) {
  const m = isMeasure(measure) ? measure : "completeness";
  const g = isGroup(by) ? by : "decade";
  const rows = await loadMemberMetrics();

  const mSpec = MEASURES.find((x) => x.key === m)!;
  const gSpec = GROUPINGS.find((x) => x.key === g)!;

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Measure" note="What to count for each member" cap={false}>
        <PickerRow options={MEASURES} active={m} param="measure" other={g} />
      </Panel>
      <Panel title="Group by" note="How to split the members up" cap={false}>
        <PickerRow options={GROUPINGS} active={g} param="by" other={m} />
      </Panel>

      <Panel
        title={`${mSpec.label}, by ${gSpec.label.toLowerCase()}`}
        note={`${mSpec.note}. "Any at all" is the share of the group who have done it even once, which an average on its own hides.`}
        cap={false}
      >
        <GroupTable rows={rows} measure={m} by={g} />
      </Panel>

      <Panel
        title="What moves together"
        note="Whether two things tend to rise and fall with each other across all members."
        cap={false}
      >
        <CorrelationGrid rows={rows} />
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function JourneyView() {
  const j = await loadJourney();
  const totalFails = j.failures.reduce((n, f) => n + f.value, 0);

  /* Every reason `LoginReason` can write, in the owner's words rather than the
   * slug. Missing keys fall through to the raw slug below, which is how a bar
   * reading "blocked" sat on this page from the day audit H4 added the reason
   * (2026-08-20) until somebody read it as a member being locked out
   * (2026-08-25). A label map that silently half-covers its vocabulary is
   * worse than none: the gap looks like data. Keyed on LoginReason rather
   * than string, so the gap cannot reopen -- adding a reason without a label
   * here is now a tsc error, not a slug that ships. */
  const REASON: Record<LoginReason, string> = {
    ok: "Signed in fine",
    "no-account": "No account with that address",
    "no-password-set": "Account exists but has no password",
    "wrong-password": "Wrong password",
    blocked: "Account is blocked",
    "rate-limited": "Too many tries, turned away",
    "bot-check": "Failed the are-you-human check",
  };

  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
          {
            label: "Sign-in attempts recorded",
            value: totalFails,
            hint: "Recording started 19 Aug 2026, so this only covers attempts since then.",
          },
          {
            label: "Failed this week",
            value: j.failsThisWeek,
            hint: "Attempts in the last seven days that did not get in.",
            tone: j.failsThisWeek > 0 ? "warn" : "good",
          },
          {
            label: "Still locked out",
            value: j.lockedOut.length,
            hint: "Addresses that have tried and never once succeeded. These people cannot use the site at all.",
            tone: j.lockedOut.length > 0 ? "bad" : "good",
          },
          {
            label: "Generations tracked",
            value: j.rows.length,
            hint: "Groups in the table below.",
          },
        ]}
      />

      <Panel
        title="How far each generation gets"
        note="Everyone who signed up, and the share of them still with us at each step."
        cap={false}
      >
        <CohortMatrix rows={j.rows} />
      </Panel>

      <Row cols={2}>
        <Panel
          title="Why sign-ins fail"
          note="A wrong address needs different help from a wrong password, so they are counted separately."
        >
          <BarList
            items={j.failures.map((f) => ({ label: REASON[f.label as LoginReason] ?? f.label, value: f.value }))}
            empty="No sign-in attempts recorded yet."
          />
        </Panel>
        <Panel
          title="People who still cannot get in"
          note="Every attempt from these addresses has failed. Worth emailing them directly."
        >
          {j.lockedOut.length === 0 ? (
            <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
              Nobody is locked out. Everyone who has tried has got in at least once.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/70">
              {j.lockedOut.map((l) => (
                <li key={l.email} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                    {l.email}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                    {l.tries} {l.tries === 1 ? "try" : "tries"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Row>
    </div>
  );
}
