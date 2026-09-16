import { test, expect } from "@playwright/test";

/* Regression guard for the bug the owner reported on 2026-09-16: closing a
 * post's comment thread "jerks up and then closes smoothly", and it did it
 * even on a post with no comments at all.
 *
 * The cause was not the animation. post-card.tsx put the action row's -9px
 * bottom pull behind `!showComments`, so React removed 9px of negative margin
 * on the same render that started the panel's exit. Sampled frame by frame,
 * the panel's top went 231 -> 222 in ONE frame and only then collapsed over
 * 580ms. A tween cannot smooth over a layout change that happens beside it.
 *
 * So what is pinned here is the INVARIANT, not the easing: nothing above the
 * panel may move while the panel is collapsing. That holds however the close
 * is timed, and it fails the moment someone puts a layout-affecting class back
 * behind the open/closed flag.
 *
 * Sampled by an in-page requestAnimationFrame loop rather than expect.poll,
 * because the jump lived in the FIRST frame after the click -- a poll from the
 * test process cannot see it. Geometry, not element presence, per the
 * CLAUDE.md locator traps: a node mid exit-animation still answers
 * toBeVisible(). */

test("closing a comment thread never moves what sits above it", async ({ page }) => {
  await page.goto("/feed");

  /* Scoped to an article so the mobile drawer's portal cannot supply the
     match; every post card renders exactly one of these toggles. */
  const toggle = page.locator("article button[aria-controls^='comments-']").first();
  await expect(toggle).toBeVisible();

  const panelId = await toggle.getAttribute("aria-controls");
  if (!panelId) throw new Error("comment toggle has no aria-controls");
  const panel = page.locator(`#${panelId}`);

  await toggle.click();

  /* Wait for the open to finish rather than for the panel to exist: the height
     spring is still running, and the comments arrive from the network and grow
     it again. Settled = two polls with the same height. */
  let last = -1;
  await expect
    .poll(
      async () => {
        const h = await panel.evaluate((el) => Math.round(el.getBoundingClientRect().height));
        const settled = h > 0 && h === last;
        last = h;
        return settled;
      },
      { timeout: 15_000, message: "comment panel never settled open" },
    )
    .toBe(true);

  /* Close, and record the panel's top edge on every frame until it unmounts.
     Its top is where everything above it ends, so a change here IS the jerk. */
  const frames = await page.evaluate(async (id: string) => {
    const btn = document.querySelector<HTMLElement>(
      `article button[aria-controls="${id}"]`,
    );
    if (!btn) return [];
    const out: { top: number; height: number }[] = [];
    const measure = () => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      /* Rounded to a tenth: sub-pixel rasterisation wobbles, a 9px layout
         jump does not. */
      return { top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10 };
    };

    /* Frame zero is the SETTLED OPEN state, read before the click, and it is
       the frame that matters. The bug's 9px jump happened between the last
       open frame and the first closing one, so a sampler that starts after
       the click sees one consistent (already jumped) position and passes a
       broken build. That is exactly how the first draft of this test went
       green against the bug it was written for. */
    const first = measure();
    if (first) out.push(first);

    const t0 = performance.now();
    btn.click();
    return await new Promise<typeof out>((resolve) => {
      const tick = () => {
        const sample = measure();
        if (sample) out.push(sample);
        /* Stop when the panel has unmounted, or after 1.2s, whichever comes
           first -- the close tween is 550ms. */
        if (sample && performance.now() - t0 < 1200) requestAnimationFrame(tick);
        else resolve(out);
      };
      requestAnimationFrame(tick);
    });
  }, panelId);

  /* Guard against a vacuous pass: if the panel vanished in a frame or two
     there would be nothing to have jerked, and the assertions below would be
     trivially true. The close runs ~550ms, so ~30 frames at 60Hz. */
  expect(frames.length, "the close was not observed animating").toBeGreaterThan(10);

  /* The whole point. Every frame's top edge is the first frame's. */
  const tops = new Set(frames.map((f) => f.top));
  expect(
    [...tops],
    "the panel's top edge moved while it was closing -- something above it changed layout mid-transition",
  ).toHaveLength(1);

  /* And it really did collapse, on its own, rather than being cut. */
  expect(frames[frames.length - 1].height).toBeLessThan(frames[0].height * 0.2);
});
