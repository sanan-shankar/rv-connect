"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, User, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserAvatar } from "@/components/common/user-avatar";
import { DarkModeToggle } from "./dark-mode-toggle";
import { NotificationBell } from "./notification-bell";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarColor: string | null;
  };
  unreadCount: number;
}

const NAV_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/directory", label: "Directory" },
  { href: "/about", label: "About" },
];

export function Navbar({ user, unreadCount }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/feed"
          className="font-heading text-xl font-bold text-foreground"
        >
          RV Alumni
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <DarkModeToggle />

          {/* Notification bell */}
          <NotificationBell initialUnreadCount={unreadCount} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <UserAvatar
                name={user.name}
                avatarColor={user.avatarColor}
                size="sm"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                <User className="mr-2 h-4 w-4" />
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

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
                <nav className="mt-6 flex flex-col gap-2">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname.startsWith(link.href)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
