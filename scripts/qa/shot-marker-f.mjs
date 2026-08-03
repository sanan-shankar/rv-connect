/* Screenshots version F of /lab/spine-marker on its own, since six panels
 * wrap past the fold at 1440. Clicks a second row first so the marker's
 * resting position is visible on a row that was not the default. */
import puppeteer from "puppeteer";
const b = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1400 });
await p.goto("http://localhost:3000/lab/spine-marker", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));
const box = await p.evaluate(() => {
  // The panel is the 248px-wide column that holds both the demo sidebar and
  // its caption; find it by width + content rather than by walking parents.
  const panel = [...document.querySelectorAll("div")].find(
    (d) => Math.round(d.getBoundingClientRect().width) === 248 && d.textContent.includes("F · Cinnamon C")
  );
  if (!panel) return null;
  const r = panel.getBoundingClientRect();
  return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.width + 24, height: r.height + 24 };
});
if (!box) { console.error("F panel not found"); process.exit(1); }
await p.screenshot({ path: "temporary screenshots/marker-f.png", clip: box });
await b.close();
console.log("saved temporary screenshots/marker-f.png");
