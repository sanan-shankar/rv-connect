import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          About RV Alumni
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          A space for Rishi Valley alumni to reconnect, share stories, and find
          each other.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">
            What is this?
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">
            RV Alumni is a simple, community-run platform for alumni of Rishi
            Valley School. Whether you graduated decades ago or just a few
            years back, this is your space to reconnect with batchmates, share
            memories of campus life, and stay in touch with the people who
            shaped your journey.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">
            How to use it
          </h2>
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
                Find alumni by name, batch year, or city. Click on any profile
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
          <h2 className="font-heading text-xl font-bold text-foreground">
            Community Guidelines
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">
            This is a space for genuine connection — not another WhatsApp
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
          <h2 className="font-heading text-xl font-bold text-foreground">
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
            className="mt-3 inline-flex items-center gap-1.5 text-leaf font-medium hover:text-leaf-light"
          >
            Visit rishivalley.org
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
