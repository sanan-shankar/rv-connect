"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Newspaper,
  Users,
  FolderOpen,
  Images,
  Feather,
  MessagesSquare,
  CalendarDays,
  Info,
  Settings,
  Shield,
  LogOut,
  User as UserIcon,
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
import { SPRINGS } from "@/components/common/motion";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { NotificationBell } from "./notification-bell";
import { LogoFact } from "./logo-fact";
import { PeaksMark } from "./peaks-mark";

export interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string | null;
}

const NAV = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/groups", label: "Groups", icon: FolderOpen },
  { href: "/collection", label: "Collection", icon: Images },
  { href: "/letters", label: "Letters", icon: Feather },
  { href: "/catchups", label: "Catch-ups", icon: MessagesSquare },
  { href: "/events", label: "Events", icon: CalendarDays },
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
      className={`flex items-center gap-2.5 px-2 py-1 ${className}`}
    >
      <PeaksMark
        size={28}
        variant="two-plane"
        className="shrink-0 -translate-y-px text-sidebar-foreground"
      />
      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className="block truncate font-heading text-[17px] font-bold leading-none tracking-tight text-sidebar-foreground">
          Rishi Valley
        </span>
        <span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.2em] text-sidebar-foreground/55">
          Alumni
        </span>
      </span>
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
                    instead of popping, on one shared spring. The pill stays
                    inset to the row; the bar pulls out to the sidebar's flush
                    left edge (-16px == the px-4 rail padding) so it reads as a
                    distinct edge marker, not a hairline crammed inside the pill. */}
                <motion.span
                  layoutId={`${markerId}-pill`}
                  className="absolute inset-0 z-0 rounded-xl bg-sidebar-accent"
                  transition={SPRINGS.snappy}
                />
                <motion.span
                  layoutId={`${markerId}-bar`}
                  className="absolute left-[-16px] top-1.5 bottom-1.5 z-[1] w-1 rounded-full bg-cinnamon"
                  transition={SPRINGS.snappy}
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
    <div className="mt-auto flex items-center gap-1.5 rounded-2xl bg-white/[0.07] p-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60">
          <BirdAvatar user={{ id: user.id, name: user.name }} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
              {user.name}
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">
              {user.email}
            </span>
          </span>
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
      {/* Desktop: flush, full-height sidebar */}
      <aside className="sticky top-0 z-10 hidden h-screen w-[248px] shrink-0 flex-col gap-3 bg-sidebar px-4 pb-4 pt-5 md:flex">
        <LogoFact />
        <NavLinks pathname={pathname} markerId="nav-desktop" />
        <UserMenu user={user} />
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
        <div className="flex shrink-0 items-center text-sidebar-foreground">
          <NotificationBell initialUnreadCount={unreadCount} />
        </div>
      </header>
    </>
  );
}
