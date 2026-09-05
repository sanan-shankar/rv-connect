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
 * them into `process.env`, never overriding what is already set there.
 *
 * The parsing is `dotenv`'s, which this project already depends on. The
 * hand-rolled loop that used to be here got four things wrong that dotenv
 * gets right: it kept an inline `# comment` as part of the value, kept
 * trailing whitespace, mangled a quoted multi-line value at the first
 * newline, and did not see `export KEY=value` at all. None of those was live
 * in `.env` or `.env.demo` on 2026-09-05 -- checked key by key, by value, on
 * both files, and all 25 keys came out identical -- so the swap changed
 * nothing that day. It is here so the next value someone pastes in with a
 * comment after it does not silently become part of a connection string.
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
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/** Parse one or more env files into a plain object. First writer wins.
 *  @param {string[]} [files]
 *  @returns {Record<string, string>} */
export function readEnv(files = [".env"]) {
  /** @type {Record<string, string>} */
  const vars = {};
  for (const file of files) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    /* `processEnv: {}` so dotenv parses into a throwaway object and never
       touches the real one -- `loadEnv` below decides that, and `run-sql.mjs
       --env .env.demo` depends on the demo project's credentials NOT landing
       in `process.env` where a later import could pick them up.
       `quiet` because dotenv 17 otherwise prints a banner on the stdout of
       every hand-run pass. */
    const parsed = config({ path: p, processEnv: {}, quiet: true }).parsed ?? {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in vars)) vars[k] = v;
    }
  }
  return vars;
}

/**
 * The connection string a hand-run script should use, and the one check that
 * stands between it and the wrong database.
 *
 * Ported from scripts/demo/run-sql.mjs. Asking for the demo env file and
 * getting production would be the worst outcome any script in this folder
 * has, and a stray DIRECT_URL in the shell is all it would take -- so when
 * the caller names .env.demo, the connection has to carry the demo project's
 * ref or nothing runs. It is a check on the DESTINATION, not on the request.
 *
 * Seven scripts made this check and each kept its own copy of the ref;
 * `import-album.mjs`, the one script in the folder that WRITES photographs
 * into the archive, was the one that never had it. Going through here is how
 * the eighth script gets it without anybody remembering to.
 *
 * @param {string} [envFile]
 * @returns {{ env: Record<string, string>, url: string }}
 */
export function databaseUrl(envFile = ".env") {
  const env = readEnv([envFile]);
  const url = env.DIRECT_URL || env.DATABASE_URL;
  if (!url) {
    console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
    process.exit(1);
  }
  if (envFile.includes("demo") && !url.includes(DEMO_REF)) {
    console.error(
      `refusing: ${envFile} was asked for, but the connection host does not carry the demo ref ${DEMO_REF}`
    );
    process.exit(1);
  }
  return { env, url };
}

/** The demo Supabase project's ref, as it appears in that project's connection
 *  host. The one copy; it used to be seven. */
const DEMO_REF = "cbvlzptghkuxhygyaezq";

/** As `readEnv`, and into `process.env` too, without overriding it.
 *  @param {string[]} [files]
 *  @returns {Record<string, string>} */
export function loadEnv(files = [".env"]) {
  const vars = readEnv(files);
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in process.env)) process.env[k] = v;
  }
  return vars;
}
