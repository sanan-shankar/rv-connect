import type { Metadata } from "next";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { FeatureSection } from "@/components/landing/feature-section";
import { ShowcaseShot } from "@/components/landing/showcase-shot";
import { TrustSection } from "@/components/landing/trust-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { AmbientLeaves } from "@/components/landing/ambient-leaves";
import { PerchingBirds } from "@/components/landing/perching-birds";
import { SectionReveal } from "@/components/landing/section-reveal";
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

      {/* Page-wide ambient life: sparse falling (tappable) leaves and hop-physics
          birds on the showcase frames. Both are fixed layers that stay clear of
          the hero and never block the page (pointer-events pass through, except
          on the leaves themselves). */}
      <AmbientLeaves />
      <PerchingBirds />

      <LandingHero />

      {/* Intro band, sets the tone before the showcase */}
      <SectionReveal>
        <section className="mx-auto max-w-2xl px-6 pt-[var(--space-3xl)] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">
            What is inside
          </p>
          <h2 className="mx-auto mt-3 max-w-[24ch] font-heading text-3xl font-bold leading-[1.3] tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem]">
            The valley scattered everyone. This is where they find each other.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-[1.7] text-muted-foreground text-balance">
            Old batchmates and the teachers who taught them. The first batches and
            the ones who left last summer. One of us built it and looks after it,
            for the rest of us.
          </p>
        </section>
      </SectionReveal>

      <div className="mx-auto flex max-w-6xl flex-col gap-[var(--space-3xl)] px-6 py-[var(--space-3xl)] lg:px-8">
        {/* 1. Directory — the core reason to join, led first */}
        <FeatureSection
          eyebrow="The Directory"
          title="Everyone, and where they landed."
          body="Search by batch, by house, by the city someone lives in now, or by what they do for a living. The friend you last saw at the 2009 leavers' assembly is three taps from here."
          bullets={[
            "A map with a pin on every town the valley reached",
            "A bird stands in for anyone who has not added a photo yet",
          ]}
          accent="blue"
          visual={
            <div className="relative">
              <Shot name="directory" alt="The directory: a grid of people, each with a bird for an avatar." />
            </div>
          }
        />

        {/* 2. Feed */}
        <FeatureSection
          eyebrow="The Feed"
          title="What everyone is up to, on one page."
          body="A pair of grey hornbills at the fig tree by the amphitheatre. A wedding. A new job in a city nobody expected. A question for whoever still remembers the old library. It moves at the pace the valley did."
          accent="leaf"
          reverse
          visual={
            <div className="relative">
              <Shot name="feed" alt="The feed: posts from the valley, one after another down the page." />
            </div>
          }
        />

        {/* 3. Letters */}
        <FeatureSection
          eyebrow="Letters"
          title="Some things need more than a post."
          body="Write a Letter instead: the teacher who changed the shape of your life, or a whole essay about the year you finally understood what the place was for. It opens on a page made for reading slowly."
          accent="cinnamon"
          visual={
            <div className="relative">
              <Shot name="letters" alt="The Letters page, with a long-form piece about the valley." />
            </div>
          }
        />

        {/* 4. Catch-ups (the recurring round-robin) */}
        <FeatureSection
          eyebrow="Catch-ups"
          title="A letter that comes round every season."
          body="A few questions land in your inbox. You answer when you get a moment. Once everyone has, all the answers arrive together, so you hear from people you would never have thought to email."
          accent="leaf"
          reverse
          visual={
            <div className="relative">
              <Shot name="catchups" alt="The Catch-ups feature, a gathered group newsletter." />
            </div>
          }
        />

        {/* 5. The Valley Collection */}
        <div className="relative">
          <FeatureSection
            eyebrow="The Valley Collection"
            title="The valley remembers."
            body="Photographs going back decades. The banyan before the storm took the far branch. Choir on the assembly steps. Founders' Week, class by class. The light coming off Rishikonda at six in the morning."
            accent="cinnamon"
            visual={
              <div className="relative">
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
