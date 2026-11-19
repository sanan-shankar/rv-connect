import { test } from "node:test";
import assert from "node:assert/strict";
import { Eyes, RunawayBrain, capsule } from "./runaway-brain.ts";

// A seeded random, so a failure can be replayed.
const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};

// The signup column at 1440x900, roughly: 600 wide, the slot at the foot.
const WORLD = {
  w: 600,
  viewTop: 0,
  viewBottom: 900,
  slot: { x: 100, y: 760, w: 400, h: 44 },
  obstacles: [
    { x: 100, y: 520, w: 400, h: 56 },
    { x: 100, y: 590, w: 400, h: 56 },
  ],
  pillW: 80,
  pillH: 44,
};
const HOME = { x: 300, y: 782 };
const FRAME = 1000 / 60;

/** A brain plus the eyes that feed it, run frame by frame. */
function rig(seed) {
  const rng = seeded(seed);
  const brain = new RunawayBrain({ rng });
  const eyes = new Eyes();
  let now = 1000;
  let pointer = null;
  const frame = () => {
    now += FRAME;
    if (pointer) eyes.see(now, pointer.x, pointer.y, false);
    brain.step(FRAME / 1000, now, WORLD, eyes.perceive(now, 0, 0, rng));
  };
  return {
    brain,
    run(frames, move) {
      for (let i = 0; i < frames; i++) {
        if (move) pointer = move(now, pointer);
        frame();
      }
    },
    point(p) {
      pointer = p;
      if (p) eyes.see(now, p.x, p.y, false);
      else eyes.leave(now);
    },
    press(p, touch = false) {
      pointer = p;
      eyes.down(now, p.x, p.y, touch);
      return brain.press(p, touch);
    },
  };
}

const under = (brain, p) => capsule(p, brain.centre, brain.width, WORLD.pillH) < 0;

test("a press never lands, from the slot or out in the open", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const r = rig(seed);
    r.run(5);
    assert.ok(r.press(HOME), `seed ${seed}: the press on the slot should count`);
    r.run(8); // 133ms, the pointer held where it pressed
    assert.ok(!under(r.brain, HOME), `seed ${seed}: still under the pointer after the slot press`);
    r.run(90);
    const at = r.brain.centre;
    assert.ok(r.press(at), `seed ${seed}: the press on the pill should count`);
    r.run(8);
    assert.ok(!under(r.brain, at), `seed ${seed}: still under the pointer after a press out in the open`);
    // A flinch, not a flight: the comedy is that it was RIGHT there.
    const went = Math.hypot(r.brain.centre.x - at.x, r.brain.centre.y - at.y);
    assert.ok(went < 140, `seed ${seed}: a press sent it ${Math.round(went)}px, a flinch should be short`);
  }
});

test("a hand chasing it at full speed never presses it either", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = rig(seed);
    r.point({ x: 300, y: 300 });
    r.run(5);
    let hits = 0;
    for (let round = 0; round < 12; round++) {
      // Chase its centre at 1400px/s for half a second, then press wherever the hand is.
      r.run(30, (_, p) => {
        const c = r.brain.centre;
        const dx = c.x - p.x;
        const dy = c.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, 1400 / 60);
        return { x: p.x + (dx / d) * step, y: p.y + (dy / d) * step };
      });
      const c = r.brain.centre;
      const at = { x: Math.min(WORLD.w - 2, Math.max(2, c.x)), y: c.y };
      if (r.press(at)) {
        hits++;
        r.run(8);
        assert.ok(!under(r.brain, at), `seed ${seed}: a chased press landed`);
      }
    }
    assert.ok(hits > 0, `seed ${seed}: the chase never even got to press`);
  }
});

test("left alone, it creeps home and settles back into its slot", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const r = rig(seed);
    r.run(5);
    r.press(HOME);
    r.point(null);
    r.run(60 * 20);
    assert.equal(r.brain.mode, "docked", `seed ${seed}: not home after 20 quiet seconds`);
  }
});

test("Grandmother's Footsteps: it never creeps closer while you move, only while you are still", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const r = rig(seed);
    r.run(5);
    r.press(HOME);
    r.run(60);
    // Far from home and from it, the hand keeps moving in a small circle.
    const far = { x: 520, y: 120 };
    const circling = (now) => ({ x: far.x + 12 * Math.cos(now / 90), y: far.y + 12 * Math.sin(now / 90) });
    r.point(circling(0));
    r.run(60);
    const before = Math.hypot(r.brain.centre.x - HOME.x, r.brain.centre.y - HOME.y);
    r.run(60 * 4, circling);
    const moving = Math.hypot(r.brain.centre.x - HOME.x, r.brain.centre.y - HOME.y);
    assert.ok(moving > before - 1, `seed ${seed}: crept ${before - moving}px closer while the hand moved`);
    // Now the hand keeps still: it should start for home.
    r.run(60 * 4, (_, p) => p);
    const after = Math.hypot(r.brain.centre.x - HOME.x, r.brain.centre.y - HOME.y);
    assert.ok(after < moving - 20 || r.brain.mode === "docked", `seed ${seed}: did not creep home while the hand was still`);
  }
});

