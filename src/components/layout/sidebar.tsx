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
  HeartHandshake,
  Info,
  Settings,
  Shield,
  LogOut,
  User as UserIcon,
  MessageSquareText,
  Menu,
  X,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnimatePresence, motion } from "motion/react";
import { NAV_MARKER_SPRING, SPRINGS } from "@/components/common/motion";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";
import { LogoFact } from "./logo-fact";
import { Wordmark } from "./peaks-mark";
import { SidebarHoopoe } from "@/components/mascot/sidebar-hoopoe";
import { LogoEasterEgg } from "@/components/mascot/moments/logo-easter-egg-hoopoe";

export interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string | null;
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
  { href: "/support", label: "Support", icon: HeartHandshake },
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
function accountNav(userId: string, isAdmin: boolean) {
  return [
    { href: `/profile/${userId}`, label: "My profile", icon: UserIcon },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    { href: "/messages", label: "Message the admins", icon: MessageSquareText },
  ];
}

/**
 * The mobile drawer's account rows (profile, settings, admin, messages, sign
 * out). They are the same control as a NavLinks row minus the route marker, so
 * they wear the same ink and the same hover rung, and the five of them share
 * one string rather than five copies that can drift.
 *
 * They used to be `text-sidebar-foreground/80` over `hover:bg-sidebar-accent/55`
 * -- an alpha pair that landed ~2 L* short of the nav rows sitting directly
 * above them in the same drawer, in both themes, for no reason anyone recorded.
 * Opaque idle ink is also the rail's standing rule (see the --sidebar-foreground-idle
 * note in globals.css): an alpha of white over a saturated surface is what put
 * the shipped label at 4.31:1.
 */
const DRAWER_ROW_CLASS =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring";

