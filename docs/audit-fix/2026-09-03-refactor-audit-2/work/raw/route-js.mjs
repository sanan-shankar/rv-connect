// Per-route first-load client JS from .next/diagnostics/route-bundle-stats.json (Next 16 emits
// firstLoadUncompressedJsBytes per route). Usage: node route-js.mjs <route-bundle-stats.json>
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const kb = (b) => (b / 1024).toFixed(0);
rows.sort((a, b) => b.firstLoadUncompressedJsBytes - a.firstLoadUncompressedJsBytes);
const nonLab = rows.filter((r) => !r.route.startsWith("/lab"));
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
console.log(`routes: ${rows.length} (${nonLab.length} non-lab, ${rows.length - nonLab.length} lab)`);
console.log(`non-lab median first-load: ${kb(med(nonLab.map((r) => r.firstLoadUncompressedJsBytes)))} KB raw; min ${kb(Math.min(...nonLab.map((r) => r.firstLoadUncompressedJsBytes)))} max ${kb(Math.max(...nonLab.map((r) => r.firstLoadUncompressedJsBytes)))}`);
// chunks common to every route = the framework floor
const all = rows.map((r) => new Set(r.firstLoadChunkPaths));
const common = [...all[0]].filter((c) => all.every((s) => s.has(c)));
console.log(`chunks on every route: ${common.length}`);
console.log("\nroute                                      first-load-KB  chunks");
for (const r of rows) console.log(`${r.route.padEnd(42)} ${kb(r.firstLoadUncompressedJsBytes).padStart(13)} ${String(r.firstLoadChunkPaths.length).padStart(7)}`);
// chunk frequency across non-lab routes
const freq = new Map();
for (const r of nonLab) for (const c of new Set(r.firstLoadChunkPaths)) freq.set(c, (freq.get(c) ?? 0) + 1);
console.log(`\nchunks by how many non-lab routes carry them (of ${nonLab.length}):`);
const buckets = {};
for (const [, n] of freq) buckets[n] = (buckets[n] ?? 0) + 1;
console.log(Object.entries(buckets).sort((a, b) => b[0] - a[0]).map(([n, c]) => `${c} chunks on ${n} routes`).join("; "));
