import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Wordmark } from "@/components/layout/peaks-mark";
import { isMissingCatchupTable } from "@/lib/catchups";
import { AcceptInvite } from "@/components/catchups/join/accept-invite";
import { IDENTITY_SELECT } from "@/lib/people-select";

export const metadata: Metadata = {
  title: "You're invited",
};

/* ------------------------------------------------------------------ *
 *  /catchups/join/<token> - the shared invite link.
 *
 *  This route sits OUTSIDE the (main) group on purpose. Everything under
 *  (main) requires a session in its layout, and the whole point of an invite
 *  link is that the person following it may have no account at all (owner,
 *  2026-08-04: "if they don't have an account, it takes you through the entire
 *  process and then brings you to catch ups"). So it renders its own small
 *  shell, and `src/proxy.ts` lists /catchups/join as public.
 *
 *  Three arrivals, one page:
 *   - signed in, not a member    -> the invitation, with Join / Not now
 *   - signed in, already a member -> straight into the Catch-up, no ceremony
 *   - signed out                  -> the same invitation, but the buttons are
 *                                    Sign in / Create an account, both carrying
 *                                    ?next= back to this exact link so the
 *                                    person lands here again afterwards and
 *                                    finishes the join.
 *
 *  What the page shows a signed-out stranger is deliberately thin: the
 *  Catch-up's name, who keeps it, and how many people are in it. Nothing
 *  anyone wrote. A link that leaks a group's contents to whoever it is
 *  forwarded to would be a worse trade than making people sign in first.
 * ------------------------------------------------------------------ */

/** Same shape the token generator produces (see newInviteToken). */
const TOKEN = /^[a-f0-9]{32}$/;

export default async function JoinCatchupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  let catchup: {
    id: string;
    status: string;
    groupId: string;
    group: { name: string; _count: { members: number } };
    createdBy: { id: string; name: string; photoUrl: string | null; birdOverride: string | null } | null;
  } | null = null;

  if (TOKEN.test(token)) {
    try {
      catchup = await prisma.catchup.findUnique({
        where: { inviteToken: token },
        select: {
          id: true,
          status: true,
          groupId: true,
          group: { select: { name: true, _count: { select: { members: true } } } },
          createdBy: { select: IDENTITY_SELECT },
        },
      });
    } catch (err) {
      // Pre-migration the column does not exist; a dead link is the honest
      // thing to show rather than a stack trace.
      if (!isMissingCatchupTable(err)) throw err;
    }
  }

  if (!catchup || catchup.status === "ended") {
    return (
      <Shell>
        <h1 className="font-heading text-[26px] leading-tight tracking-[-0.02em] text-foreground">
          This link has expired
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          {catchup
            ? "This Catch-up has ended, so there is nothing left to join."
            : "The invite link is not one we recognise. Ask whoever sent it for a fresh one."}
        </p>
        <Link href="/" className="mt-6 inline-flex">
          <Button variant="outline">Go to Rishi Valley</Button>
        </Link>
      </Shell>
    );
  }

  // Already in it: an invitation to somewhere you already are is not a
  // question worth asking, so skip the page entirely.
  if (session?.user?.id) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: catchup.groupId, userId: session.user.id } },
      select: { id: true },
    });
    if (membership) {
      /* This used to disarm the member's own thirty-day bin on the way
         through (audit C-020), because the redirect below means the join
         action never runs for somebody already a member. Build phase 5
         deleted the bin: leaving takes the membership row itself, so anyone
         this branch can see is simply in the Catch-up already. An ARCHIVED
         copy stays archived, as it always did. */
      redirect(`/catchups/${catchup.id}`);
    }
  }

  const here = `/catchups/join/${token}`;
  const keeper = catchup.createdBy;
  const others = catchup.group._count.members;

  return (
    <Shell>
      {keeper && (
        <div className="mb-5 flex items-center gap-3">
          <BirdAvatar user={keeper} size={44} />
          <p className="text-left text-[15px] leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">{keeper.name}</span> invited you to a
            Catch-up
          </p>
        </div>
      )}

      <h1 className="font-heading text-[28px] leading-tight tracking-[-0.02em] text-foreground">
        {catchup.group.name}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        A Catch-up is a letter this group writes together. Someone asks a few questions, everyone
        answers in their own time, and it goes out as one Edition.
        {others > 0 && (
          <>
            {" "}
            <span className="whitespace-nowrap">
              {others} {others === 1 ? "person is" : "people are"} in this one.
            </span>
          </>
        )}
      </p>

      {session?.user?.id ? (
        <AcceptInvite token={token} groupName={catchup.group.name} />
      ) : (
        <div className="mt-6 flex flex-col gap-2.5">
          {/* Both carry ?next= back here, so whichever door they come through
              they land on this invitation again and finish the join. */}
          <Link href={`/signup?next=${encodeURIComponent(here)}`} className="inline-flex">
            <Button variant="primary" size="lg" className="w-full">
              Create an account
            </Button>
          </Link>
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="inline-flex">
            <Button variant="outline" size="lg" className="w-full">
              I already have one
            </Button>
          </Link>
        </div>
      )}
    </Shell>
  );
}

/** The page's own chrome: this route is outside (main), so there is no shell. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-[var(--space-l)] py-[var(--space-xl)]">
      <Link
        href="/"
        className="mb-[var(--space-l)] inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Wordmark />
      </Link>
      <div className="card-elevated w-full max-w-[420px] rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        {children}
      </div>
    </div>
  );
}
