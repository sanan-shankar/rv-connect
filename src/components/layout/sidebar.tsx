"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "motion/react";
import { NAV_MARKER_SPRING } from "@/components/common/motion";
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
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-[0.98]";

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
      className={`flex items-center gap-2.5 rounded-xl py-1 transition-[opacity,transform] duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-[0.98] ${className}`}
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
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 ${
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
                    outside it as a clean ~3px left edge. */}
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
            <n.icon
              className="relative z-[2] h-[18px] w-[18px] shrink-0"
              strokeWidth={2}
            />
            <span className="relative z-[2]">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ user }: { user: SidebarUser }) {
  const router = useRouter();
  // "Batch of 2023", the same phrase as every other byline but with the year
  // spelled out (owner, 2026-08-02: "on the bottom left subtitle say 2023
  // instead of '23"). It replaced the credential chip "ISC 2023" earlier the
  // same day. The elided form stays everywhere else, where the line sits in a
  // dot-separated meta row rather than on its own.
  const meta = batchLine(user, { fullYear: true });
  return (
    /* The chip that ties the bird, the name, the batch line and the gear into
       ONE unit (owner, 2026-08-02: without it "it look like separated elements
       and no real order to it ... it's not clear that the profile button and
       settings are all one unit").
       It is a BORDER plus a whisper of fill, not fill alone, and that is the
       whole trick. The rail has almost no lightness to spend: only 5.49 L*
       (light) / 6.68 (dark) separates `--sidebar` from `--sidebar-hover`, and a
       resting container and a hover both want some of it. Fill alone forces a
       bad trade, which is how this shipped at `bg-sidebar-hover/30`: +1.59 L*,
       under the ~2 just-noticeable floor, i.e. a container nobody could see. A
       hairline is a SECOND CHANNEL that costs the fill budget nothing, so the
       chip reads as one object (border at 1.40:1 against the light rail, +8.4
       L* against the dark one) while the two controls inside it keep the full
       +3.90/+4.68 hover the state layer lands at everywhere else.
       A box must earn its border; a container grouping three controls does. */
    <div className="flex items-center gap-1.5 rounded-2xl border border-sidebar-border bg-sidebar-hover/30 p-1.5">
      <DropdownMenu>
        {/* data-popup-open keeps the trigger lit for as long as its menu is
            open, the same contract dropdown-menu.tsx gives a submenu trigger. */}
        <DropdownMenuTrigger className="group/account flex min-w-0 flex-1 items-center rounded-xl px-1.5 py-1 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-sidebar-hover data-popup-open:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-[0.98]">
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
            <UserIcon className="mr-2 h-4 w-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          {user.role === "admin" && (
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          )}
          {/* Bug reports, ideas, and anything else, in our own hands now: this
              replaced the third-party Tally form (2026-07-24). It opens the
              conversation surface, where a member's moderation notes and the
              follow-up on anything they reported live alongside whatever they
              write. See src/app/(main)/messages. */}
          <DropdownMenuItem onClick={() => router.push("/messages")}>
            <MessageSquareText className="mr-2 h-4 w-4" />
            Message the admins
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href="/settings"
        aria-label="Settings"
        className="group grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-95"
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
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Mobile: slim top bar with a hamburger that opens a slide-over drawer
          (a left Sheet, scrim + slide at z-50, so it covers everything). */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-1.5 bg-sidebar px-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-95"
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
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </SheetClose>
            </div>
            <NavLinks
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              markerId="nav-mobile"
            />
            <div className="mt-3 border-t border-sidebar-border pt-3">
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
