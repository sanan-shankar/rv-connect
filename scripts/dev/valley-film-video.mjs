#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  valley-film-video.mjs: /lab/valley's film, rendered to an MP4.
 *
 *  The live room needs a good graphics chip and ~70 MB of imagery; a
 *  video plays on any phone. This drives the room's record mode
 *  (?record=1, which hands back each frame only once every tile in it
 *  has arrived) in a headless Chrome signed in as the admin, and encodes
 *  with ffmpeg (Homebrew's; not an npm dependency).
 *
 *  Each frame is SAMPLES moments across a 180-degree shutter, each moved
 *  by a fraction of a pixel, averaged in the renderer before its tone
 *  curve (ValleyRenderer.renderAveraged): real motion blur, and nothing
 *  smaller than a pixel flickering from one frame to the next. Sixty
 *  frames a second, because the land below a low camera moves fast.
 *
 *  Run (dev server up, `node scripts/dev/valley-film.mjs` done once):
 *    node scripts/dev/valley-film-video.mjs [--portrait] [--fps 60] [--samples 16] [--crf 20]
 *  Writes e2e/.shots/valley-film-<landscape|portrait>.mp4 (gitignored
 *  scratch). Landscape is 1920x1080; portrait is a 432x768 phone at
 *  2.5x, 1080x1920.
 * ------------------------------------------------------------------ */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { chromePath, loadEnv } from "../qa/_probe-kit.mjs";
import { devLogin } from "../qa/_dev-login.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const portrait = args.includes("--portrait");
const FPS = opt("fps", 60);
const SAMPLES = Math.max(1, opt("samples", 16));
const CRF = opt("crf", 20);
const ORIGIN = "http://localhost:3000";

const repo = process.cwd();
loadEnv(repo);
const vp = portrait ? { width: 432, height: 768, deviceScaleFactor: 2.5 } : { width: 1920, height: 1080, deviceScaleFactor: 1 };
const name = portrait ? "portrait" : "landscape";
/* frames live in the system's temp folder, never beside the repo */
const frames = join(tmpdir(), `valley-film-${name}-frames`);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), args: ["--no-sandbox", "--ignore-gpu-blocklist", "--enable-gpu"] });
try {
  const page = await browser.newPage();
  await page.setViewport(vp);
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await devLogin(page, ORIGIN);
  /* grain at half the room's: a video codec turns strong per-frame grain
     into crawling blotches */
  await page.goto(`${ORIGIN}/lab/valley?record=1&clean=1&dpr=${vp.deviceScaleFactor}&grain=0.015`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.dataset.filmReady === "1", { timeout: 300000, polling: 250 });
  const end = await page.evaluate(() => window.filmEnd);
  const n = Math.round(end * FPS) + 1;
  const started = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((t, s, sh) => window.filmFrame(t, s, sh), i / FPS, SAMPLES, 0.5 / FPS);
    writeFileSync(join(frames, `f${String(i).padStart(5, "0")}.jpg`), await page.screenshot({ type: "jpeg", quality: 95 }));
    if (i % 60 === 0) console.log(`frame ${i} of ${n}, ${Math.round((Date.now() - started) / 1000)} s`);
  }
} finally {
  await browser.close();
}
const out = join(repo, "e2e", ".shots", `valley-film-${name}.mp4`);
mkdirSync(join(repo, "e2e", ".shots"), { recursive: true });
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"),
  "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF), "-profile:v", "high", "-level:v", "4.2",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
rmSync(frames, { recursive: true, force: true });
console.log(`wrote ${out}`);
