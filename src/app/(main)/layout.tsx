import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { advanceDueCatchups } from "@/lib/catchups";
import { touchLastSeen } from "@/lib/last-seen";
import { headers } from "next/headers";
import { drainMailQueue, verificationMailState } from "@/lib/email-queue";
import { maskEmail } from "@/lib/mask-email";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { TourProvider } from "@/components/tour/tour-provider";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { InstallPromptCapture } from "@/components/pwa/install-prompt";
import { IS_DEMO } from "@/lib/demo";
import { DemoBar } from "@/components/demo/demo-bar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
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
     slowest of the four, and that can be this one (audit Low 24). The await is
     deliberate rather than accidental: the advance is what makes the page you
     are about to read correct, and moving it behind the response would render
     a Round in the state it was in a moment ago. It stays bounded by the
     pool's own query timeout, and a nightly cron does the same sweep
     (/api/catchups/tick) so nothing depends on this having run.
     
     If it ever needs to stop blocking, `after()` is the tool -- and the
     Catch-up surfaces themselves already re-run it, so only the piggyback
     would be lost. */
  const [unreadCount, mailState] = await Promise.all([
    prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    }),
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
    advanceDueCatchups(session.user.id),
    // Records that this member was here, at most once every 15 minutes.
    // Rides in this same Promise.all rather than awaiting separately: it is
    // bookkeeping and must never add a serial round trip to page render.
    touchLastSeen(session.user.id, await currentPath()),
  ]);

  // The mail queue's tick. There is no cron on this project, so the queue is
  // drained by whoever happens to load a page, the same lazy pattern
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

  return (
    // The tour auto-offers itself on the demo and nowhere else. A visitor
    // with no stake in the place will not go hunting for a walkthrough, and
    // the tour is the fastest way to show someone the four surfaces worth
    // seeing. On the real site it stays opt-in, where the owner left it.
    <TourProvider userId={session.user.id} autoOffer={IS_DEMO}>
      {/* Attaches events to a member so a funnel can follow one person across
          pages and devices. Opaque id plus two coarse attributes only -- never
          the name, address or email. See the component for the reasoning. */}
      {/* Renders nothing. It is here so its module is evaluated on the first
          authenticated page rather than on the profile page, which is where
          the install tile lives: Chrome fires beforeinstallprompt once per
          hard page load and thirty seconds in, long before anybody has
          navigated to their own profile and pressed Edit. See the component. */}
      <InstallPromptCapture />
      <PostHogIdentify
        userId={session.user.id}
        accountType={session.user.accountType ?? null}
        batchYear={session.user.batchYear ?? null}
        isOwner={session.user.role === "admin"}
      />
      <AppShell
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          avatarColor: session.user.avatarColor,
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
        notice={
          mailState ? (
            <VerifyEmailBanner
              initial={
                mailState.state === "sent"
                  ? { state: "sent", sentTo: maskEmail(session.user.email) }
                  : mailState.state === "imminent"
                    ? { state: "imminent" }
                    : mailState.state === "queued"
                      ? { state: "queued", sendingAt: mailState.sendingAt.toISOString() }
                      : { state: "none", sentTo: maskEmail(session.user.email) }
              }
            />
          ) : null
        }
      >
        {children}
        {IS_DEMO && <DemoBar userId={session.user.id} />}
      </AppShell>
    </TourProvider>
  );
}

/* The page the member is actually on, from the header src/proxy.ts sets.
   Null rather than a guess when the header is absent, so a missing value is
   visibly missing in the admin room rather than quietly wrong. */
async function currentPath(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-pathname") ?? undefined;
}

/* The same page WITH its query string, which is what a sign-in detour has to
   carry back: /directory?batch=2011 is a different destination from
   /directory. Separate from currentPath because touchLastSeen wants the page,
   not the search. Both headers come from src/proxy.ts. */
async function currentTarget(): Promise<string | undefined> {
  const h = await headers();
  const path = h.get("x-pathname");
  if (!path) return undefined;
  return path + (h.get("x-search") ?? "");
}
