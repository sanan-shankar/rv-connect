// Per-route client JS from the production build (Next 16 prints no First Load JS column).
// For each app route: unique static/chunks referenced by its page_client-reference-manifest.js
// (the client modules that route can hydrate) + the root main files from build-manifest.json.
// Approximates "First Load JS": shared framework chunks are counted once per route.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const root = ".next";
const bm = JSON.parse(readFileSync(join(root, "build-manifest.json"), "utf8"));
const rootMain = bm.rootMainFiles ?? [];
const size = (p) => { try { return statSync(join(root, p)).size; } catch { return 0; } };
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else if (e.endsWith("_client-reference-manifest.js")) out.push(p); } return out; };
const files = walk(join(root, "server", "app"));
const rows = [];
for (const f of files) {
  const txt = readFileSync(f, "utf8");
  const chunks = new Set([...txt.matchAll(/static\/chunks\/[^"'\\]+\.js/g)].map((m) => m[0]));
  const route = f.replace(/^\.next\/server\/app/, "").replace(/\/(page|layout|not-found|route)_client-reference-manifest\.js$/, "").replace(/\((auth|main|policies)\)\//, "") || "/";
  const routeChunks = [...chunks].filter((c) => !rootMain.includes(c));
  const routeKB = routeChunks.reduce((a, c) => a + size(c), 0) / 1024;
  const rootKB = rootMain.reduce((a, c) => a + size(c), 0) / 1024;
  rows.push({ route: route.replace(/^\/?/, "/"), kind: /\/(layout|not-found)_client/.test(f) ? "layout" : "page", routeKB, firstLoadKB: routeKB + rootKB, n: routeChunks.length });
}
rows.sort((a, b) => b.firstLoadKB - a.firstLoadKB);
const rootKB = rootMain.reduce((a, c) => a + size(c), 0) / 1024;
console.log(`root main files (every page): ${rootMain.length} chunks, ${rootKB.toFixed(0)} KB raw (uncompressed)`);
console.log(rootMain.map((c) => `  ${(size(c) / 1024).toFixed(0).padStart(5)} KB  ${c}`).join("\n"));
console.log("\nroute                                    kind    route-KB  first-load-KB  chunks");
for (const r of rows) console.log(`${r.route.padEnd(40)} ${r.kind.padEnd(7)} ${r.routeKB.toFixed(0).padStart(8)} ${r.firstLoadKB.toFixed(0).padStart(14)} ${String(r.n).padStart(7)}`);
// which chunks are shared by most pages (candidates for "why is this on every page")
const count = new Map();
for (const f of files) { if (!/page_client/.test(f)) continue; const txt = readFileSync(f, "utf8"); for (const m of new Set([...txt.matchAll(/static\/chunks\/[^"'\\]+\.js/g)].map((x) => x[0]))) count.set(m, (count.get(m) ?? 0) + 1); }
const pages = files.filter((f) => /page_client/.test(f)).length;
console.log(`\nchunks referenced by the most pages (of ${pages} pages), non-root:`);
for (const [c, n] of [...count].filter(([c]) => !rootMain.includes(c)).sort((a, b) => b[1] - a[1] || size(b[0]) - size(a[0])).slice(0, 25)) console.log(`  ${String(n).padStart(3)} pages  ${(size(c) / 1024).toFixed(0).padStart(5)} KB  ${c}`);
