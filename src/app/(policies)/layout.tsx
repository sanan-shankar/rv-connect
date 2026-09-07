import Link from "next/link";
import { Wordmark } from "@/components/layout/peaks-mark";

/**
 * The shell for the three policy documents (audit H12): /privacy, /terms,
 * /guidelines. Public: no auth() call, so a stranger reading the privacy
 * policy before signing up costs one render and sees no chrome that assumes
 * an account. Not prerendered, despite fetching nothing -- the root layout's
 * theme-cookie read makes every route in the app dynamic. One slim bar with the wordmark home, a reading column,
 * and a footer that cross-links the three documents so none is a dead end.
 */
export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="state-layer rounded-full px-2 py-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <Wordmark variant="light" textClassName="text-foreground" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16 pt-10 sm:pt-12">{children}</main>

      <footer className="border-t border-border">
        <nav
          aria-label="Policies"
          className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-6 text-[13px] text-muted-foreground"
        >
          <Link href="/privacy" className="state-layer rounded-full px-2 py-1 hover:text-foreground">
            Privacy policy
          </Link>
          <Link href="/terms" className="state-layer rounded-full px-2 py-1 hover:text-foreground">
            Terms of use
          </Link>
          <Link href="/guidelines" className="state-layer rounded-full px-2 py-1 hover:text-foreground">
            Community guidelines
          </Link>
          <span className="ms-auto">Rishi Valley</span>
        </nav>
      </footer>
    </div>
  );
}
