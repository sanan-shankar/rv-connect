"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Newspaper,
  Notebook,
  Images,
  Feather,
  MessagesSquare,
  Info,
  Shield,
  LogOut,
  User as UserIcon,
  MessageSquareText,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { Tree as PhosphorTree } from "@phosphor-icons/react";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnimatePresence, m } from "motion/react";
import { NAV_MARKER_SPRING, SPRINGS } from "@/components/common/motion";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine } from "@/lib/utils";
import {
  ADMIN_NAV,
  isAdminRoute,
  isAdminSectionActive,
  type AdminCountKey,
} from "@/components/admin/admin-nav";
import { useAdminCounts } from "@/components/admin/admin-counts";
import { NotificationBell } from "./notification-bell";
import { Wordmark } from "./peaks-mark";
import { SidebarHoopoe } from "@/components/mascot/sidebar-hoopoe";
import { LogoEasterEgg } from "@/components/mascot/moments/logo-easter-egg-hoopoe";

export interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  birdOverride?: string | null;
  batchType?: string | null;
  batchYear?: number | null;
  /* Read only by `batchLine()` in the account chip, which needs it to say
     "Teacher" / "Former teacher" for the members who have no batch year.
     Optional so a preview harness can hand over a partial user; when it is
     missing a teacher falls back to the generic "Member". */
  accountType?: string | null;
}


const NAV = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/directory", label: "Directory", icon: Notebook },
  { href: "/collection", label: "Collection", icon: Images },
  { href: "/letters", label: "Letters", icon: Feather },
  { href: "/catchups", label: "Catch-ups", icon: MessagesSquare },
  // /donate still exists as a redirect to this route (kept for old links);
  // this is the canonical live page with the real content.
  { href: "/support", label: "Support", icon: PhosphorTree },
  { href: "/about", label: "About", icon: Info },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/* ------------------------------------------------------------------ *
 *  THE ACCOUNT ROWS.
 *
 *  These used to live in a white dropdown hanging off the account pill,
 *  which was the one piece of chrome in the sidebar that looked like it
 *  came from somewhere else (owner, 2026-08-03: "instead of this white
 *  pop-up ... it expands into the same kind of menu that we have with
 *  feed directory and all, except it's anchored to the bottom").
 *
 *  So they are now nav rows, drawn by the same NavRow as Feed and
 *  Directory, in the same marker group. That last part is the whole
 *  point: because the active marker is a `layoutId` pair, putting these
 *  rows in the group means the marker GLIDES down out of the nav and
 *  onto whichever account row you picked, and glides back up when you
 *  return to a main surface. It is one indicator for one sidebar rather
 *  than a nav marker plus a separate idea of "the menu is open".
 * ------------------------------------------------------------------ */
