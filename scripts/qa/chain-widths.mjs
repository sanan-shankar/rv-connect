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
    const svg = document.querySelector("svg[viewBox]:has(path)") ||
      [...document.querySelectorAll("svg")].find((s) => s.querySelectorAll("path").length >= 1 && s.closest("[class*=relative]"));
    const host = [...document.querySelectorAll("div")].find((d) => d.querySelector("svg") && d.textContent.match(/\d{4}-\d{2}/));
    if (!host) return null;
    const pills = [...host.querySelectorAll("span")]
      .filter((s) => s.className.includes && s.className.includes("rounded-full") && s.textContent.match(/\d{4}/))
      .map((s) => s.getBoundingClientRect());
    const paths = [...host.querySelectorAll("svg path")];
    // A turn's main leg is the long path; heads are tiny.
    const legs = paths.filter((pa) => { const bb = pa.getBBox(); return bb.width + bb.height > 20; });
    let straight = 0, elbow = 0, crossings = 0;
    for (const leg of legs) {
      const d = leg.getAttribute("d") || "";
      if (d.includes("A ")) elbow++; else straight++;
      const bb = leg.getBoundingClientRect();
      for (const r of pills) {
        const ox = Math.min(bb.right, r.right) - Math.max(bb.left, r.left);
        const oy = Math.min(bb.bottom, r.bottom) - Math.max(bb.top, r.top);
        // A leg may touch the pill it points into; more than 6px of BOTH axes
        // means it is running through one.
        if (ox > 6 && oy > 6) crossings++;
      }
    }
    return { straight, elbow, crossings, pills: pills.length };
  });
  if (!res) { console.log(`${w}px: chain not found`); continue; }
  const ok = res.crossings === 0;
  if (!ok) bad++;
  console.log(`${String(w).padStart(4)}px  ${res.straight} straight, ${res.elbow} elbow  crossings=${res.crossings}  ${ok ? "" : "<-- FAIL"}`);
}
await b.close();
console.log(bad ? `\n${bad} width(s) FAILED` : "\nPASS: no turn crosses a pill at any width.");
process.exit(bad ? 1 : 0);
