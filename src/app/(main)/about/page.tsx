import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { TakeTourAgainButton } from "@/components/tour/take-tour-again-button";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    // AppShell provides the shared page column; the prose takes a narrower
    // reading measure against its left edge.
    <div>
      <PageHeader
        title="About Rishi Valley"
        subtitle="A space for the Rishi Valley community to stay connected."
      />

      <div className="space-y-10">
        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            What is this?
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">
            Rishi Valley is a small, community-run site for people who went to
            Rishi Valley School. It is the place to find your batchmates again
            and stay close to the people you grew up with, whether you left
            decades ago or last year.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            How to use it
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
            <p className="text-[14.5px] leading-relaxed text-foreground">
              Prefer to be shown around? The hoopoe can walk you through it again.
            </p>
            <TakeTourAgainButton />
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Feed</h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Share stories, campus memories, life updates, or photos. Use
                tags to categorise your posts. You can also target specific
                batches if your post is relevant to a particular group.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Directory</h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Find people by name, batch year, or city. Click on any profile
                card to see their full details.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Profile</h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Fill in your profile so your batchmates can find and recognise
                you. Add your city, workplace, and social links.
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Community Guidelines
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">
            This is a space for genuine connection, not another WhatsApp
            group. Please keep these in mind:
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Share genuinely
              </h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Post real stories, memories, and updates. We&apos;re here to
                reconnect, not to broadcast.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                No forwards or chain messages
              </h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Please don&apos;t share festival greetings, chain messages, or
                forwards. Save those for WhatsApp.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Be respectful
              </h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                This is a community of people who shared a formative experience.
                Treat everyone with the same respect you&apos;d show in person.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                No spam or self-promotion
              </h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                The occasional career update is welcome, but this isn&apos;t the
                place for sales pitches or marketing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Report, don&apos;t retaliate
              </h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                If you see something inappropriate, use the report button. The
                admin team will handle it.
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Rishi Valley School
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">
            Learn more about Rishi Valley, its philosophy, campus life, and
            current happenings.
          </p>
          <a
            href="https://www.rishivalley.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-leaf font-medium hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70 transition-opacity duration-150"
          >
            Visit rishivalley.org
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
