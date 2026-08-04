import type { Metadata } from "next";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { FeatureSection } from "@/components/landing/feature-section";
import { ShowcaseShot, type Tint, type Tilt } from "@/components/landing/showcase-shot";
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

function Shot({
  name,
  alt,
  tint,
  tilt,
}: {
  name: keyof typeof SHOTS;
  alt: string;
  tint?: Tint;
  tilt?: Tilt;
}) {
  const s = SHOTS[name];
  return (
    <ShowcaseShot
      src={s.src}
      alt={alt}
      width={s.w}
      height={s.h}
      blurDataURL={s.blur}
      tint={tint}
      tilt={tilt}
    />
  );
}

/**
 * Small crops of the same Collection screenshot's photo grid, printed as
 * loose polaroid tiles under the "valley remembers" copy — the row's height
 * is set by the tall frame, so the short text column otherwise leaves a bare
 * patch below it. Rendered in normal flow at the end of the text column
 * (via `textExtra`, not pinned against the visual column), so the column
 * simply grows to fit them and there is no way for them to collide with the
 * copy above however many lines it wraps to at a given width. Pure
 * decoration (the real, accessible photos are the ones inside the frame),
 * so cropped via a plain CSS background rather than a second <Image>.
 * Hidden below `lg`, where the section stacks single-column and the frame
 * no longer dictates the row's height.
 */
const COLLECTION_SRC_W = 1100;
const COLLECTION_SRC_H = 720;
const TILE_SOURCE = 246; // px square sampled from the collection.webp grid
const TILE_SCALE = 0.4;
const TILE_SIZE = Math.round(TILE_SOURCE * TILE_SCALE);
const MEMORY_TILES = [
  { x: 32, y: 166, rotate: -7 },
  { x: 291, y: 166, rotate: 4 },
  { x: 551, y: 424, rotate: -5 },
];

