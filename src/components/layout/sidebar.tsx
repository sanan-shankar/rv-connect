"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Newspaper,
  Notebook,
  Users,
  Images,
  Feather,
  MessagesSquare,
  PiggyBank,
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
}

const NAV = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/directory", label: "Directory", icon: Notebook },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/collection", label: "Collection", icon: Images },
  { href: "/letters", label: "Letters", icon: Feather },
  { href: "/catchups", label: "Catch-ups", icon: MessagesSquare },
  // /donate still exists as a redirect to this route (kept for old links);
  // this is the canonical live page with the real content.
  { href: "/support", label: "Support", icon: PiggyBank },
  { href: "/about", label: "About", icon: Info },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

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
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 ${
              active
                ? "font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
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
                  className="absolute inset-0 z-0 rounded-xl bg-sidebar-accent"
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
              strokeWidth={1.9}
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
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.07] p-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60">
          <IdentityRow
            user={{ id: user.id, name: user.name, photoUrl: user.photoUrl }}
            className="w-full gap-2.5"
            textClassName="flex-1"
            name={user.name}
            nameClassName="truncate text-[13px] font-semibold leading-none text-sidebar-foreground"
            meta={user.email}
            metaClassName="truncate text-[11px] font-normal normal-case leading-none tracking-normal text-sidebar-foreground/55"
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
          {/* Combined bug reports + feature requests, formerly a footer link.
              Opens the Tally form as a centered modal via the document-level
              click listener the embed script (loaded below) attaches to every
              [data-tally-open] trigger; the href is a graceful fallback to the
              hosted form if the embed has not loaded yet. */}
          <DropdownMenuItem
            render={
              <a
                href="https://tally.so/r/yPGjBd"
                target="_blank"
                rel="noopener noreferrer"
                data-tally-open="yPGjBd"
                data-tally-layout="modal"
                data-tally-width="540"
                data-tally-overlay="1"
                data-tally-auto-close="3000"
              />
            }
          >
            <MessageSquareText className="mr-2 h-4 w-4" />
            Feedback
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
        className="group grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-white/[0.07] hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
      >
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
      {/* Loads once on idle, then a document-level click listener binds every
          [data-tally-open] trigger (see UserMenu's Feedback item) and
          survives client-side navigation, since it delegates from the
          document. Lives here (rather than per-trigger) so it only loads
          once regardless of which menu instance renders. */}
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />

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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sidebar-foreground/85 transition-colors hover:bg-white/[0.07] hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-95"
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
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-white/[0.07] hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
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
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
              >
                <UserIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                My Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
              >
                <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                Settings
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                  Admin
                </Link>
              )}
              <a
                href="https://tally.so/r/yPGjBd"
                target="_blank"
                rel="noopener noreferrer"
                data-tally-open="yPGjBd"
                data-tally-layout="modal"
                data-tally-width="540"
                data-tally-overlay="1"
                data-tally-auto-close="3000"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
              >
                <MessageSquareText className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                Feedback
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
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
          <div className="flex shrink-0 items-center text-sidebar-foreground">
            <NotificationBell initialUnreadCount={unreadCount} />
          </div>
        )}
      </header>
    </>
  );
}
