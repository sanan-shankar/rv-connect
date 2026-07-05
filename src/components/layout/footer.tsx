import Link from "next/link";
import Script from "next/script";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border py-6">
      {/* Tally popup embed: loads once on idle, then a document-level click
          listener binds every [data-tally-open] trigger (and survives
          client-side navigation, since it delegates from the document). */}
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
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
          <span className="dotsep" aria-hidden="true">·</span>
          <Link href="/support" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150">
            Support
          </Link>
          <span className="dotsep" aria-hidden="true">·</span>
          {/* Combined bug reports + feature requests. Opens the Tally form as a
              centered modal; the href is a graceful fallback to the hosted form
              if the embed script has not loaded yet (the embed calls
              preventDefault on the click once it has). */}
          <a
            href="https://tally.so/r/yPGjBd"
            target="_blank"
            rel="noopener noreferrer"
            data-tally-open="yPGjBd"
            data-tally-layout="modal"
            data-tally-width="540"
            data-tally-overlay="1"
            data-tally-auto-close="3000"
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
          >
            Feedback
          </a>
        </div>
      </div>
    </footer>
  );
}
