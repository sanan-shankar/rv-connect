/**
 * Reading .env, once, for the hand-run scripts in this folder.
 *
 * Seven of them carried this parser verbatim, and five of those carried the
 * same leftover with it: `for (const file of [".env", ".env"])`, the second
 * entry a `.env.local` that stopped existing. Harmless, because the loop does
 * not override a key it has already seen -- but it is the kind of thing that
 * gets copied into the eighth script and then quietly means something.
 *
 * `readEnv` RETURNS the variables and touches nothing. `loadEnv` also puts
 * them into `process.env`, never overriding what is already set there, which
 * is what dotenv does and what every copy of this did.
 *
 * The split matters for one caller: `run-sql.mjs --env .env.demo` points at
 * the demo project's database, and its credentials must not end up in
 * `process.env` where a later import could pick them up. That script reads,
 * it does not load.
 *
 * Deliberately NOT a shared database opener as well. The four scripts that
 * open one do it four ways -- pg with relaxed SSL, pg without, and Prisma
 * behind the pg adapter -- and a shared opener with a default connection
 * string is the same convenience that scripts/demo/* keeps a wall against.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Parse one or more env files into a plain object. First writer wins. */
export function readEnv(files = [".env"]) {
  const vars = {};
  for (const file of files) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in vars)) vars[m[1]] = v;
    }
  }
  return vars;
}

/** As `readEnv`, and into `process.env` too, without overriding it. */
export function loadEnv(files = [".env"]) {
  const vars = readEnv(files);
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in process.env)) process.env[k] = v;
  }
  return vars;
}
