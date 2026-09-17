"use client";

/* ------------------------------------------------------------------ *
 *  /hoopoe -- the public playground.
 *
 *  This is the link we hand to somebody who has never seen the site:
 *  one big scene with the real rigged mascot standing in it, every verb
 *  it knows on a rail beside it, and the sign-in peek-a-boo underneath.
 *
 *  It is the same <Hoopoe> rig and the same queued controller the app
 *  uses; there is no second bird and no demo copy of one. What is
 *  different from /lab/hoopoe (which stays exactly as it was) is the
 *  audience: the lab room exists to JUDGE the bird (proportion sliders,
 *  tail compare, expression matrix, a sequence builder that prints
 *  code), this page exists to PLAY with it. So the plumbing readouts
 *  are gone, every verb is labelled in plain English rather than by its
 *  API name, and it wears the app's own tokens instead of the lab's
 *  bespoke palette, because a stranger opening this should see the
 *  valley's colours and not a control room.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { PARTS, type Expression, type Step } from "@/components/mascot/hoopoe-kit";
import { FadeRise } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gazeFor } from "@/components/mascot/use-hoopoe";

/* The ten emotional chords, named the way a visitor would name them
   rather than the way the type does ("surprise" and "love" are the two
   that read wrong as button labels). */
const MOODS: { label: string; expression: Expression }[] = [
  { label: "Content", expression: "content" },
  { label: "Curious", expression: "curious" },
  { label: "Happy", expression: "happy" },
  { label: "Surprised", expression: "surprise" },
  { label: "Sad", expression: "sad" },
  { label: "Sleepy", expression: "sleepy" },
  { label: "Fond", expression: "love" },
  { label: "Alert", expression: "alert" },
  { label: "Proud", expression: "proud" },
  { label: "Worried", expression: "worried" },
];

/* "Surprise me" plays one of these little stories. Each is a short scene
   with a beginning and an end rather than a single verb, because one
   verb fired at random reads as a twitch and a four-beat routine reads
   as a character doing something. Named, and the name is shown while it
   runs, so the thing you just watched has a title. */
const ROUTINES: { name: string; steps: Step[] }[] = [
  { name: "the greeting", steps: [["turn", 0], ["express", "happy"], ["wave", 2], ["crestFlick"]] },
  { name: "the forager", steps: [["walk", 2, "right"], ["peck"], ["express", "curious"], ["hop", 1, "left"]] },
  { name: "the show-off", steps: [["crest", true], ["celebrate", 2], ["express", "proud"], ["turn", 0]] },
  { name: "the tour guide", steps: [["walk", 2, "left"], ["point", "right", { label: "over here" }], ["express", "curious"], ["nod", 2]] },
  { name: "a quiet afternoon", steps: [["express", "sleepy"], ["preen"], ["blinkOnce", true], ["express", "content"]] },
  { name: "the fright", steps: [["express", "surprise"], ["hop", 1, "left"], ["express", "worried"], ["express", "content"]] },
];

/* Scene skies. Both are mixed from the app's own tokens (no new colour
   enters the system here): daylight leans on --sky over paper, dusk
   drops into canopy with a cinnamon horizon behind the bird. The dusk
   option is not decoration for its own sake -- it is the only way to
   see the "go to sleep" verb land properly. */
const SKIES = {
  day: "radial-gradient(125% 95% at 50% 8%, color-mix(in srgb, var(--sky) 26%, var(--card)) 0%, color-mix(in srgb, var(--cinnamon) 16%, var(--muted)) 100%)",
  dusk: "radial-gradient(125% 95% at 50% 8%, color-mix(in srgb, var(--canopy) 45%, var(--ink)) 0%, color-mix(in srgb, var(--cinnamon) 62%, var(--canopy)) 100%)",
} as const;

/* The rig's viewBox is 120 wide by 152 tall, so a bird rendered at `size`
   px wide stands SIZE * 152/120 tall and its shadow sits on the very
   bottom edge of that box. The horizon has to be derived from that, not
   guessed: at a fixed offset the line missed the bird's feet by 24px
   (measured, 1440x900) and the bird read as hovering over its own ground. */
const RIG_ASPECT = 152 / 120;

/* Where in the rig's box the bird's own anchor sits, as a fraction of the
   box height. flyTo places the anchor (body centre, viewBox 60,101) on the
   point you give it, and the viewBox starts at y = -10, so the anchor is
   (101 + 10) / 152 of the way down. Aiming a flyTo at exactly this point
   inside the rig's own box is what "go back to where you started" means:
   rest() restores the POSE but deliberately leaves the position alone, so
   without this a bird flown into a corner could never come home. */
