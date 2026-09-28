#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  valley-film-video.mjs: /lab/valley's film, rendered to an MP4.
 *
 *  The live room needs a good graphics chip and ~70 MB of imagery; a
 *  video plays on any phone. This drives the room's record mode
 *  (?record=1, which hands back each frame only once every tile in it
 *  has arrived) in a headless Chrome signed in as the admin, averages
 *  several sub-frames per frame across a 180-degree shutter for motion
 *  blur, and encodes with ffmpeg (Homebrew's; not an npm dependency).
 *
 *  Run (dev server up, `node scripts/dev/valley-film.mjs` done once):
 *    node scripts/dev/valley-film-video.mjs [--portrait] [--fps 30] [--blur 4] [--crf 22]
 *  Writes e2e/.shots/valley-film-<landscape|portrait>.mp4 (gitignored
 *  scratch). Landscape is 1920x1080; portrait is a 432x768 phone at
 *  2.5x, 1080x1920. About twelve minutes for landscape with --blur 4.
 * ------------------------------------------------------------------ */
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { chromePath, loadEnv } from "../qa/_probe-kit.mjs";
import { devLogin } from "../qa/_dev-login.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const portrait = args.includes("--portrait");
const FPS = opt("fps", 30);
const BLUR = Math.max(1, opt("blur", 4));
const CRF = opt("crf", 22);
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
  await page.goto(`${ORIGIN}/lab/valley?record=1&clean=1&dpr=${vp.deviceScaleFactor}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.dataset.filmReady === "1", { timeout: 300000, polling: 250 });
  const end = await page.evaluate(() => window.filmEnd);
  const n = Math.round(end * FPS) + 1;
  const started = Date.now();
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    let acc = null, info = null;
    for (let k = 0; k < BLUR; k++) {
      /* the sub-frames spread over half the frame's time: a 180-degree shutter */
      const ts = Math.min(end, Math.max(0, t + ((k + 0.5) / BLUR - 0.5) * (0.5 / FPS)));
      await page.evaluate((tt) => window.filmFrame(tt), BLUR > 1 ? ts : t);
      const shot = await page.screenshot({ type: "png" });
      const raw = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      info = raw.info;
      if (!acc) acc = new Float32Array(raw.data.length);
      for (let j = 0; j < raw.data.length; j++) acc[j] += raw.data[j];
    }
    const out = Buffer.alloc(acc.length);
    for (let j = 0; j < acc.length; j++) out[j] = Math.round(acc[j] / BLUR);
    await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .jpeg({ quality: 95 }).toFile(join(frames, `f${String(i).padStart(5, "0")}.jpg`));
    if (i % 30 === 0) console.log(`frame ${i} of ${n}, ${Math.round((Date.now() - started) / 1000)} s`);
  }
} finally {
  await browser.close();
}
const out = join(repo, "e2e", ".shots", `valley-film-${name}.mp4`);
mkdirSync(join(repo, "e2e", ".shots"), { recursive: true });
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"),
  "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
rmSync(frames, { recursive: true, force: true });
console.log(`wrote ${out}`);
