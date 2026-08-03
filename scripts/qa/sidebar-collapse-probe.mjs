/**
 * Proves the account section COMPRESSES rather than vanishing, and that the
 * route marker fades with it (owner, 2026-08-03: "the expanding is perfect but
 * there's no compression animation, it just disappears" and "the marker just
 * suddenly appears ... when you expand or compress").
 *
 * Samples every frame across three interactions and asserts each one shows a
 * real ramp rather than a single-frame jump:
 *   1. Opening from the pill.
 *   2. Closing from the pill.
 *   3. Closing by navigating to a main surface.
 * A ramp means at least a few sampled frames sit at a partial opacity; a pop
 * means the value only ever reads 0 or 1.
 */
import puppeteer from "puppeteer";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });

const BASE = "http://localhost:3000";
let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(async (email) => {
  await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}, process.env.ADMIN_EMAIL);

/* Land on an account route so the section starts open with a marker in it. */
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

/** Sample the section's ink + the marker's opacity for `ms`. */
async function sample(ms) {
  const frames = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    frames.push(
      await page.evaluate(() => {
        const aside = document.querySelector("aside");
        if (!aside) return null;
        const settings = [...aside.querySelectorAll("a")].find(
          (a) => a.textContent.trim() === "Settings"
        );
        const bar = aside.querySelector(".bg-cinnamon");
        const label = settings?.querySelector("span:last-child");
        return {
          rows: !!settings,
          ink: label ? +getComputedStyle(label).opacity : null,
          marker: bar ? +getComputedStyle(bar).opacity : null,
        };
      })
    );
    await new Promise((r) => setTimeout(r, 16));
  }
  return frames.filter(Boolean);
}

/** Partial frames = a real ramp; only 0/1 = a pop. */
const partials = (vals) => vals.filter((v) => v !== null && v > 0.04 && v < 0.96).length;

const clickPill = () =>
  page.evaluate(() => {
    const aside = document.querySelector("aside");
    const pill = [...aside.querySelectorAll("button")].find((b) =>
      b.hasAttribute("aria-expanded")
    );
    pill?.click();
  });

/* 1. Close from the pill. */
{
  const p = sample(700);
  await clickPill();
  const frames = await p;
  const ink = partials(frames.map((f) => f.ink));
  const mk = partials(frames.map((f) => f.marker));
  check(ink >= 3, "closing from the pill: rows ramp out", `${ink} partial frames`);
  check(mk >= 2, "closing from the pill: the marker fades out", `${mk} partial frames`);
}
await new Promise((r) => setTimeout(r, 500));

/* 2. Open from the pill. */
{
  const p = sample(700);
  await clickPill();
  const frames = await p;
  const ink = partials(frames.map((f) => f.ink));
  const mk = partials(frames.map((f) => f.marker));
  check(ink >= 3, "opening from the pill: rows ramp in", `${ink} partial frames`);
  check(mk >= 2, "opening from the pill: the marker fades in", `${mk} partial frames`);
}
await new Promise((r) => setTimeout(r, 700));

/* 3. Close by navigating to a main surface. */
{
  const p = sample(900);
  await page.evaluate(() => {
    const aside = document.querySelector("aside");
    [...aside.querySelectorAll("a")].find((a) => a.textContent.trim() === "Feed")?.click();
  });
  const frames = await p;
  const ink = partials(frames.map((f) => f.ink));
  check(ink >= 3, "navigating to Feed: the section ramps out too", `${ink} partial frames`);
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
