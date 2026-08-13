import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { advanceDueCatchups } from "@/lib/catchups";
import { drainMailQueue, verificationMailState } from "@/lib/email-queue";
import { maskEmail } from "@/lib/mask-email";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { TourProvider } from "@/components/tour/tour-provider";
import { IS_DEMO } from "@/lib/demo";
import { DemoBar } from "@/components/demo/demo-bar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Lazy, read-time Catch-up advance (spec 2.4), piggy-backed alongside the
  // notification count so it fires on essentially every authenticated page
  // view with no cron. GLOBAL BLAST RADIUS: this layout renders on every
  // authenticated page. advanceDueCatchups already swallows every error
  // internally (including a missing Catch-up table pre-migration) and never
  // throws, but it also runs concurrently with (not blocking) the count
  // query, so a slow or stale advance can never hold up page render.
  const [unreadCount, mailState] = await Promise.all([
    prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    }),
    // Only asked for when it can change what the banner says. A confirmed
    // account never queries the queue at all.
    session.user.emailConfirmed
      ? Promise.resolve(null)
      : verificationMailState(session.user.id),
    advanceDueCatchups(session.user.id),
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
