#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Print a Catch-up magazine to PDF, and say how it went.
 *
 *  The M1 feasibility spike (docs/planning/catchups-rework/magazine.md,
 *  "The spike"): render one Edition through print CSS in the real Chrome
 *  on this Mac and MEASURE it, because every second and megabyte in
 *  prior-art.md section 8 was somebody else's workload. What it records:
 *
 *    - wall-clock from launch to file, and the page's own render time;
 *    - the PDF's size and page count, against the room's page count;
 *    - whether Libre Baskerville and Source Sans 3 are embedded (their
 *      names appear in the PDF's font dictionaries; a fallback face
 *      would not), and the paper size the PDF declares;
 *    - Chrome's peak resident memory while it printed.
 *
 *  Then, when `pdftoppm` is installed (Homebrew poppler), every page as
 *  a PNG, so the pages can be READ rather than trusted: a rasterised PDF
 *  page is what a member's phone shows, and a screenshot of the browser
 *  is not the same thing.
 *
 *  An ORDINARY dev script (handover F16): it judges nobody's data and
 *  writes nothing back. Output goes beside it in `scripts/dev/.magazine/`,
 *  which `scripts/dev/.*` already gitignores; a live Edition's PDF holds
 *  members' words and must never be committed.
 *
 *  Run: node scripts/dev/print-magazine.mjs                  (the live Edition)
 *       node scripts/dev/print-magazine.mjs --data wall-300  (one fixture)
 *       node scripts/dev/print-magazine.mjs --all            (the whole corpus)
 *  Needs the dev server on :3000 and DEV_LOGIN_SECRET / ADMIN_EMAIL in .env.
 * ------------------------------------------------------------------ */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { argv } from "./_cli.mjs";
import { chromePath, loadEnv } from "../qa/_probe-kit.mjs";
import { devLogin } from "../qa/_dev-login.mjs";

const ROOT = process.cwd();
loadEnv(ROOT);
const { flag, value } = argv();
const BASE = value("--base", "http://localhost:3000");
const OUT = path.join(ROOT, "scripts", "dev", ".magazine");
mkdirSync(OUT, { recursive: true });

const CORPUS = ["one-writer", "nobody-wrote", "forty-notes", "one-essay", "all-portraits", "wall-300", "no-photos", "songs", "voice-votes", "hostile", "capsule", "photo-heavy", "pressure-1", "pressure-2", "pressure-3"];
const keys = flag("--all") ? ["live", "live-2024", ...CORPUS] : [value("--data", "live")];
/* `--jpeg`: hand Chrome every photograph as a JPEG instead of the stored
   WebP, transcoded on the way past. Chrome's PDF writer keeps JPEG bytes
   as they are (DCTDecode) and stores anything else losslessly, which is
   the difference between an emailable file and an 89 MB one (D35). The
   spike measures that difference; M2's build serves JPEGs for real. */
const JPEG = flag("--jpeg");
const JPEG_QUALITY = Number(value("--quality", "82"));

function rss(pid) {
  try {
    return Number(execFileSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" }).trim()) / 1024;
  } catch {
    return 0;
  }
}

/** The names a PDF's font dictionaries carry. Chrome writes them
 *  uncompressed (`/BaseFont /ABCDEF+LibreBaskerville-Regular`), so a
 *  byte search is enough. */
function fontsIn(bytes, file) {
  /* poppler's pdffonts reads the compressed object streams Chrome writes
     the font dictionaries into; the byte search below only sees the
     uncompressed ones, which on Chrome's output is Arial and nothing else. */
  try {
    const out = execFileSync("pdffonts", [file], { encoding: "utf8" });
    return out
      .split("\n")
      .slice(2)
      .map((l) => l.trim().split(/\s+/)[0])
      .filter(Boolean)
      .map((n) => n.replace(/^[A-Z]{6}\+/, ""))
      .filter((n, i, all) => all.indexOf(n) === i)
      .sort();
  } catch {
    const text = bytes.toString("latin1");
    const names = new Set();
    for (const m of text.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_.-]+)/g)) names.add(m[1].replace(/^[A-Z]{6}\+/, ""));
    return [...names].sort();
  }
}

