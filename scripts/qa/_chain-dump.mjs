/* One-off: dump the chain's actual path data and pill boxes so a turn's real
   ink (not its bounding box) can be checked against the pills. */
import puppeteer from "puppeteer";
import { config } from "dotenv";
config({ path: ".env.local" });
const URL = process.argv[2];
const WIDTHS = process.argv.slice(3).map(Number);
const b = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await p.evaluate(async (e) => { await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) }); }, process.env.ADMIN_EMAIL);
for (const w of WIDTHS) {
  await p.setViewport({ width: w, height: 1100 });
  await p.goto(URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));
  const res = await p.evaluate(() => {
    const svg = document.querySelector("svg.pointer-events-none.absolute.inset-0");
    if (!svg) return null;
    const host = svg.parentElement;
    const hb = host.getBoundingClientRect();
    const pills = [...host.querySelectorAll("span")]
      .filter((el) => typeof el.className === "string" && el.className.includes("rounded-full") && el.className.includes("border") && /\d{4}/.test(el.textContent))
      .map((el) => { const r = el.getBoundingClientRect(); return { t: el.textContent.trim(), x: Math.round(r.left - hb.left), y: Math.round(r.top - hb.top), w: Math.round(r.width), h: Math.round(r.height) }; });
    const arrows = [...host.querySelectorAll("svg")].filter(s => s !== svg).map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.left - hb.left), y: Math.round(r.top - hb.top), w: Math.round(r.width), h: Math.round(r.height), flipped: (s.getAttribute("style")||"").includes("-1") }; });
    const paths = [...svg.querySelectorAll("path")].map((pa) => pa.getAttribute("d"));
    return { hostW: Math.round(hb.width), pills, arrows, paths };
  });
  console.log(`\n===== viewport ${w}  band ${res.hostW}px =====`);
  for (const p2 of res.pills) console.log(`  pill  ${p2.t.padEnd(22)} x=${String(p2.x).padStart(4)}..${String(p2.x+p2.w).padStart(4)}  y=${String(p2.y).padStart(3)}..${p2.y+p2.h}`);
  for (const a of res.arrows) console.log(`  inrow-arrow x=${String(a.x).padStart(4)}..${String(a.x+a.w).padStart(4)} y=${a.y}..${a.y+a.h} ${a.flipped?"(back)":""}`);
  for (const d of res.paths) console.log(`  path  ${d}`);
}
await b.close();
