import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth, sessionWasUnavailable } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadNotificationCount } from "@/lib/notification-count";
import { AppShell } from "@/components/layout/app-shell";
import { advanceDueCatchups } from "@/lib/catchups";
import { touchLastSeen } from "@/lib/last-seen";
import { isStatsExcluded } from "@/lib/stats-exclusion";
import { headers } from "next/headers";
import { drainMailQueue, verificationMailState } from "@/lib/email-queue";
import { maskEmail } from "@/lib/mask-email";
import { sendTimeLabel } from "@/lib/confirmation-copy";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { InstallPromptCapture } from "@/components/pwa/install-prompt";
import { PresenceBeacon } from "@/components/analytics/presence-beacon";
import { IS_DEMO } from "@/lib/demo";
import { DemoBar } from "@/components/demo/demo-bar";
import { GuideLayer } from "@/components/guide/guide-layer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    /* The database did not answer, so nobody knows yet whether this member
       is signed in. Throwing shows the root error screen, whose "Try again"
       re-asks, instead of a sign-in form that looks like being signed out
       (bug audit 3, O-03; src/lib/auth.ts, sessionWasUnavailable). */
    if (sessionWasUnavailable()) {
      throw new Error("SESSION_UNAVAILABLE: the member's row could not be read in time");
    }
    /* With the destination in tow, exactly as src/proxy.ts does (B-022).
       The two gates were asymmetric: the proxy only adds `next` when there is
       NO session cookie, and a cookie that exists but no longer authenticates
       -- the state a password reset or a block deliberately creates on every
       other device -- sails past it and lands here, where a bare
       redirect("/login") threw the link away and dropped the member on /feed
       after they signed in (audit C-117/C-200). */
    const path = await currentTarget();
    redirect(path ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }

  /* Lazy, read-time Catch-up advance (spec 2.4), piggy-backed alongside the
     notification count so it fires on essentially every authenticated page
     view. GLOBAL BLAST RADIUS: this layout renders on every authenticated
     page. advanceDueCatchups swallows every error internally (including a
     missing Catch-up table pre-migration) and never throws.
     
     It IS awaited, though: this comment used to claim that running it
     concurrently with the notification count meant it "can never hold up page
     render", which is not what Promise.all does -- the layout waits for the
     slowest of the three, and that can be this one (audit Low 24). The await
     is deliberate rather than accidental: the advance is what makes the page
     you are about to read correct, and moving it behind the response would
     render an Edition in the state it was in a moment ago. It stays bounded by
     the pool's own query timeout, and a nightly cron does the same sweep
     (/api/catchups/tick) so nothing depends on this having run.
     
     If it ever needs to stop blocking, `after()` is the tool -- and the
     Catch-up surfaces themselves already re-run it, so only the piggyback
     would be lost. */

  /* Is there a Catch-up this member can open? The sidebar hides its Catch-ups
     row when there is not (spec 3.5b, and his words are quoted in sidebar.tsx).

     Counted here rather than in the sidebar because the sidebar is a client
     component, and asked on every authenticated page because membership can
     change under a member at any moment: accepting an invite, or the tenth
     person from their batch signing up, both have to make the row appear
     without them reloading anything the app cannot revalidate.

     `findFirst` with one column, not a `count`: the question is "at least
     one", and Postgres can stop at the first row. Teachers never see the row
     at all, so they are not asked; that also spares the query on every
     teacher's page view.

     What it costs, measured on the live database 2026-09-08 with EXPLAIN
     ANALYZE: 0.117ms execution, 2.1ms planning, on the semi-join through
     `GroupMember (groupId, userId)`. The real cost is the Mumbai round trip,
     not the query, and it rides inside the Promise.all that was already
     waiting on the notification count and the advance -- so the page waits for
     the slowest of four rather than the slowest of three, and this is not it. */
  const isTeacher =
    session.user.accountType === "teacher" || session.user.accountType === "ex_teacher";

  const [unreadCount, mailState, ownCatchup] = await Promise.all([
    unreadNotificationCount(session.user.id),
    // Only asked for when it can change what the banner says. A confirmed
    // account never queries the queue at all.
    //
    // No `sendInline` here, deliberately: this is a render-blocking await on
    // every authenticated page, and letting it reach Resend meant an
    // unconfirmed member's page could hang for the provider's whole ten-second
    // deadline showing nothing (audit M20). The send is scheduled behind the
    // response instead and the banner says "on its way".
    session.user.emailConfirmed
      ? Promise.resolve(null)
      : verificationMailState(session.user.id),
    isTeacher
      ? Promise.resolve(null)
      : prisma.catchup.findFirst({
          where: { group: { members: { some: { userId: session.user.id } } } },
          select: { id: true },
        }),
    advanceDueCatchups(session.user.id),
  ]);

  // The mail queue's tick. Nothing on a schedule drains the queue -- the two
  // Vercel crons run the Catch-ups tick and the demo reset, and the three
  // GitHub workflows back up, prune and snapshot -- so it is drained by
  // whoever happens to load a page, the same lazy pattern
  // `advanceDueCatchups` above uses.
  //
  // Inside `after()`, unlike the catch-up advance, because this one makes
  // network calls to Resend: it must run AFTER the response has been streamed,
  // or every page in the app would wait on somebody else's welcome email. It
  // swallows its own errors and claims rows before sending, so a hundred
  // simultaneous page views cannot mail the same person a hundred times.
  after(async () => {
    try {
      await drainMailQueue();
    } catch (err) {
      console.error("[email] drain failed", err);
    }
  });

  /* Records that this member was here. Behind the response, unlike the
     Catch-up advance above: the advance is what makes the page you are about
     to read correct, and this is bookkeeping nobody on this request will
     read. It swallows its own errors, so there is nothing to catch here.
     Only lastSeenAt: the Visit (which page, how long) is <PresenceBeacon>'s,
     because this layout also renders for link prefetches and never while
     somebody reads. */
  after(() => touchLastSeen(session.user.id, session.user.lastSeenAt));

  return (
    <>
      {/* Attaches events to a member so a funnel can follow one person across
          pages and devices. Opaque id plus two coarse attributes only -- never
          the name, address or email. See the component for the reasoning. */}
      {/* Renders nothing. It is here so its module is evaluated on the first
          authenticated page rather than on the profile page, which is where
          the install tile lives: Chrome fires beforeinstallprompt once per
          hard page load and thirty seconds in, long before anybody has
          navigated to their own profile and pressed Edit. See the component. */}
      <InstallPromptCapture />
      {/* Renders nothing. Reports real navigations and active minutes to the
          visit statistics; see the component. Not on the demo, where every
          visitor is the same persona. */}
      {!IS_DEMO && <PresenceBeacon />}
      <PostHogIdentify
        userId={session.user.id}
        accountType={session.user.accountType ?? null}
        batchYear={session.user.batchYear ?? null}
        isOwner={session.user.role === "admin"}
        excluded={isStatsExcluded(session.user)}
      />
      <AppShell
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          photoUrl: session.user.photoUrl,
          birdOverride: session.user.birdOverride,
          batchType: session.user.batchType,
          batchYear: session.user.batchYear,
          // Without this the account chip's batchLine falls back to the
          // generic "Member" for teachers, who have no batch year to show.
          accountType: session.user.accountType,
        }}
        unreadCount={unreadCount}
        demo={IS_DEMO}
        hasCatchup={!!ownCatchup}
        notice={
          mailState ? (
            <VerifyEmailBanner
              initial={
                mailState.state === "sent"
                  ? { state: "sent", sentTo: maskEmail(session.user.email) }
                  : mailState.state === "imminent"
                    ? { state: "imminent" }
                    : mailState.state === "queued"
                      ? {
                          state: "queued",
                          sendingAt: mailState.sendingAt.toISOString(),
                          // Worded here so the first paint names the right
                          // day, not a placeholder the browser corrects.
                          label: sendTimeLabel(mailState.sendingAt.toISOString()),
                          // Whether waiting leaves everything open (nothing
                          // sent yet) or they are waiting on a resend.
                          open: session.user.emailGateOpen,
                        }
                      : mailState.state === "bounced"
                        ? {
                            state: "bounced",
                            sentTo: maskEmail(session.user.email),
                            mailboxFull: mailState.mailboxFull,
                          }
                        : { state: "none", sentTo: maskEmail(session.user.email) }
              }
            />
          ) : null
        }
      >
        {children}
        {IS_DEMO && <DemoBar userId={session.user.id} />}
      </AppShell>
      {/* Renders nothing until somebody presses a page title or the Feed
          starts the first-run tour. */}
      <GuideLayer
        userId={session.user.id}
        isTeacher={isTeacher}
        isAdmin={session.user.role === "admin"}
      />
    </>
  );
}

/* The page WITH its query string, which is what a sign-in detour has to carry
   back: /directory?batch=2011 is a different destination from /directory.
   Both headers come from src/proxy.ts. */
async function currentTarget(): Promise<string | undefined> {
  const h = await headers();
  const path = h.get("x-pathname");
  if (!path) return undefined;
  return path + (h.get("x-search") ?? "");
}
