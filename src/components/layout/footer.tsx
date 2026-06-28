import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border py-6">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a
            href="https://www.rishivalley.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
          >
            Rishi Valley School
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="dotsep hidden sm:inline">·</span>
          <Link href="/support" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150">
            Support
          </Link>
          <span className="dotsep hidden sm:inline">·</span>
          <a
            href="https://tally.so"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
          >
            Feature Request
          </a>
          <span className="dotsep hidden sm:inline">·</span>
          <a
            href="https://tally.so"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
          >
            Report a Bug
          </a>
        </div>
      </div>
    </footer>
  );
}
