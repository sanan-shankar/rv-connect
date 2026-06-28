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
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
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
import { BirdAvatar } from "@/components/common/bird-avatar";
import { NotificationBell } from "./notification-bell";
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

// Primary destinations that live on the mobile bottom tab bar; everything else
// folds into the More sheet.
const MOBILE_TABS = NAV.slice(0, 4);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
  return (
    <Link href="/feed" className="flex items-center gap-2.5 px-2 py-1">
      <PeaksMark size={15} className="text-sidebar-primary" />
      <span className="leading-tight">
        <span className="block font-heading text-[17px] font-bold tracking-tight text-sidebar-foreground">
          Rishi Valley
        </span>
        <span className="block text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/55">
          Alumni
        </span>
      </span>
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 ${
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
            }`}
          >
            <n.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({
  user,
  unreadCount,
}: {
  user: SidebarUser;
  unreadCount: number;
}) {
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
      <div className="text-sidebar-foreground">
        <NotificationBell initialUnreadCount={unreadCount} />
      </div>
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
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-3 bg-sidebar px-4 pb-4 pt-5 md:flex">
        <Brand />
        <NavLinks pathname={pathname} />
        <UserMenu user={user} unreadCount={unreadCount} />
      </aside>

      {/* Mobile: slim brand top bar + a bottom tab bar with a More sheet */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-sidebar px-4 md:hidden">
        <Brand />
        <div className="flex items-center text-sidebar-foreground">
          <NotificationBell initialUnreadCount={unreadCount} />
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden">
        {MOBILE_TABS.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring/60 active:opacity-70 ${
                active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-full ${
                  active ? "bg-sidebar-accent text-white" : ""
                }`}
              >
                <n.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              {n.label}
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium text-sidebar-foreground/70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring/60 active:opacity-70">
            <span className="grid h-8 w-12 place-items-center rounded-full">
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            More
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl bg-sidebar p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <SheetTitle className="sr-only">More</SheetTitle>
            <div className="mb-3">
              <Brand />
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
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
      </nav>
    </>
  );
}
