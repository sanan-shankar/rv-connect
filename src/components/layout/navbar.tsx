"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, User, Settings, Shield } from "lucide-react";
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
  { href: "/groups", label: "Groups" },
  { href: "/directory", label: "Directory" },
  { href: "/about", label: "About" },
];

export function Navbar({ user, unreadCount }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-white/30 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/40">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/feed"
          className="font-heading text-xl font-bold tracking-tight text-foreground"
        >
          RV Alumni
        </Link>

        {/* Desktop nav links — centred */}
        <div className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] ${
                pathname.startsWith(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <DarkModeToggle />
          <NotificationBell initialUnreadCount={unreadCount} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 transition-transform duration-150"
            >
              <UserAvatar
                name={user.name}
                avatarColor={user.avatarColor}
                size="sm"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2">
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
              <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
                <nav className="mt-6 flex flex-col gap-2">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                        pathname.startsWith(link.href)
                          ? "bg-primary/10 text-primary"
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