function MemoryTiles() {
  return (
    <div aria-hidden className="mt-6 hidden gap-3 lg:flex">
      {MEMORY_TILES.map((tile, i) => (
        <div
          key={i}
          className="card-elevated rounded-lg border border-border bg-card pt-1.5 px-1.5 pb-3"
          style={{ transform: `rotate(${tile.rotate}deg)` }}
        >
          <div
            className="rounded-[4px]"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              backgroundImage: `url(${SHOTS.collection.src})`,
              backgroundSize: `${COLLECTION_SRC_W * TILE_SCALE}px ${COLLECTION_SRC_H * TILE_SCALE}px`,
              backgroundPosition: `-${tile.x * TILE_SCALE}px -${tile.y * TILE_SCALE}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * One feature section's full-bleed row. `tint` washes the row edge-to-edge in
 * Mist so alternating sections read as bands that abut directly — the colour
 * change does the job whitespace used to do, which is how the sequence stays
 * dense without the sections feeling squeezed. Untinted rows simply show the
 * page background through, so no wrapper is needed there beyond the shared
 * width/padding rhythm.
 */
function Band({ tint = false, children }: { tint?: boolean; children: React.ReactNode }) {
  return (
    <div className={tint ? "relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-mist" : ""}>
      <div className="mx-auto max-w-6xl px-6 py-[var(--space-l)] lg:px-8 lg:py-[var(--space-xl)]">
        {children}
      </div>
    </div>
  );
}

/**
 * Everything below the hero is held back (owner, 2026-08-04: "I want to make
 * the landing page no longer scroll ... I don't want to delete everything
 * under the landing page, I just need to improve it further before it's
 * shipped"). The showcase stays written out in full below so turning it back
 * on is this one flag; nothing has been deleted.
 *
 * Off, the page is exactly the hero's `min-h-dvh` and there is nothing to
 * scroll to, so three things come off with it: the scroll cue in the hero
 * (it would point at nothing), the sticky nav (it exists only to follow a
 * long scroll), and the ambient leaves and perching birds (both are fixed
 * layers that deliberately keep clear of the hero and live on the showcase
 * frames, so with no showcase they would render nothing at a cost).
 */
const SHOW_SHOWCASE = false;

export default function LandingPage() {
  return (
    <div className="bg-background">
      {SHOW_SHOWCASE && (
        <>
          <LandingNav />

          {/* Page-wide ambient life: sparse falling (tappable) leaves and
              hop-physics birds on the showcase frames. Both are fixed layers
              that stay clear of the hero and never block the page
              (pointer-events pass through, except on the leaves themselves). */}
          <AmbientLeaves />
          <PerchingBirds />
        </>
      )}

      <LandingHero showScrollCue={SHOW_SHOWCASE} />

      {SHOW_SHOWCASE && (
        <>

      {/* Intro band, sets the tone before the showcase */}
      <SectionReveal>
        <section className="mx-auto max-w-2xl px-6 pt-[var(--space-xl)] text-center lg:pt-[var(--space-xxl)]">
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

      {/* Feature sequence: five full-bleed rows, alternating Mist/plain so
          consecutive sections read as bands that meet edge-to-edge instead of
          floating cards separated by dead space. Each carries an oversized
          ghost numeral (desktop only) as a quiet chapter marker. */}
      <Band>
        <FeatureSection
          index={1}
          eyebrow="The Directory"
          title="Everyone, and where they landed."
          body="Search by batch, by house, by the city someone lives in now, or by what they do for a living. The friend you last saw at the 2009 leavers' assembly is three taps from here."
          bullets={[
            "A map with a pin on every town the valley reached",
            "A bird stands in for anyone who has not added a photo yet",
          ]}
          accent="blue"
          visual={
            // Bled up ~60px into the intro band above (a static transform,
            // so it costs nothing at layout time) so the two rows interlock
            // instead of meeting at a clean, flat seam. Desktop only: the
            // intro copy sits centred above the two-column row only there.
            <div className="lg:-translate-y-[35px]">
              <Shot name="directory" alt="The directory: a grid of people, each with a bird for an avatar." tint="sky" tilt="ccw" />
            </div>
          }
        />
      </Band>

      <Band tint>
        <FeatureSection
          index={2}
          eyebrow="The Feed"
          title="What everyone is up to, on one page."
          body="A pair of grey hornbills at the fig tree by the amphitheatre. A wedding. A new job in a city nobody expected. A question for whoever still remembers the old library. It moves at the pace the valley did."
          accent="leaf"
          reverse
          visual={<Shot name="feed" alt="The feed: posts from the valley, one after another down the page." tint="leaf" tilt="cw" />}
        />
      </Band>

      <Band>
        <FeatureSection
          index={3}
          eyebrow="Letters"
          title="Some things need more than a post."
          body="Write a Letter instead: the teacher who changed the shape of your life, or a whole essay about the year you finally understood what the place was for. It opens on a page made for reading slowly."
          accent="cinnamon"
          visual={<Shot name="letters" alt="The Letters page, with a long-form piece about the valley." tint="cinnamon" tilt="ccw" />}
        />
      </Band>

      <Band tint>
        <FeatureSection
          index={4}
          eyebrow="Catch-ups"
          title="A letter that comes round every season."
          body="A few questions land in your inbox. You answer when you get a moment. Once everyone has, all the answers arrive together, so you hear from people you would never have thought to email."
          accent="leaf"
          reverse
          visual={<Shot name="catchups" alt="The Catch-ups feature, a gathered group newsletter." tint="leaf" tilt="cw" />}
        />
      </Band>

      <Band>
        <FeatureSection
          index={5}
          eyebrow="The Valley Collection"
          title="The valley remembers."
          body="Photographs going back decades. The banyan before the storm took the far branch. Choir on the assembly steps. Founders' Week, class by class. The light coming off Rishikonda at six in the morning."
          accent="cinnamon"
          textExtra={<MemoryTiles />}
          visual={<Shot name="collection" alt="The Valley Collection, a shared archive of valley photographs." tint="cinnamon" tilt="ccw" />}
        />
      </Band>

      {/* 6. Trust / invite-only. Bottom padding trimmed a step down the
          golden-ratio scale (xl -> l) so the card doesn't leave a second
          near-empty band on top of the footer's own lead-in above "Come
          back to the valley" right below it. */}
      <div className="mx-auto max-w-6xl px-6 pt-[var(--space-l)] pb-[var(--space-m)] lg:px-8 lg:pt-[var(--space-xl)] lg:pb-[var(--space-l)]">
        <TrustSection />
      </div>

      {/* 7. Closing CTA + footer */}
          <LandingFooter />
        </>
      )}
    </div>
  );
}
