import type { Metadata } from "next";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { FeatureSection } from "@/components/landing/feature-section";
import { ShowcaseShot } from "@/components/landing/showcase-shot";
import { TrustSection } from "@/components/landing/trust-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { AmbientLeaves } from "@/components/landing/ambient-leaves";
import { PerchingBirds } from "@/components/landing/perching-birds";
import { ScrollHoopoe } from "@/components/landing/scroll-hoopoe";
import { Annotation, type ArrowSpec } from "@/components/landing/annotation";
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

/* Three hand-drawn arrows, spread across the page (not on every section). Each
   unfurls on scroll and points from a margin note to one real thing in a shot:
   a bird avatar, the poll, the contribute button. Geometry is tuned against the
   captured shots; see the shot images in public/images/landing. */
const ARROW_TO_AVATAR: ArrowSpec = {
  viewBox: "0 0 132 104",
  d: "M120 96 C 96 74, 110 52, 74 48 C 50 45, 44 34, 30 14",
  head: "M30 14 L 45 20 M30 14 L 27 31",
  className: "bottom-full right-1 mb-1 w-[24cqw]",
};

const ARROW_TO_POLL: ArrowSpec = {
  viewBox: "0 0 150 80",
  d: "M138 58 C 102 54, 118 34, 66 36 C 44 37, 32 40, 16 44",
  head: "M16 44 L 33 38 M16 44 L 27 55",
  className: "right-full top-1 mr-1 w-[27cqw]",
};

const ARROW_TO_CONTRIBUTE: ArrowSpec = {
  viewBox: "0 0 92 116",
  d: "M56 104 C 36 82, 66 62, 46 40 C 40 32, 44 24, 46 12",
  head: "M46 12 L 35 25 M46 12 L 57 23",
  className: "bottom-full right-5 mb-1 w-[16cqw]",
};

export default function LandingPage() {
  return (
    <div className="bg-background">
      <LandingNav />

      {/* Page-wide ambient life: sparse falling (tappable) leaves, hop-physics
          birds on the showcase frames, and the one hoopoe as a scroll companion.
          All are fixed layers that stay clear of the hero and never block the
          page (pointer-events pass through, except on the leaves themselves). */}
      <AmbientLeaves />
      <PerchingBirds />
      <ScrollHoopoe />

      <LandingHero />

      {/* Intro band, sets the tone before the showcase */}
      <SectionReveal>
        <section className="mx-auto max-w-2xl px-6 pt-[var(--space-3xl)] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">
            What is inside
          </p>
          <h2 className="mx-auto mt-3 max-w-[24ch] font-heading text-3xl font-bold tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem] sm:leading-[1.08]">
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
            <div className="relative @container">
              <Shot name="directory" alt="The directory: a grid of people, each with a bird for an avatar." />
              <Annotation
                caption="the bird you get until you add a face"
                className="bottom-[6%] right-[5%] w-[30cqw] text-right"
                arrow={ARROW_TO_AVATAR}
              />
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
            <div className="relative @container">
              <Shot name="feed" alt="The feed: posts from the valley, one after another down the page." />
              <Annotation
                caption="settle it with a poll"
                className="top-[45%] right-[2.5%] w-[20cqw] text-right"
                arrow={ARROW_TO_POLL}
              />
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
              <div className="relative @container">
                <Shot name="collection" alt="The Valley Collection, a shared archive of valley photographs." />
                <Annotation
                  caption="add the ones only you still have"
                  className="top-[30%] right-[3%] w-[24cqw] text-right"
                  arrow={ARROW_TO_CONTRIBUTE}
                />
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
