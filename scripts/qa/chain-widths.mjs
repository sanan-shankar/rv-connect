/* Renders the shipped houses chain across a sweep of widths and reports, per
 * width, how many turns took each branch and whether any turn's ink crosses a
 * pill it does not belong to. The elbow branch only fires when two rows fail
 * to overlap, which minimum-raggedness makes rare, so this is how it gets
 * exercised at all rather than sitting unproven. */
import puppeteer from "puppeteer";
import { config } from "dotenv";
config({ path: ".env.local" });

const URL = process.argv[2] || "http://localhost:3000/profile/cmruj2qau000004l3wi82xz3z";
const b = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await p.evaluate(async (e) => { await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) }); }, process.env.ADMIN_EMAIL);

let bad = 0;
for (const w of [1440, 1200, 1024, 900, 780, 660, 540, 430, 390, 340]) {
  await p.setViewport({ width: w, height: 1000 });
  await p.goto(URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1800));
  const res = await p.evaluate(() => {
    /* Scope hard to the chain. An earlier version found its host with a loose
       "some div containing an svg and a year", which matched a page-level
       ancestor, so `legs` swept in paths from the mascot, the peaks mark and
       every lucide icon on the page. Those sit hundreds of px from any pill,
       which is why the "closest ink" number was a meaningless 162px.
       The chain's svg is the only one drawn as a full-bleed overlay inside
       the trail, so select it directly and take its own parent as the host. */
    const svg = document.querySelector(
      "svg.pointer-events-none.absolute.inset-0"
    );
    if (!svg) return null;
    const host = svg.parentElement;
    const pills = [...host.querySelectorAll("span")]
      .filter(
        (el) =>
          typeof el.className === "string" &&
          el.className.includes("rounded-full") &&
          el.className.includes("border") &&
          /\d{4}/.test(el.textContent)
      )
      .map((el) => el.getBoundingClientRect());
    if (pills.length === 0) return null;
    /* Legs vs arrowheads, told apart by their path COMMANDS rather than by
       size. A size filter looked obvious and was wrong: a straight vertical
       drop has a zero-width bbox, so "big enough" silently excluded every
       drop and left only the one elbow in the whole sweep.
         straight leg  M .. L ..            one L, no arc
         elbow leg     M .. L .. A .. L ..  two Ls WITH an arc
         arrowhead     M .. L .. L ..       two Ls, no arc */
    const legs = [...svg.querySelectorAll("path")].filter((pa) => {
      const d = pa.getAttribute("d") || "";
      return d.includes("A ") || (d.match(/L/g) || []).length === 1;
    });
    let straight = 0, elbow = 0, crossings = 0;
    let minGap = Infinity;
    for (const leg of legs) {
      const d = leg.getAttribute("d") || "";
      if (d.includes("A ")) elbow++; else straight++;
      const bb = leg.getBoundingClientRect();
      for (const r of pills) {
        const ox = Math.min(bb.right, r.right) - Math.max(bb.left, r.left);
        const oy = Math.min(bb.bottom, r.bottom) - Math.max(bb.top, r.top);
        if (ox > 6 && oy > 6) crossings++;
        /* True rect-to-rect distance: overlapping on an axis contributes 0 to
           that axis, so a leg sitting directly above a pill reports exactly
           the vertical gap. */
        const gx = Math.max(0, -ox);
        const gy = Math.max(0, -oy);
        minGap = Math.min(minGap, Math.hypot(gx, gy));
      }
    }
    return { straight, elbow, crossings, minGap: Math.round(minGap * 10) / 10, pills: pills.length };
  });
  if (!res) { console.log(`${w}px: chain not found`); continue; }
  // 2px is the floor: below that the antialiased stroke visually kisses the
  // pill's edge even though the boxes technically clear.
  const ok = res.crossings === 0 && res.minGap >= 2;
  if (!ok) bad++;
  console.log(
    `${String(w).padStart(4)}px  ${res.straight} straight, ${res.elbow} elbow  crossings=${res.crossings}  closest ink-to-pill ${res.minGap}px  ${ok ? "" : "<-- FAIL"}`
  );
}
await b.close();
console.log(bad ? `\n${bad} width(s) FAILED` : "\nPASS: no turn crosses or touches a pill at any width.");
process.exit(bad ? 1 : 0);
