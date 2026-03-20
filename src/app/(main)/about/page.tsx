import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          About RV Alumni
        </h1>
        <p className="mt-2 text-muted-foreground">
          A space for Rishi Valley alumni to reconnect, share stories, and find
          each other.
        </p>
      </div>

      <Card>
        <CardContent className="prose prose-sm pt-6 dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">
              What is this?
            </h2>
            <p className="text-sm leading-relaxed text-foreground">
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
            <ul className="space-y-2 text-sm text-foreground">
              <li>
                <strong>Feed:</strong> Share stories, campus memories, life
                updates, or photos. Use tags to categorize your posts. You can
                also target specific batches if your post is relevant to a
                particular group.
              </li>
              <li>
                <strong>Directory:</strong> Find alumni by name, batch year,
                type, or city. Click on any profile card to see their full
                details.
              </li>
              <li>
                <strong>Profile:</strong> Fill in your profile so your
                batchmates can find and recognize you. Add your city, workplace,
                and social links.
              </li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Community Guidelines
            </h2>
            <p className="text-sm leading-relaxed text-foreground">
              This is a space for genuine connection — not another WhatsApp
              group. Please keep these in mind:
            </p>
            <ul className="space-y-2 text-sm text-foreground">
              <li>
                <strong>Share genuinely.</strong> Post real stories, memories,
                and updates. We&apos;re here to reconnect, not to broadcast.
              </li>
              <li>
                <strong>No forwards or chain messages.</strong> Please don&apos;t
                share festival greetings, chain messages, or forwards. Save those
                for WhatsApp.
              </li>
              <li>
                <strong>Be respectful.</strong> This is a community of people who
                shared a formative experience. Treat everyone with the same
                respect you&apos;d show in person.
              </li>
              <li>
                <strong>No spam or self-promotion.</strong> The occasional career
                update is welcome, but this isn&apos;t the place for sales pitches
                or marketing.
              </li>
              <li>
                <strong>Report, don&apos;t retaliate.</strong> If you see
                something inappropriate, use the report button. The admin team
                will handle it.
              </li>
            </ul>
          </section>

          <Separator />

          <section>
            <p className="text-center text-sm text-muted-foreground">
              Built with care for the Rishi Valley community. 🌿
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
