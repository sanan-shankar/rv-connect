/**
 * Dumps the SHAPE of each desktop flight, not just its endpoint. The landing
 * check already proves both flights land pixel-exact; this answers the
 * separate question of how the bird arrives (owner, 2026-08-03: "appears
 * nicely from the top when you click sign in, but just suddenly appears when
 * you click join").
 *
 * Reports, per target: the CTA origin, the perch, the peak of the arc, how
 * far above the perch the bird ever gets, and the vertical profile of the
 * final approach. Also reports the worst combined ground-shadow opacity
 * across the handoff, which must stay at one bird's worth (0.18).
 */
import puppeteer from "puppeteer";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function run({ tag, ctaText, href }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + href, { waitUntil: "networkidle2" }); // prewarm route
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));

  await page.evaluate(() => {
    window.__samples = [];
    const tick = () => {
      const flyer = document.querySelector("[data-mascot-flyer]");
      const perch = document.querySelector("[data-hoopoe-perch]");
      if (flyer) {
        const fr = flyer.getBoundingClientRect();
        // total ground-shadow ink on screen this frame, across BOTH birds
        const shadows = [...document.querySelectorAll('[data-part="shadow"]')]
          .filter((el) => {
            const host = el.closest("[data-mascot-flyer],[data-hoopoe-perch]");
            if (!host) return false;
            return parseFloat(getComputedStyle(host).opacity) > 0.01;
          })
          .map((el) => parseFloat(getComputedStyle(el).opacity) || 0);
        const combined = 1 - shadows.reduce((acc, o) => acc * (1 - o), 1);
        window.__samples.push({
          y: fr.top,
          x: fr.left,
          op: parseFloat(getComputedStyle(flyer).opacity),
          perchTop: perch ? perch.getBoundingClientRect().top : null,
          perchOp: perch ? parseFloat(getComputedStyle(perch).opacity) : 0,
          shadows: shadows.length,
          combined,
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* Scope to the hero <section>: only those CTAs are wired to launchFlight.
     The sticky nav carries plain links with the same text earlier in the DOM,
     and clicking one navigates without ever flying (which is what made an
     earlier version of this probe report "no flyer samples" for Sign in). */
  const ctaCentre = await page.evaluate(
    ({ href, ctaText }) => {
      const a = [...document.querySelectorAll(`section a[href="${href}"]`)].find(
        (el) => el.textContent.trim() === ctaText
      );
      if (!a) return null;
      const r = a.getBoundingClientRect();
      const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      a.click();
      return centre;
    },
    { href, ctaText }
  );
  if (!ctaCentre) {
    await page.close();
    console.log(`${tag}: hero CTA not found`);
    return null;
  }
  await new Promise((r) => setTimeout(r, 4000));

  const s = await page.evaluate(() => window.__samples);
  await page.close();

  const vis = s.filter((p) => p.op > 0.01);
  if (!vis.length) return console.log(`${tag}: no flyer samples`);
  const perchTop = vis.map((p) => p.perchTop).filter((v) => v != null).pop();
  const minY = Math.min(...vis.map((p) => p.y)); // highest point on screen
  const finalY = vis[vis.length - 1].y;
  const worstShadow = Math.max(...s.map((p) => p.combined || 0));
  const doubled = s.filter((p) => p.shadows > 1).length;

  // The last 500ms of approach, sampled sparsely, to show the descent.
  const tail = vis.slice(-40).filter((_, i) => i % 8 === 0).map((p) => Math.round(p.y));

  console.log(`\n${tag}`);
  console.log(`  CTA centre y        ${Math.round(ctaCentre.y)}`);
  console.log(`  perch top y         ${perchTop != null ? Math.round(perchTop) : "?"}`);
  console.log(`  arc apex y          ${Math.round(minY)}  (${Math.round(finalY - minY)}px above the perch at its highest)`);
  console.log(`  approach tail y     ${tail.join(" -> ")}`);
  console.log(`  frames w/ 2 shadows ${doubled}`);
  console.log(`  worst combined shadow opacity ${worstShadow.toFixed(3)}  (one bird = 0.180)`);
  return { tag, worstShadow, doubled };
}

const a = await run({ tag: "SIGN IN  -> /login", ctaText: "Sign in", href: "/login" });
const b = await run({ tag: "JOIN     -> /signup", ctaText: "Join the community", href: "/signup" });
await browser.close();

const bad = [a, b].filter((r) => r && r.worstShadow > 0.2);
if (bad.length) {
  console.error(`\nFAIL: shadow doubles on ${bad.map((r) => r.tag).join(", ")}`);
  process.exit(1);
}
console.log("\nPASS: never more than one bird's worth of ground shadow.");
