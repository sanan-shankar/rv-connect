import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/20 py-6 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a
            href="https://www.rishivalley.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Rishi Valley School
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="hidden sm:inline">·</span>
          <Link href="/donate" className="hover:text-foreground">
            Donate
          </Link>
          <span className="hidden sm:inline">·</span>
          <a
            href="https://tally.so"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Feature Request
          </a>
          <span className="hidden sm:inline">·</span>
          <a
            href="https://tally.so"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Report a Bug
          </a>
        </div>
      </div>
    </footer>
  );
}