function pagesIn(bytes, file) {
  /* Chrome nests its page tree in groups of eight, so the first /Count a
     byte search finds is a branch, not the root. pdfinfo reads the root. */
  try {
    const out = execFileSync("pdfinfo", [file], { encoding: "utf8" });
    const m = out.match(/^Pages:\s+(\d+)/m);
    if (m) return Number(m[1]);
  } catch {
    /* fall through to the byte search */
  }
  const text = bytes.toString("latin1");
  const counts = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

function mediaBox(bytes) {
  const m = bytes.toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return m ? `${(Number(m[1]) / 72) * 25.4}mm x ${(Number(m[2]) / 72) * 25.4}mm` : "unknown";
}

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--font-render-hinting=none"] });
const report = [];
try {
  const page = await browser.newPage();
  await devLogin(page, BASE);
  if (JPEG) {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      const u = req.url();
      if (req.resourceType() !== "image" || !/\.(webp|png)(\?|$)/i.test(u)) return req.continue();
      try {
        const res = await fetch(u, { headers: { cookie: (await page.cookies()).map((c) => `${c.name}=${c.value}`).join("; ") } });
        if (!res.ok) return req.continue();
        const body = Buffer.from(await res.arrayBuffer());
        const jpeg = await sharp(body).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
        await req.respond({ status: 200, contentType: "image/jpeg", body: jpeg });
      } catch {
        req.continue();
      }
    });
  }
  await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1 });
  const pid = browser.process()?.pid;

  for (const key of keys) {
    const url = `${BASE}/lab/catchups/magazine?print=1&data=${encodeURIComponent(key)}`;
    const t0 = performance.now();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
    /* The room says when it has measured its text with the real fonts and
       every photograph has decoded. Print before that and the PDF is a
       picture of the estimate, not the layout. */
    await page.waitForSelector("[data-magazine-ready='true']", { timeout: 120_000 });
    const tReady = performance.now();
    const meta = await page.evaluate(() => {
      const root = document.querySelector("[data-magazine-ready]");
      return {
        pages: Number(root?.getAttribute("data-pages") ?? 0),
        overflows: Number(root?.getAttribute("data-overflows") ?? 0),
        fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
        /* Which blocks overflowed, and by how many rows: the estimate's
           error, block by block. */
        overflowing: [...document.querySelectorAll("[data-overflow='1']")].map((el) => ({
          page: Number(el.closest("[data-page]")?.getAttribute("data-page") ?? 0),
          kind: el.getAttribute("data-kind"),
          rows: Number(el.getAttribute("data-rows")),
          overBy: +((el.scrollHeight - el.clientHeight) / (5.3 * 96 / 25.4)).toFixed(1),
        })),
        images: [...document.images].length,
        brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
      };
    });
    const memBefore = pid ? rss(pid) : 0;
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      tagged: true,
      outline: true,
      timeout: 120_000,
    });
    const tPdf = performance.now();
    const memAfter = pid ? rss(pid) : 0;
    const file = path.join(OUT, `${key}${JPEG ? "-jpeg" : ""}.pdf`);
    writeFileSync(file, pdf);
    const bytes = readFileSync(file);
    const row = {
      key,
      pagesInRoom: meta.pages,
      pagesInPdf: pagesIn(bytes, file),
      overflows: meta.overflows,
      images: meta.images,
      brokenImages: meta.brokenImages,
      sizeMb: +(statSync(file).size / 1e6).toFixed(2),
      renderMs: Math.round(tReady - t0),
      printMs: Math.round(tPdf - tReady),
      chromeRssMb: Math.round(Math.max(memBefore, memAfter)),
      paper: mediaBox(bytes),
      fonts: fontsIn(bytes, file),
      loadedFonts: meta.fonts,
      overflowing: meta.overflowing,
    };
    report.push(row);
    console.log(`\n${key}: ${row.pagesInPdf} pages (room ${row.pagesInRoom}), ${row.sizeMb} MB, render ${row.renderMs} ms, print ${row.printMs} ms, Chrome ${row.chromeRssMb} MB, paper ${row.paper}`);
    console.log(`  fonts in PDF: ${row.fonts.join(", ") || "none"}`);
    if (row.overflows) console.log(`  ${row.overflows} block(s) overflowed their rows: ${meta.overflowing.slice(0, 8).map((o) => `p${o.page} ${o.kind} +${o.overBy}`).join(", ")}`);
    if (row.brokenImages) console.log(`  ${row.brokenImages} broken image(s)`);

    /* Every page as a PNG, through poppler, when it is there. 110 dpi is
       enough to read a page and small enough to open a dozen of them. */
    try {
      execFileSync("pdftoppm", ["-png", "-r", "110", file, path.join(OUT, `${key}${JPEG ? "-jpeg" : ""}`)], { stdio: "ignore" });
      console.log(`  pages rasterised to ${path.relative(ROOT, OUT)}/${key}-<n>.png`);
    } catch {
      console.log("  (pdftoppm not found: no page PNGs; brew install poppler)");
    }
  }
} finally {
  await browser.close();
}

writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`\nreport: ${path.relative(ROOT, OUT)}/report.json\n${path.relative(ROOT, OUT)} is gitignored; a live Edition's PDF holds members' words. Do not commit it.\n`);
if (!existsSync(path.join(OUT, "report.json"))) process.exit(1);