test("wherever it rests, it rests whole and on screen", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = rig(seed);
    r.point({ x: 300, y: 300 });
    r.run(5);
    for (let i = 0; i < 60 * 8; i++) {
      // A restless hand: wanders, lunges at it, wanders again.
      r.run(1, (now, p) => {
        const c = r.brain.centre;
        const lunge = Math.floor(now / 700) % 2 === 0;
        const goal = lunge ? c : { x: 300 + 250 * Math.cos(now / 400), y: 450 + 300 * Math.sin(now / 300) };
        const dx = goal.x - p.x;
        const dy = goal.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, (lunge ? 1600 : 700) / 60);
        return { x: p.x + (dx / d) * step, y: p.y + (dy / d) * step };
      });
      const { mode, moving, centre: c } = r.brain;
      if (moving || mode === "hiding" || mode === "docked" || mode === "docking") continue;
      assert.ok(
        c.x - WORLD.pillW / 2 >= 0 && c.x + WORLD.pillW / 2 <= WORLD.w && c.y - WORLD.pillH / 2 >= 0 && c.y + WORLD.pillH / 2 <= 900,
        `seed ${seed}: resting off stage at ${Math.round(c.x)},${Math.round(c.y)} (${mode})`
      );
    }
  }
});

test("hiding never ends the game: it comes back out while the hand keeps moving", () => {
  // Owner, 2026-11-19: having to sit still to get it back was the one
  // deflating moment. Holding still still sends it home; moving must not
  // leave it hiding.
  let hid = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const r = rig(seed);
    r.point({ x: 300, y: 300 });
    r.run(5);
    const lunge = (_, p) => {
      const c = r.brain.centre;
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = Math.min(d, 1600 / 60);
      return { x: p.x + (dx / d) * step, y: p.y + (dy / d) * step };
    };
    for (let i = 0; i < 60 * 12 && r.brain.mode !== "hiding"; i++) r.run(1, lunge);
    if (r.brain.mode !== "hiding") continue;
    hid++;
    let back = -1;
    for (let i = 0; i < 60 * 6; i++) {
      // A hand that keeps moving, in a slow circle mid-column.
      r.run(1, (now) => ({ x: 300 + 60 * Math.cos(now / 300), y: 420 + 60 * Math.sin(now / 300) }));
      if (r.brain.mode !== "hiding") {
        back = i / 60;
        break;
      }
    }
    assert.ok(back >= 0 && back < 4.5, `seed ${seed}: hid for ${back < 0 ? "6s or more" : `${back.toFixed(1)}s`} while the hand kept moving`);
  }
  assert.ok(hid >= 5, `only ${hid} of 30 hard chases ever drove it into hiding`);
});

test("a press grazing its edge gets a flinch too, not a run across the page", () => {
  // Touch counts as a hit up to 18px out, so on a phone most presses land
  // near the edge, not dead centre.
  for (let seed = 1; seed <= 30; seed++) {
    for (const [dy, touch] of [[-(WORLD.pillH / 2 + 4), false], [-(WORLD.pillH / 2 + 12), true], [WORLD.pillH / 2 + 3, false]]) {
      const r = rig(seed);
      r.run(5);
      r.press(HOME);
      r.run(90);
      const c = r.brain.centre;
      const at = { x: c.x + 10, y: c.y + dy };
      assert.ok(r.press(at, touch), `seed ${seed}: a press ${dy}px out should count`);
      r.run(10);
      const went = Math.hypot(r.brain.centre.x - c.x, r.brain.centre.y - c.y);
      assert.ok(went < 140, `seed ${seed}: an edge press (${dy}px, ${touch ? "touch" : "mouse"}) sent it ${Math.round(went)}px`);
    }
  }
});

test("a pointer leaving the window and coming back elsewhere is not a lunge", () => {
  const eyes = new Eyes();
  const rng = seeded(1);
  for (let t = 0; t <= 200; t += 16) eyes.see(1000 + t, 100, 100, false);
  eyes.leave(1220);
  // Back in, 600px away, half a second later, then still.
  for (let t = 0; t <= 300; t += 16) eyes.see(1700 + t, 700, 400, false);
  const s = eyes.perceive(2000, 0, 0, rng);
  assert.ok(Math.hypot(s.vel.x, s.vel.y) < 50, `read a still pointer as moving at ${Math.round(Math.hypot(s.vel.x, s.vel.y))}px/s`);
});
