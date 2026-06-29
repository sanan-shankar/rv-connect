import puppeteer from "puppeteer";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const url = process.argv[2], out = process.argv[3];
const y = Number(process.argv[4]||0), h = Number(process.argv[5]||1100);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1100, height: 1000, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "load", timeout: 30000 });
await new Promise(r => setTimeout(r, 1600));
await p.screenshot({ path: out, clip: { x: 0, y, width: 1100, height: h } });
await b.close();
console.log("saved", out);
