// Drives the lab sequence + a few verbs and reports console errors + whether the queue drained.
import puppeteer from "puppeteer";
import { existsSync } from "fs";
const SYSTEM_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined;
const browser = await puppeteer.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto("http://localhost:3000/preview/delight/hoopoe", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 800));

const clickByText = async (t) => page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.textContent || "").trim().toLowerCase() === t.toLowerCase());
  if (b) { b.click(); return true; } return false;
}, t);

// individual verbs that were reworked
for (const v of ["nod", "shake", "walk 2 ›", "hop", "fold / close", "open", "wave"]) {
  const ok = await clickByText(v);
  console.log(`click "${v}": ${ok ? "ok" : "NOT FOUND"}`);
  await new Promise((r) => setTimeout(r, 1400));
}

// the full sequence (walk -> point -> express -> celebrate)
const ran = await clickByText("Run sequence");
console.log(`click "Run sequence": ${ran ? "ok" : "NOT FOUND"}`);
await new Promise((r) => setTimeout(r, 7000));
const btnText = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => /run sequence|running/i.test(x.textContent || ""));
  return b ? b.textContent.trim() : "(missing)";
});
console.log(`sequence button after wait: "${btnText}" (expect "Run sequence" = drained, not wedged)`);

// stop() mid-action then continue (the abort-token path)
await clickByText("celebrate 3");
await new Promise((r) => setTimeout(r, 200));
await clickByText("cancel");
await new Promise((r) => setTimeout(r, 400));
const busyOk = await clickByText("nod"); // should still respond after cancel
await new Promise((r) => setTimeout(r, 900));
console.log(`post-cancel nod responded: ${busyOk}`);

// flight: click an empty part of the stage to fly there (tests the flap-bound path arrays)
await page.mouse.click(760, 300);
await new Promise((r) => setTimeout(r, 2800));
console.log("flight click done");

console.log(`\nERRORS (${errors.length}):`);
errors.slice(0, 20).forEach((e) => console.log("  " + e));
await browser.close();
console.log("CHECK DONE");