const RIG_ANCHOR_Y = (101 + 10) / 152;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function HoopoePlayground() {
  return (
    <main className="min-h-dvh bg-background pb-20">
      <div className="mx-auto w-full max-w-[72rem] px-4 pt-10 sm:px-6 sm:pt-14">
        <FadeRise>
          <header className="mb-6 sm:mb-8">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-cinnamon">
              Rishi Valley
            </p>
            <h1 className="mt-1.5 font-heading text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Meet the hoopoe
            </h1>
          </header>
        </FadeRise>

        <FadeRise delay={0.06}>
          <Playground />
        </FadeRise>

        <FadeRise delay={0.12}>
          <PeekABoo />
        </FadeRise>

        <footer className="mt-8 text-[0.8rem] text-muted-foreground">
          The hoopoe is the mascot of the Rishi Valley alumni site.{" "}
          <Link href="/" className="font-semibold text-canopy underline-offset-4 hover:underline">
            Have a look around
          </Link>
        </footer>
      </div>
    </main>
  );
}

/* ---------------- the playground: scene + control rail ---------------- */

function Playground() {
  const { ref: birdRef, ...h } = useHoopoe();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [dusk, setDusk] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [birdSize, setBirdSize] = useState(190);
  const [mark, setMark] = useState<{ x: number; y: number; id: number } | null>(null);
  const markId = useRef(0);

  /* The bird owns roughly half the scene's height: large enough to be the
     subject at 390px wide, with headroom above for a fly-to arc and room
     below for the ground line. Measured rather than set per breakpoint so
     it is right at every width in between, including a resized window. */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const boxH = entry.contentRect.height;
      setBirdSize(Math.round(Math.max(150, Math.min(280, boxH * 0.52))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flyToPointer = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      const rect = sceneRef.current?.getBoundingClientRect();
      if (!rect) return;
      /* Keep the landing inside the frame. A flyTo target is where the bird's
         FEET end up (measured: the click point sits 69% of the way down the
         rig's box), so an unclamped click near the top of the sky lands a bird
         whose crest is 80px above the scene and gets cropped by the overflow.
         Clamping means every click still flies it somewhere -- as close to
         where you asked as it can stand -- instead of half of the sky
         producing a beheaded bird. The marker follows the clamped point, so
         what you see is where it is actually going. */
      const rigH = birdSize * RIG_ASPECT;
      const x = clamp(ev.clientX, rect.left + birdSize / 2, rect.right - birdSize / 2);
      const y = clamp(ev.clientY, rect.top + rigH * 0.69, rect.bottom - rigH * 0.31 - 4);
      markId.current += 1;
      setMark({ x: x - rect.left, y: y - rect.top, id: markId.current });
      h.flyTo({ x, y });
    },
    [h, birdSize]
  );

  /* Gaze is continuous and unqueued, so the bird can watch the pointer
     while it is mid-walk. Leaving the scene hands it back to its own
     ambient wander (gaze(null)) rather than freezing its eyes wherever
     the cursor happened to leave. */
  const watchPointer = useCallback((ev: React.PointerEvent) => h.gaze({ x: ev.clientX, y: ev.clientY }), [h]);
  const stopWatching = useCallback(() => h.gaze(null), [h]);

  /* Clears whatever is queued, flies the bird back to the middle if it has
     wandered, and settles the pose. The transform check keeps a bird that is
     already home from taking off and landing on the same spot for two seconds
     to achieve nothing. */
  function settle() {
    h.cancel();
    // Find the rig by its root PART and walk up to the <svg> it belongs to,
    // rather than asking the scene for its first <svg>: any icon dropped into
    // the scene later would be an <svg> too, and could sit earlier in the DOM.
    const root = sceneRef.current?.querySelector(PARTS.root);
    const svg = root?.closest("svg");
    if (svg && root) {
      const m = new DOMMatrix(getComputedStyle(root).transform);
      if (Math.abs(m.e) > 1 || Math.abs(m.f) > 1) {
        const r = svg.getBoundingClientRect();
        h.flyTo({ x: r.left + r.width / 2, y: r.top + r.height * RIG_ANCHOR_Y });
      }
    }
    h.rest();
  }

  async function surprise() {
    const pick = ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
    setNote(pick.name);
    setBusy(true);
    await h.sequence(...pick.steps);
    setBusy(false);
    setNote(null);
  }

  return (
    <section className="card-elevated rounded-lg border border-border bg-card p-3 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-5">
        {/* The scene sticks while the rail scrolls: on a phone the control
            groups are taller than the viewport, and a playground whose toy
            has scrolled off the screen is not a playground. */}
        {/* bg-card, not transparent: the rail scrolls UNDER this block, and
            the caption line below the scene has no fill of its own, so
            without it the chips read straight through the caption text. */}
        <div className="sticky top-2 z-10 self-start bg-card pb-1 lg:top-6">
          <div
            ref={sceneRef}
            onClick={flyToPointer}
            onPointerMove={watchPointer}
            onPointerLeave={stopWatching}
            style={{ background: dusk ? SKIES.dusk : SKIES.day }}
            className="relative grid h-[19rem] cursor-crosshair place-items-center overflow-hidden rounded-md border border-border transition-[background] duration-500 sm:h-[23rem] lg:h-[34rem]"
          >
            {/* horizon: the bird needs something to stand on or it reads as
                floating, and the fly-to landing needs a floor to land against */}
            <div
              className="pointer-events-none absolute inset-x-[8%] h-px bg-foreground/15"
              style={{ bottom: `calc(50% - ${(birdSize * RIG_ASPECT) / 2}px)` }}
            />

            <Hoopoe ref={birdRef} size={birdSize} pokeable={false} />

            {mark && (
              <m.span
                key={mark.id}
                aria-hidden
                className="pointer-events-none absolute size-3 rounded-full bg-cinnamon"
                style={{ left: mark.x, top: mark.y, translateX: "-50%", translateY: "-50%" }}
                initial={{ scale: 0.3, opacity: 0.85 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[0.78rem] leading-snug text-muted-foreground">
              {note ? (
                <span className="font-semibold text-cinnamon">{note}</span>
              ) : (
                "Tap to see it fly."
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={dusk}
              onClick={() => setDusk((d) => !d)}
              className="shrink-0 text-muted-foreground"
            >
              {dusk ? <Sun /> : <Moon />}
              {dusk ? "Daylight" : "Dusk"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="primary" onClick={surprise} disabled={busy} className="flex-1">
              Surprise me
            </Button>
            <Button variant="outline" onClick={settle}>
              Settle down
            </Button>
          </div>

          <Rail label="How it feels">
            {MOODS.map((m) => (
              <Chip key={m.expression} onClick={() => h.express(m.expression)}>
                {m.label}
              </Chip>
            ))}
          </Rail>

          <Rail label="Little moves">
            <Chip onClick={() => h.nod(2)}>Nod</Chip>
            <Chip onClick={() => h.shake(2)}>Shake head</Chip>
            <Chip onClick={() => h.wave(2)}>Wave</Chip>
            <Chip onClick={() => h.blinkOnce(true)}>Blink</Chip>
            <Chip onClick={() => h.preen()}>Preen</Chip>
            <Chip onClick={() => h.peck()}>Peck</Chip>
          </Rail>

          <Rail label="That crest">
            <Chip onClick={() => h.crest(true)}>Fan it out</Chip>
            <Chip onClick={() => h.crest(false)}>Fold it away</Chip>
            <Chip onClick={() => h.crestFlick()}>Flick</Chip>
          </Rail>

          <Rail label="Getting about">
            <Chip onClick={() => h.walk(2, "left")}>Walk left</Chip>
            <Chip onClick={() => h.walk(2, "right")}>Walk right</Chip>
            <Chip onClick={() => h.hop(2, "right")}>Hop</Chip>
            <Chip onClick={() => h.turn("left")}>Turn left</Chip>
            <Chip onClick={() => h.turn("right")}>Turn right</Chip>
            <Chip onClick={() => h.turn(0)}>Face me</Chip>
            <Chip onClick={() => h.flyIn("left")}>Fly in</Chip>
          </Rail>

          <Rail label="Big moments">
            <Chip onClick={() => h.celebrate(1)}>A cheer</Chip>
            <Chip onClick={() => h.celebrate(2)}>A proper cheer</Chip>
            <Chip onClick={() => h.celebrate(3)}>Everything at once</Chip>
            <Chip onClick={() => h.react("correct")}>Well done</Chip>
            <Chip onClick={() => h.react("wrong")}>Oh no</Chip>
            <Chip onClick={() => h.react("thinking")}>Thinking</Chip>
            <Chip onClick={() => h.react("greet")}>Hello</Chip>
          </Rail>

          <Rail label="Winding down">
            <Chip onClick={() => h.coverEyes()}>Cover its eyes</Chip>
            <Chip onClick={() => h.peek()}>Peek</Chip>
            <Chip onClick={() => h.sleep()}>Go to sleep</Chip>
            <Chip onClick={() => h.wake()}>Wake up</Chip>
          </Rail>
        </div>
      </div>
    </section>
  );
}

function Rail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

/* ---------------- the sign-in peek-a-boo ---------------- */

function PeekABoo() {
  const { ref: birdRef, ...h } = useHoopoe();
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (shown) h.peek();
    else h.coverEyes();
  }, [shown, h]);

  /* Typing drives the gaze from -1 to 1 across the first 16 characters,
     whether the eyes are covered or open: covered, the head still tracks
     along behind the wings, which is the detail that sells it. */
  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    h.gaze(gazeFor(e.target.value.length, 16));
  }

  return (
    <section className="card-elevated mt-4 grid items-center gap-6 rounded-lg border border-border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-heading text-xl font-bold">It will not look at your password</h2>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted-foreground">
          This is the real sign-in behaviour. The wings go over the eyes while the password is
          hidden and lift to peek when you reveal it, and either way the head follows what you
          type. Type something, then press show and type again.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        <Hoopoe ref={birdRef} size={140} />
        <div className="relative w-full max-w-[19rem]">
          <Input
            type={shown ? "text" : "password"}
            value={value}
            onChange={onType}
            placeholder="Type a secret"
            aria-label="A pretend password"
            className="h-11 pr-11"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide the password" : "Show the password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {shown ? <Eye /> : <EyeOff />}
          </Button>
        </div>
      </div>
    </section>
  );
}