function accountNav(userId: string, showAdmin: boolean) {
  return [
    { href: `/profile/${userId}`, label: "My profile", icon: UserIcon },
    { href: "/messages", label: "Reach out", icon: MessageSquareText },
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
}

/* `nowrap` is the rail's lockup: it sits in a `justify-center` row of fixed
   248px, so the wordmark should hug its content and never truncate. The
   drawer and the collapsed rail pass it the other way -- they share their row
   with something else, so there `min-w-0 truncate` is what keeps the wordmark
   from pushing its neighbour out. */
function Brand({
  onNavigate,
  className = "",
  nowrap = false,
}: {
  onNavigate?: () => void;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <Link
      href="/feed"
      onClick={onNavigate}
      aria-label="Rishi Valley, home"
      className={`flex items-center gap-2.5 rounded-xl py-1 transition-[opacity,transform] duration-150 hover:opacity-80 active:scale-[0.98] ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring`}
    >
      <Wordmark
        /* Flat cream, not the three shaded planes: at 24px the middle and
           Rishi planes read as smudges rather than ridges, so the mark is
           painted in the lightest of the three (#EAF1DF) and reads as one
           clean silhouette against the dark green rail. */
        variant="solid"
        className={nowrap ? undefined : "min-w-0"}
        markClassName="shrink-0 text-[#EAF1DF]"
        textClassName={
          nowrap
            ? "block whitespace-nowrap text-sidebar-foreground"
            : "min-w-0 truncate text-sidebar-foreground"
        }
      />
    </Link>
  );
}

/* The account rows animate through VARIANTS rather than per-child delays.
   That is what buys the collapse: a delay only fires on enter, so the old
   version unfurled beautifully and then vanished (owner, 2026-08-03: "the
   expanding is perfect but there's no compression animation, it just
   disappears"). Variants are a named state the whole subtree can be driven
   INTO, so the same ladder runs backwards on the way out.

   Opening runs bottom row first (staggerDirection -1), so the set unfurls
   upward out of the pill it came from. Closing runs top row first, so it
   folds back down into it. Inside a row the icon leads and the label follows,
   which is the "the icons come there and then the text comes there" the owner
   asked for; on the way out they leave together, because a label outliving
   its own icon reads as a glitch rather than a flourish. */
const ACCOUNT_LIST = {
  open: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
  closed: { transition: { staggerChildren: 0.03, staggerDirection: 1 } },
};
const ACCOUNT_ROW = {
  open: { transition: { staggerChildren: 0.05 } },
  /* Faster than the open (140ms against a spring): a menu should get out of
     the way quicker than it arrives. */
  closed: { transition: { staggerChildren: 0 } },
};
const ACCOUNT_INK = {
  open: { opacity: 1, y: 0, transition: SPRINGS.snappy },
  closed: { opacity: 0, y: 8, transition: { duration: 0.14, ease: "easeIn" as const } },
};

/* The route marker fades with the section it is inside (owner, 2026-08-03:
   "when you open it, it nicely animates but the marker just suddenly appears
   ... when you expand or compress, it suddenly appears and disappears").
   It could not do otherwise before: `initial={false}` exists so the marker is
   painted in place for the current route instead of flying in on every page
   load, and that same flag also suppressed any entrance when the account rows
   mounted. Driving it from the section's open/closed state instead gives it an
   entrance HERE without giving it one on a cold page load, because a main-nav
   row still passes initial={false}.
   Opacity only. The layoutId glide between rows is untouched, so moving from
   Settings to My profile still slides rather than cross-fades. */
const ACCOUNT_MARKER = {
  open: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" as const } },
  closed: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" as const } },
};

/**
 * One sidebar row. Shared by the main nav and the account rows so the two can
 * never drift, and so both can carry the same route marker.
 *
 * `staggered` opts the row into the variant ladder above. The main nav is
 * always present, so it renders its icon and label as plain spans.
 */
function NavRow({
  href,
  label,
  icon: Icon,
  active,
  markerId,
  onNavigate,
  staggered,
  count,
}: {
  href: string;
  label: string;
  icon: typeof Newspaper | typeof PhosphorTree;
  active: boolean;
  markerId: string;
  onNavigate?: () => void;
  staggered?: boolean;
  /** Admin rows only. Rendered when > 0; a standing `0` is noise, not news. */
  count?: number;
}) {
  const Row = staggered ? m.div : "div";
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring ${
        active
          ? "font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground"
      }`}
    >
      {active && (
        <>
          {/* The soft pill and the cinnamon edge are two layoutId children.
              They glide together to whichever row matches the route,
              instead of popping, on one shared spring (NAV_MARKER_SPRING,
              a touch underdamped so they settle with weight). initial=false
              means they appear placed on first paint for the current route
              rather than playing an enter animation; they only glide on
              navigation. The pill stays inset to the row; the bar sits just
              outside it as a clean ~3px left edge.
              Because the account rows pass the SAME markerId, this pair also
              glides all the way down out of the nav and onto them. */}
          <m.span
            layoutId={`${markerId}-pill`}
            className="absolute inset-0 z-0 rounded-xl bg-sidebar-active"
            {...(staggered
              ? { variants: ACCOUNT_MARKER, layout: true }
              : { initial: false as const })}
            transition={NAV_MARKER_SPRING}
          />
          <m.span
            layoutId={`${markerId}-bar`}
            className="absolute left-[-8px] top-1.5 bottom-1.5 z-[1] w-[3px] rounded-sm bg-cinnamon"
            {...(staggered
              ? { variants: ACCOUNT_MARKER, layout: true }
              : { initial: false as const })}
            transition={NAV_MARKER_SPRING}
          />
        </>
      )}
      <Row
        className="relative z-[2] flex min-w-0 flex-1 items-center gap-3"
        {...(staggered ? { variants: ACCOUNT_ROW } : {})}
      >
        <m.span
          className="flex shrink-0"
          {...(staggered ? { variants: ACCOUNT_INK } : {})}
        >
          {Icon === PhosphorTree ? (
            <PhosphorTree className="h-[18px] w-[18px] shrink-0" weight="bold" />
          ) : (
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          )}
        </m.span>
        <m.span
          className="truncate"
          {...(staggered ? { variants: ACCOUNT_INK } : {})}
        >
          {label}
        </m.span>
        {count !== undefined && count > 0 && (
          /* Tabular so a queue ticking 9 -> 10 does not shove the label, and
             right-aligned so the nine rows share one column of figures you
             can read straight down. Idle rows carry it in the rail's own
             muted ink; the active row inherits the lit foreground. */
          <span
            className={`ml-auto shrink-0 text-[12px] font-semibold tabular-nums ${
              active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground-idle"
            }`}
          >
            {count}
          </span>
        )}
      </Row>
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  markerId,
  hideCatchups = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  // Each rendered nav list owns its own marker group, so the desktop rail and
  // the open mobile drawer never try to share (and fight over) one indicator.
  markerId: string;
  /** Catch-ups is an alumni feature (owner, 2026-08-18: "remove catch ups
   *  for teachers"); teacher accounts never see the row. The /catchups
   *  routes themselves redirect too, so this is presentation, not the gate. */
  hideCatchups?: boolean;
}) {
  const nav = hideCatchups ? NAV.filter((n) => n.href !== "/catchups") : NAV;
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((n) => (
        <NavRow
          key={n.href}
          href={n.href}
          label={n.label}
          icon={n.icon}
          active={isActive(pathname, n.href)}
          markerId={markerId}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 *  THE ADMIN NAV.
 *
 *  Under /admin the rail swaps its whole list for this one. The owner asked
 *  for "some non just scrolling form of navigation" and flagged a second rail
 *  beside the first as "a bit janky", which it is: two vertical navs on one
 *  screen, and 180px of a 1192px content column spent on the smaller of them.
 *
 *  Swapping instead costs nothing and buys the choreography for free. These
 *  rows are the SAME NavRow in the SAME marker group as Feed and Directory,
 *  so the cinnamon edge and its pill glide out of the account section's Admin
 *  row and up into this list on the way in, and back down on the way out. The
 *  rail says where you are with the one indicator it has always had.
 *
 *  The cost, stated plainly: while you are in here, Directory is two clicks
 *  away rather than one. That is the standard drill-in trade, and the back
 *  row is the first thing in the list precisely because of it.
 * ------------------------------------------------------------------ */
function AdminNavLinks({
  pathname,
  onNavigate,
  markerId,
}: {
  pathname: string;
  onNavigate?: () => void;
  markerId: string;
}) {
  const counts = useAdminCounts();

  return (
    <div className="flex flex-col gap-3">
      {/* Not a NavRow: this is a way OUT, not a place, and giving it the row
          treatment would put a tenth destination in a list of nine. Lighter
          ink, no icon box, and it can never hold the marker. */}
      <Link
        href="/feed"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-medium text-sidebar-foreground-idle transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
        Rishi Valley
      </Link>

      {ADMIN_NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {/* 11px, and the one place in the rebuild where small uppercase ink
              is still right: this IS a label over a group, which is what the
              type scale documents the register for. The panel's old headings
              were the same treatment doing a heading's job. */}
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground-idle/70">
            {group.label}
          </p>
          {group.sections.map((s) => (
            <NavRow
              key={s.href}
              href={s.href}
              label={s.label}
              icon={s.icon}
              active={isAdminSectionActive(pathname, s.href)}
              markerId={markerId}
              onNavigate={onNavigate}
              count={s.countKey ? countFor(counts, s.countKey) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function countFor(
  counts: ReturnType<typeof useAdminCounts>,
  key: AdminCountKey
): number | undefined {
  if (!counts) return undefined;
  return counts[key];
}

/**
 * The account section: the rows, then the pill that opens them.
 *
 * Anchored to the BOTTOM of the rail, and it grows UPWARD into the empty
 * middle of the sidebar, so the nav above it never moves when it opens. That
 * is also why nothing here animates height: the rows simply appear into space
 * that was already free, each one staggered in on transform and opacity, which
 * keeps the whole thing inside the house rule.
 *
 * It opens itself whenever you are ON one of these routes and closes when you
 * leave for a main surface, so the open state and the marker's position are
 * always the same fact (owner: "only when you go back to feed directory
 * collection, one of the main ones, does it then all shuffle back").
 */
function AccountSection({
  user,
  pathname,
  markerId,
  onNavigate,
  demo = false,
}: {
  user: SidebarUser;
  pathname: string;
  markerId: string;
  onNavigate?: () => void;
  demo?: boolean;
}) {
  /* The Admin row is dropped WHILE you are in admin, for two reasons. It is a
     duplicate (the nav above is already the admin sections), and it is a bug:
     `isActive` prefix-matches, so on /admin/people this row and the People row
     would both be `active` and both would claim the one marker layoutId, which
     tears the cinnamon edge between two places on the same paint. */
  const rows = accountNav(user.id, user.role === "admin" && !isAdminRoute(pathname));
  const onAccountRoute = rows.some((r) => isActive(pathname, r.href));
  const [open, setOpen] = useState(onAccountRoute);

  /* Follow the route. Adjusted during render rather than in an effect (React's
     sanctioned adjust-state-on-prop-change pattern) so the panel is already in
     the right state on the first paint after a navigation, with no frame of
     the wrong one. Opening is forced; closing only happens when you land on a
     main surface, so opening the menu and then not picking anything leaves it
     open, which is what a menu should do. */
  const [prevRoute, setPrevRoute] = useState(pathname);
  if (pathname !== prevRoute) {
    setPrevRoute(pathname);
    if (onAccountRoute) setOpen(true);
    /* /admin closes it too, and needs saying separately because it falls
       through BOTH tests otherwise. Admin is not in NAV (it is an account
       row), and the Admin row drops itself while you are inside admin -- see
       `rows` above -- so `onAccountRoute` is false as well. Neither branch
       fired, the panel stayed open, and its rows overlapped the admin section
       list that replaces the rail under /admin (owner, 2026-08-19: "it's
       kind of cutting into the admin menu"). */
    else if (isAdminRoute(pathname) || NAV.some((n) => isActive(pathname, n.href)))
      setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="account-rows"
            className="flex flex-col gap-0.5"
            variants={ACCOUNT_LIST}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {rows.map((r) => (
              <NavRow
                key={r.href}
                href={r.href}
                label={r.label}
                icon={r.icon}
                active={isActive(pathname, r.href)}
                markerId={markerId}
                onNavigate={onNavigate}
                staggered
              />
            ))}
            {/* No sign out on the demo. There is no session to end: identity
                is a constant there (src/lib/auth.ts), and the demo closes
                /api/auth, so the button could only ever fail. A control that
                visibly does nothing reads as a broken app, which is the one
                impression this deployment exists to avoid. */}
            {!demo && (
            <m.button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              variants={ACCOUNT_INK}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-sidebar-foreground-idle transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              Sign out
            </m.button>
            )}
          </m.div>
        )}
      </AnimatePresence>
      <UserMenu user={user} open={open} onToggle={() => setOpen((v) => !v)} />
    </div>
  );
}

function UserMenu({
  user,
  open,
  onToggle,
}: {
  user: SidebarUser;
  open: boolean;
  onToggle: () => void;
}) {
  // "Batch of 2023", the same phrase as every other byline but with the year
  // spelled out (owner, 2026-08-02: "on the bottom left subtitle say 2023
  // instead of '23"). It replaced the credential chip "ISC 2023" earlier the
  // same day. The elided form stays everywhere else, where the line sits in a
  // dot-separated meta row rather than on its own.
  const meta = batchLine(user, { fullYear: true });
  return (
    /* The pill that ties the bird, the name, the batch line and the shortcut
       to your own sheet into one unit. Back to the original white-alpha fill (owner, 2026-08-03: "just
       go back to the pill thing it was before you removed it"). */
    <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.07] p-1.5">
      {/* The pill is now the toggle for the rows above it, not the trigger for
          a floating menu. aria-expanded keeps it lit while they are open, the
          same job the old data-popup-open did. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group/account flex min-w-0 flex-1 items-center rounded-xl px-1.5 py-1 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-sidebar-hover aria-expanded:bg-sidebar-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
          <IdentityRow
            user={{ id: user.id, name: user.name, photoUrl: user.photoUrl, birdOverride: user.birdOverride }}
            className="w-full gap-2.5"
            textClassName="flex-1"
            name={user.name}
            nameClassName="truncate text-[13px] font-semibold leading-none text-sidebar-foreground"
            meta={meta}
            /* The batch line lifting muted -> idle is the trigger's SECOND
               hover channel. The name is already full-strength ink and cannot
               lift, so without this the whole hover rests on a background
               change spending a third of the rail's budget. The gear beside it
               has had two channels all along (ink lift plus the turn). */
            // Owner, 2026-08-22, in two passes: "capitalise the batch of
            // 2023 thing" and then "make it look more like how it looks
            // under their names in the posts" -- post-card.tsx's byline
            // leaves size/weight/case/tracking to IdentityRow's own
            // META_CLASS (10.5px, semibold, uppercase, 0.07em) rather than
            // setting its own, so this does too now: only what the sidebar
            // actually needs overridden is here, the two hover-lift colours
            // this dark pill's default text-muted-foreground cannot read
            // against.
            metaClassName="truncate text-sidebar-foreground-muted transition-colors duration-150 group-hover/account:text-sidebar-foreground-idle"
          />
        {/* No caret (owner, 2026-08-03: "remove the arrow, it's fine if
            there's no direction to expand it, they'll figure it out"). The
            pill's own lit state via aria-expanded is what says it is open. */}
      </button>
      {/* Straight to your own sheet, not to a settings page. There is no
          settings page any more: your profile IS it, and this is the shortcut
          that saves opening the menu to reach it (owner, 2026-08-07: "replace
          the settings icon near the bottom left profile pill with the my
          profile icon so they can directly access it").
          The gear used to turn 45 degrees on hover, which was the icon's own
          affordance inside a control that does not move. A person does not
          turn, so the hover here is the colour change alone. */}
      <Link
        href={`/profile/${user.id}`}
        aria-label="My profile"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        <UserIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </Link>
    </div>
  );
}

export function Sidebar({
  user,
  unreadCount,
  demo = false,
}: {
  user: SidebarUser;
  unreadCount: number;
  /** True on the demo deployment; see the note in app-shell.tsx for why this
   *  arrives as a prop instead of being read from `IS_DEMO` here. */
  demo?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inAdmin = user.role === "admin" && isAdminRoute(pathname);

  return (
    <>
      {/* Desktop: flush, full-height sidebar.

          TWO elements on purpose. The <aside> is an inert in-flow spacer that
          does nothing but reserve 248px in the shell's flex row; the panel
          inside it is `fixed`.

          It used to be one `sticky top-0` element, which is the obvious way to
          write this and is quietly fragile: `position: sticky` resolves against
          the nearest SCROLLING ancestor, so the moment anything sets
          `overflow: hidden` on <body> the sidebar stops sticking and snaps back
          to its static position, jumping up the page by exactly the current
          scroll offset. Third-party overlays lock body scroll that way as a
          matter of course, and Razorpay's checkout does (2026-08-05: opening
          the payment modal visibly threw the sidebar up the page). Measured:
          `body{overflow:hidden}` moved it -318px, `html{overflow:hidden}` and
          `body{position:fixed}` did not.

          `fixed` resolves against the viewport instead and cannot be broken
          this way by anyone. Its own catch is that a `transform`, `filter` or
          `will-change` on ANY ancestor would re-root it; there is none today
          (app-shell and both layouts are clean), so do not add one above this
          without re-checking. */}
      <aside className="hidden w-[248px] shrink-0 md:block">
        <div className="fixed left-0 top-0 z-10 flex h-screen w-[248px] flex-col gap-3 bg-sidebar px-4 pb-4 pt-5">
          {/* The lockup's own width is content-hugging (see peaks-mark.tsx), so
              centering it takes an outer flex row rather than touching the
              mark/wordmark pairing itself, which stays exactly as tuned. */}
          <div className="flex justify-center">
            <LogoEasterEgg>
              <Brand nowrap />
            </LogoEasterEgg>
          </div>
          {/* min-h-0 + overflow-y-auto: the app's seven rows always fit, but
              the admin swap puts nine rows, three group labels and a back row
              in the same space, which does not fit a short window. The nav
              gives up the room rather than the account block, the same rule
              the mobile drawer already follows. */}
          <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3">
            {inAdmin ? (
              <AdminNavLinks pathname={pathname} markerId="nav-desktop" />
            ) : (
              <NavLinks
                pathname={pathname}
                markerId="nav-desktop"
                hideCatchups={
                  user.accountType === "teacher" || user.accountType === "ex_teacher"
                }
              />
            )}
          </div>
          {/* relative anchor for the idle-rest hoopoe, which perches just above
              this section (see sidebar-hoopoe.tsx) */}
          <div className="relative">
            <SidebarHoopoe />
            <AccountSection user={user} pathname={pathname} markerId="nav-desktop" demo={demo} />
          </div>
        </div>
      </aside>

      {/* Mobile: slim top bar with a hamburger that opens a slide-over drawer
          (a left Sheet, scrim + slide at z-50, so it covers everything). */}
      {/* `data-app-bar` is a measurement hook, not styling. Anything that
          scrolls a member to a precise place has to know how much of the
          viewport is already spoken for, and on a phone that is this bar: the
          Collection landed a pressed year 24px below the VIEWPORT top, which
          is 32px underneath these 56 pixels, so the year you asked for was
          hidden behind the bar you asked from -- "2017 wasn't at the top of
          the page it was just above the top so not visible" (owner,
          2026-09-02). Measured off the live element rather than hardcoded, so
          the two can never drift. */}
      <header
        data-app-bar
        className="sticky top-0 z-40 flex h-14 items-center gap-1.5 bg-sidebar px-3 md:hidden"
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            /* overflow-hidden here, with the NAV as the one scrolling region
               below. The sheet used to scroll as a whole, which meant the
               account block and the nav competed for the same height: open the
               account rows on a short viewport and the drawer overflowed, the
               mt-auto lost its slack, and the pill visibly dropped (owner,
               2026-08-04: "when I expand it, the profile pill moves down a
               couple pixels"). Measured at 390x640 it moved 22px. Now the pill
               is pinned to the bottom and the nav gives up the room instead, so
               expanding can never move it at any height. */
            className="flex w-[82%] max-w-xs flex-col gap-0 overflow-hidden border-sidebar-border bg-sidebar p-4"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <Brand onNavigate={() => setOpen(false)} />
              <SheetClose
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </SheetClose>
            </div>
            {/* min-h-0 is what makes flex-1 able to SHRINK here: without it a
                flex child's floor is its content height, so the nav would
                refuse to give room back and the overflow would reappear
                somewhere else.

                -mx-3/px-3 is not decoration. `overflow-y-auto` forces overflow-x
                to `auto` as well, so this box clips horizontally too, and the
                active row's cinnamon edge is drawn at left-[-8px], OUTSIDE the
                nav. Adding the scroller swallowed it (owner, 2026-08-04: "on
                mobile there's no cinnamon marker for the top menu"). Widening
                the box by 12px each side and padding the content back by the
                same puts the marker inside the clip with 4px to spare, while
                every row stays exactly where it was. */}
            <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3">
              {inAdmin ? (
                <AdminNavLinks
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  markerId="nav-mobile"
                />
              ) : (
                <NavLinks
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  markerId="nav-mobile"
                  hideCatchups={
                    user.accountType === "teacher" || user.accountType === "ex_teacher"
                  }
                />
              )}
            </div>
            {/* The SAME AccountSection the desktop rail uses, not a flat list of
                the same destinations (owner, 2026-08-04: "we need to incorporate
                that into the mobile version ... let it shuffle up and do all of
                that stuff"). So the pill, the staggered unfurl, the fold back
                down, and the marker gliding out of the nav and onto the picked
                row are one implementation rather than two that drift.

                shrink-0 against the scrolling nav above anchors it to the
                BOTTOM of the drawer (owner, 2026-08-03) and, unlike the mt-auto
                it replaced, keeps it there even when the rows open on a short
                phone. No border-t: the pill is a contained object and does not
                need a rule to separate it from the nav (owner, 2026-08-04, on
                the hairline that used to sit above these rows: "we don't need
                that"). */}
            <div className="shrink-0 pt-3">
              <AccountSection
                user={user}
                pathname={pathname}
                markerId="nav-mobile"
                onNavigate={() => setOpen(false)}
                demo={demo}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Brand className="min-w-0 flex-1" />
        {/* /feed renders its own PageHeader bell at every width (the
            preferred entry point), so skip this one there to avoid a
            duplicate. Every other route has no header bell of its own, so
            this stays the sole mobile notifications entry point for them. */}
        {!isActive(pathname, "/feed") && (
          // Idle ink, not full-strength: the bell and the hamburger are the two
          // icon controls flanking the wordmark and they should rest at the same
          // weight. The bell lifts to --sidebar-foreground on hover (see
          // notification-bell.tsx), exactly as the hamburger does.
          <div className="flex shrink-0 items-center text-sidebar-foreground-idle">
            <NotificationBell initialUnreadCount={unreadCount} />
          </div>
        )}
      </header>
    </>
  );
}