function Brand({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/feed"
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-xl py-1 transition-[opacity,transform] duration-150 hover:opacity-80 active:scale-[0.98] ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring`}
    >
      <Wordmark
        variant="two-plane"
        className="min-w-0"
        markClassName="shrink-0 text-sidebar-foreground"
        textClassName="min-w-0 truncate text-sidebar-foreground"
      />
    </Link>
  );
}

/**
 * One sidebar row. Shared by the main nav and the account rows so the two can
 * never drift, and so both can carry the same route marker.
 *
 * `entry` staggers the row in when it is revealed rather than always present
 * (the account rows). The icon leads and the label follows a beat later, which
 * is the "the icons come there and then the text comes there" the owner asked
 * for. Both legs are transform + opacity only.
 */
function NavRow({
  href,
  label,
  icon: Icon,
  active,
  markerId,
  onNavigate,
  entry,
}: {
  href: string;
  label: string;
  icon: typeof Newspaper;
  active: boolean;
  markerId: string;
  onNavigate?: () => void;
  entry?: number;
}) {
  const staggered = entry !== undefined;
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
          <motion.span
            layoutId={`${markerId}-pill`}
            initial={false}
            className="absolute inset-0 z-0 rounded-xl bg-sidebar-active"
            transition={NAV_MARKER_SPRING}
          />
          <motion.span
            layoutId={`${markerId}-bar`}
            initial={false}
            className="absolute left-[-8px] top-1.5 bottom-1.5 z-[1] w-[3px] rounded-sm bg-cinnamon"
            transition={NAV_MARKER_SPRING}
          />
        </>
      )}
      <motion.span
        className="relative z-[2] flex shrink-0"
        initial={staggered ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRINGS.snappy, delay: entry ?? 0 }}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      </motion.span>
      <motion.span
        className="relative z-[2] truncate"
        initial={staggered ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRINGS.snappy, delay: (entry ?? 0) + 0.05 }}
      >
        {label}
      </motion.span>
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  markerId,
}: {
  pathname: string;
  onNavigate?: () => void;
  // Each rendered nav list owns its own marker group, so the desktop rail and
  // the open mobile drawer never try to share (and fight over) one indicator.
  markerId: string;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => (
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
}: {
  user: SidebarUser;
  pathname: string;
  markerId: string;
  onNavigate?: () => void;
}) {
  const rows = accountNav(user.id, user.role === "admin");
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
    else if (NAV.some((n) => isActive(pathname, n.href))) setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="account-rows"
            className="flex flex-col gap-0.5"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {rows.map((r, i) => (
              <NavRow
                key={r.href}
                href={r.href}
                label={r.label}
                icon={r.icon}
                active={isActive(pathname, r.href)}
                markerId={markerId}
                onNavigate={onNavigate}
                /* Bottom row first: the set unfurls upward out of the pill it
                   came from, rather than raining down onto it. */
                entry={0.03 * (rows.length - 1 - i)}
              />
            ))}
            <motion.button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRINGS.snappy, delay: 0.03 * rows.length }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-sidebar-foreground-idle transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              Sign out
            </motion.button>
          </motion.div>
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
    /* The pill that ties the bird, the name, the batch line and the gear into
       one unit. Back to the original white-alpha fill (owner, 2026-08-03: "just
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
            metaClassName="truncate text-[11px] font-normal normal-case leading-none tracking-normal text-sidebar-foreground-muted transition-colors duration-150 group-hover/account:text-sidebar-foreground-idle"
          />
        {/* The caret is the only thing that says "this opens". It rotates
            rather than swapping glyph, so the control never changes size. */}
        <ChevronUp
          className="ml-1 h-4 w-4 shrink-0 text-sidebar-foreground-muted transition-transform duration-200 ease-out group-hover/account:text-sidebar-foreground-idle"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <Link
        href="/settings"
        aria-label="Settings"
        className="group grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        {/* The gear turning is the icon's own affordance inside a control that
            does not itself move, which is the one shape of hover motion the
            house rule leaves open. The colour change beside it is what carries
            the hover. */}
        <Settings className="h-[18px] w-[18px] transition-transform duration-300 ease-out group-hover:[transform:rotate(45deg)]" strokeWidth={1.9} />
      </Link>
    </div>
  );
}

export function Sidebar({
  user,
  unreadCount,
}: {
  user: SidebarUser;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: flush, full-height sidebar */}
      <aside className="sticky top-0 z-10 hidden h-screen w-[248px] shrink-0 flex-col gap-3 bg-sidebar px-4 pb-4 pt-5 md:flex">
        {/* The lockup's own width is content-hugging (see peaks-mark.tsx), so
            centering it takes an outer flex row rather than touching the
            mark/wordmark pairing itself, which stays exactly as tuned. */}
        <div className="flex justify-center">
          <LogoEasterEgg>
            <LogoFact />
          </LogoEasterEgg>
        </div>
        <NavLinks pathname={pathname} markerId="nav-desktop" />
        {/* relative anchor for the idle-rest hoopoe, which perches just above
            this row (see sidebar-hoopoe.tsx) */}
        <div className="relative mt-auto">
          <SidebarHoopoe />
          <AccountSection user={user} pathname={pathname} markerId="nav-desktop" />
        </div>
      </aside>

      {/* Mobile: slim top bar with a hamburger that opens a slide-over drawer
          (a left Sheet, scrim + slide at z-50, so it covers everything). */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-1.5 bg-sidebar px-3 md:hidden">
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
            className="flex w-[82%] max-w-xs flex-col gap-0 overflow-y-auto border-sidebar-border bg-sidebar p-4"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mb-4 flex items-center justify-between">
              <Brand onNavigate={() => setOpen(false)} />
              <SheetClose
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </SheetClose>
            </div>
            <NavLinks
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              markerId="nav-mobile"
            />
            {/* mt-auto, not mt-3: the account rows sit at the BOTTOM of the
                drawer (owner, 2026-08-03: "on mobile, let the bottom menu be
                anchored to the bottom"), matching where they live on the
                desktop rail, instead of floating directly under the nav with
                the rest of the drawer empty below them. */}
            <div className="mt-auto border-t border-sidebar-border pt-3">
              <Link
                href={`/profile/${user.id}`}
                onClick={() => setOpen(false)}
                className={DRAWER_ROW_CLASS}
              >
                <UserIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                My Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={DRAWER_ROW_CLASS}
              >
                <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                Settings
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={DRAWER_ROW_CLASS}
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                  Admin
                </Link>
              )}
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className={DRAWER_ROW_CLASS}
              >
                <MessageSquareText className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                Message the admins
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={DRAWER_ROW_CLASS}
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                Sign out
              </button>
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
