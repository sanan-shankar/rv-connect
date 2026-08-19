import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import {
  loadArrivals,
  loadCatchups,
  loadContent,
  loadFaces,
  loadGeography,
  loadMail,
  loadPeople,
  loadPresence,
  loadRetention,
  loadRhythm,
  loadSearches,
  loadTrends,
} from "@/lib/admin-analytics";
import { AnalyticsTabs, isViewKey, VIEWS, type ViewKey } from "@/components/admin/analytics/tabs";
import { BarList, Panel, StatGrid, type Stat } from "@/components/admin/analytics/stat";
import { PresenceList } from "@/components/admin/analytics/presence";
import { Heatmap } from "@/components/admin/analytics/heatmap";
import { BirdAvatar } from "@/components/common/bird-avatar";

export const metadata: Metadata = { title: "Analytics" };

/* Live tables. Caching would show a number wrong by however long the cache
   lived, on a page whose whole job is to be true. */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 *  The analytics room.
 *
 *  SEVEN VIEWS, not one page. The single-page version was getting
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
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
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
            label: "Here now",
            value: p.online.length,
            hint: "active in the last 15 minutes",
            tone: p.online.length > 0 ? "good" : undefined,
          },
          {
            label: "Typical visit",
            value: p.avgSessionSec / 60,
            kind: "ratio",
            hint: "minutes, last 30 days",
          },
          {
            label: "Pages a visit",
            value: p.avgViews,
            kind: "ratio",
            hint: `${p.visits30d} visits by ${p.people30d} people`,
          },
          {
            label: "Came back",
            value: p.returning,
            hint: "people here on more than one day",
            tone: p.returning > 0 ? "good" : undefined,
          },
        ]}
      />
      <Row cols={2}>
        <Panel title="Here now" note="What they are looking at, and on what">
          <PresenceList rows={p.online} live empty="Nobody in the last 15 minutes." />
        </Panel>
        <Panel title="Earlier today" note="The last 24 hours">
          <PresenceList rows={p.recent} empty="Nobody else today." />
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel title="Device" note="Visits, last 30 days">
          <BarList items={p.byDevice} empty="No visits yet." />
        </Panel>
        <Panel title="Operating system">
          <BarList items={p.byOs} empty="No visits yet." />
        </Panel>
        <Panel title="Where visits end" note="The last page, which is where people stop">
          <BarList items={p.byPath} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function PeopleView() {
  const [trends, people, geo, retention] = await Promise.all([
    loadTrends(90),
    loadPeople(),
    loadGeography(),
    loadRetention(),
  ]);
  const t = (k: string) => trends.get(k);

  const stats: Stat[] = [
    {
      label: "Members",
      value: people.total,
      trend: t("db.members.total"),
      hint: `${people.joined30} joined in 30 days`,
    },
    {
      label: "Confirmed",
      value: people.verified,
      trend: t("db.members.verified"),
      hint: `${people.total - people.verified} unconfirmed`,
      tone: people.total - people.verified > people.total * 0.2 ? "warn" : undefined,
    },
    {
      label: "Here this week",
      value: people.active7,
      trend: t("db.members.active_7d"),
      hint: `${people.active30} in 30 days`,
    },
    {
      label: "On the map",
      value: people.placed,
      trend: t("db.members.placed"),
      hint: `${people.total - people.placed} gave no city`,
    },
    { label: "With a photo", value: people.withPhoto, hint: "the rest carry their bird" },
    {
      label: "Dark mode",
      value: people.dark,
      trend: t("db.members.dark_mode"),
      hint: `${((people.dark / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`,
    },
    {
      label: "Never signed in",
      value: people.neverSeen,
      hint: "since presence started",
      tone: people.neverSeen > people.total * 0.5 ? "warn" : undefined,
    },
    {
      label: "Blocked",
      value: people.blocked,
      hint: "removed",
      tone: people.blocked > 0 ? "bad" : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <StatGrid stats={stats} />
      <Row cols={2}>
        <Panel
          title="Did each generation stay"
          note="Members of each decade active in the last 30 days. The reason this room exists."
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
                hint: `${r.recent} of ${r.joined}`,
              }))}
              total={100}
            />
          )}
        </Panel>
        <Panel title="By decade" note="When they left the valley">
          <BarList items={people.byDecade} empty="No batch years recorded." />
        </Panel>
      </Row>
      <Row cols={3}>
        <Panel title="Cities">
          <BarList items={geo.cities} empty="No cities recorded." />
        </Panel>
        <Panel title="Countries">
          <BarList items={geo.countries} empty="No countries recorded." />
        </Panel>
        <Panel title="Kinds of account">
          <BarList items={people.byType} empty="None recorded." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function ContentView() {
  const [trends, content, catchups, people] = await Promise.all([
    loadTrends(90),
    loadContent(),
    loadCatchups(),
    loadPeople(),
  ]);
  const t = (k: string) => trends.get(k);

  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
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
        ]}
      />
      <Row cols={2}>
        <Panel title="Who writes" note="Published posts and letters, by author">
          <BarList items={content.topAuthors} empty="Nothing published yet." />
        </Panel>
        <Panel title="Answers by Round" note="Whether Catch-up interest is holding up">
          <BarList items={catchups.byEdition} empty="No answers yet." />
        </Panel>
      </Row>
      <StatGrid
        stats={[
          { label: "Catch-up answers", value: catchups.entries, trend: t("db.catchups.entries") },
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
          {
            label: "Hearts on answers",
            value: catchups.loves,
            hint: "whether anyone is reading them",
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
        title="The week"
        note="Visits by hour, Indian time, over 90 days"
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
        <Panel title="Where visits end">
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
            label: "Read but never write",
            value: faces.lurkers,
            hint: `of ${people.total} members. Most of any community reads.`,
          },
          {
            label: "Nobody has answered",
            value: faces.isolated.length,
            hint: "no hearts, no replies, nobody has opened their profile",
            tone: faces.isolated.length > 0 ? "warn" : "good",
          },
          {
            label: "Profiles looked at",
            value: faces.mostViewed.reduce((n, m) => n + m.value, 0),
            hint: "since profile views started recording",
          },
          {
            label: "Most looked-up",
            value: faces.mostViewed[0]?.value ?? 0,
            hint: faces.mostViewed[0]?.label ?? "nobody yet",
          },
        ]}
      />

      <Row cols={2}>
        <Panel
          title="Nobody has answered them"
          note="No hearts, no replies, and nobody has opened their profile. Worth saying hello."
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
        <Panel title="Most looked-up profiles" note="Whose page people open">
          <BarList items={faces.mostViewed} empty="No profile views recorded yet." />
        </Panel>
      </Row>

      <Row cols={3}>
        <Panel title="Most curious" note="Who does the profile-looking">
          <BarList items={faces.watchers} empty="No profile views yet." />
        </Panel>
        <Panel title="Most generous" note="Hearts given">
          <BarList items={faces.heartsGiven} empty="No hearts yet." />
        </Panel>
        <Panel title="Most loved" note="Hearts received on their writing">
          <BarList items={faces.heartsGot} empty="No hearts yet." />
        </Panel>
      </Row>

      <Row cols={3}>
        <Panel title="Most loyal" note="Distinct days here, which beats total visits">
          <BarList items={faces.loyal} empty="No visits yet." />
        </Panel>
        <Panel title="Longest single visit" note="Minutes">
          <BarList items={faces.longest} empty="No visits yet." />
        </Panel>
        <Panel title="Deepest visit" note="Most pages in one sitting">
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
          { label: "Searches", value: searches.total, hint: "last 90 days" },
          {
            label: "Found nothing",
            value: searches.empty.reduce((n, e) => n + e.value, 0),
            hint: "somebody looking for what is not here",
            tone: searches.empty.length > 0 ? "warn" : undefined,
          },
          {
            label: "Arrived from elsewhere",
            value: arrivals.referrer.reduce((n, r) => n + r.value, 0),
            hint: "visits with a referring site",
          },
          { label: "Languages seen", value: arrivals.language.length, hint: "browser UI language" },
        ]}
      />
      <Row cols={3}>
        <Panel title="Most searched" note="Every box, last 90 days">
          <BarList items={searches.top} empty="Nothing searched yet." />
        </Panel>
        <Panel title="Found nothing" note="Someone looked and the site had none of it">
          <BarList items={searches.empty} empty="Every search found something." />
        </Panel>
        <Panel title="Which box">
          <BarList items={searches.byScope} empty="Nothing searched yet." />
        </Panel>
      </Row>
      <Row cols={4}>
        <Panel title="Visits begin at" note="First page of a visit">
          <BarList items={arrivals.entry} empty="No visits yet." />
        </Panel>
        <Panel title="Sent here by" note="Referring site, host only">
          <BarList items={arrivals.referrer} empty="Everyone arrived directly." />
        </Panel>
        <Panel title="Language">
          <BarList items={arrivals.language} empty="No visits yet." />
        </Panel>
        <Panel title="Region" note="From the edge">
          <BarList items={arrivals.region} empty="No visits yet." />
        </Panel>
      </Row>
    </div>
  );
}

/* ---------------------------------------------------------------- */

async function HealthView() {
  const [trends, mail] = await Promise.all([loadTrends(90), loadMail()]);
  const t = (k: string) => trends.get(k);
  return (
    <div className="flex flex-col gap-3">
      <StatGrid
        stats={[
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
        ]}
      />
      <Row cols={2}>
        <Panel title="What we send" note="Every message, by template">
          <BarList items={mail.byKind} empty="No mail sent yet." />
        </Panel>
        <Panel
          title="What happened to it"
          note={
            mail.delivered === 0
              ? "Delivery reports started when the webhook was wired, so this fills from here"
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
      </Row>
    </div>
  );
}
