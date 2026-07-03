import type { Metadata } from "next";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { FeatureSection } from "@/components/landing/feature-section";
import { ShowcaseShot } from "@/components/landing/showcase-shot";
import { TrustSection } from "@/components/landing/trust-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { HoppingBird, DriftingLeaves } from "@/components/landing/landing-birds";
import { ValleySection } from "@/components/landing/valley-section";
import { SHOTS } from "@/components/landing/shots";

export const metadata: Metadata = {
  title: {
    absolute: "Rishi Valley",
  },
  description:
    "A space for the Rishi Valley community to stay connected.",
};

function Shot({ name, alt }: { name: keyof typeof SHOTS; alt: string }) {
  const s = SHOTS[name];
  return (
    <ShowcaseShot src={s.src} alt={alt} width={s.w} height={s.h} blurDataURL={s.blur} />
  );
}

export default function LandingPage() {
  return (
    <div className="bg-background">
      <LandingNav />
      <LandingHero />

      {/* The living valley: drifting leaves, perching birds, hoopoe slot */}
      <ValleySection />

      {/* Intro band, sets the tone before the showcase */}
      <section className="mx-auto max-w-2xl px-6 pt-20 text-center sm:pt-28">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">
          What is inside
        </p>
        <h2 className="mx-auto mt-3 max-w-[20ch] font-heading text-3xl font-bold tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem] sm:leading-[1.08]">
          Everything the valley scattered, gathered in one quiet place.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-[1.7] text-muted-foreground">
          Batchmates and teachers, past and present. Built and kept by one of us,
          for all of us.
        </p>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-6 py-20 sm:space-y-32 sm:py-28 lg:px-8">
        {/* 1. Directory — the core reason to join, led first */}
        <FeatureSection
          eyebrow="The Directory"
          title="Find the people, not just the posts."
          body="The whole point is the people. Search by batch, house, city, or what someone does now, and actually find the friend you lost touch with in 2009."
          bullets={[
            "A world map of where the valley scattered",
            "Bird avatars until someone uploads a face",
            "Filter by batch, house, and city",
          ]}
          accent="blue"
          visual={
            <div className="relative">
              <HoppingBird className="-top-5 left-10 z-10" />
              <Shot name="directory" alt="The directory, with a world map of where members live." />
            </div>
          }
        />

        {/* 2. Feed */}
        <FeatureSection
          eyebrow="The Feed"
          title="The valley, in one quiet sheet."
          body="One ruled sheet, not an endless scroll. A sighting, a memory, a note for the valley. It stays useful even when it is busy, because it was never built to be loud."
          accent="leaf"
          reverse
          visual={
            <div className="relative">
              <HoppingBird className="-top-5 right-12 z-10" />
              <Shot name="feed" alt="The feed, a calm ruled sheet of posts from members." />
            </div>
          }
        />

        {/* 3. Letters */}
        <FeatureSection
          eyebrow="Letters"
          title="Room for the longer things."
          body="When a post is too small for what you want to say, write a Letter. An essay, a tribute, a travelogue, opening into a quiet reading page of its own."
          accent="cinnamon"
          visual={
            <div className="relative">
              <HoppingBird className="-top-5 left-8 z-10" />
              <Shot name="letters" alt="The Letters page, with a long-form piece about the valley." />
            </div>
          }
        />

        {/* 4. Catch-ups (the recurring round-robin) */}
        <FeatureSection
          eyebrow="Catch-ups"
          title="A letter that comes round again."
          body="A round-robin that comes back every season. You answer a few prompts, everyone's answers arrive together, and the years stay close even when the miles do not."
          accent="leaf"
          reverse
          visual={
            <div className="relative">
              <HoppingBird className="-top-5 right-10 z-10" />
              <Shot name="catchups" alt="The Catch-ups feature, a gathered group newsletter." />
            </div>
          }
        />

        {/* 5. The Valley Collection */}
        <div className="relative">
          <DriftingLeaves />
          <FeatureSection
            eyebrow="The Valley Collection"
            title="The valley remembers."
            body="Decades of the valley in one place. The banyan, Rishi Konda, choir on the steps, the hoopoes that never left. Add the ones only you still have."
            accent="cinnamon"
            visual={
              <div className="relative">
                <HoppingBird className="-top-5 left-12 z-10" />
                <Shot name="collection" alt="The Valley Collection, a shared archive of valley photographs." />
              </div>
            }
          />
        </div>

        {/* 6. Trust / invite-only */}
        <TrustSection />
      </div>

      {/* 7. Closing CTA + footer */}
      <LandingFooter />
    </div>
  );
}
