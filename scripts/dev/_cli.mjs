/**
 * Argument reading, once, for the hand-run scripts in this folder.
 *
 * Six of them carried `flag` and `value` byte-identically, and two carried
 * `bytesFor` with the same comment above it. None of that is hard to write;
 * the point is that it stops being a decision. A seventh script gets the same
 * `--env` handling and the same "a missing flag is the fallback" rule without
 * its author choosing them again.
 *
 * Deliberately NOT a parser with a schema. These scripts take four or five
 * flags each, their row in scripts/README.md is their documentation, and a
 * declarative layer would be more code than the thing it replaced.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * `{ flag, value, rest }` over `process.argv`, or over a list you pass.
 *
 * `value("--limit", "0")` returns the argument AFTER the flag, or the fallback
 * when the flag is absent. A flag given with nothing after it reads as
 * `undefined`, which is what every one of these copies already did.
 */
export function argv(list = process.argv.slice(2)) {
  return {
    flag: (name) => list.includes(name),
    value: (name, fallback) => {
      const i = list.indexOf(name);
      return i === -1 ? fallback : list[i + 1];
    },
    rest: list,
  };
}

/** How long one file may take before it counts as not arriving. Thirty
 *  seconds is about 60 MB at the ~2 MB/s an uncached photograph now comes at
 *  (docs/TRAPS.md, Smart Tiered Cache on), far past any file these scripts
 *  read. Without it one stalled socket hung a whole run, silently. */
const DEADLINE_MS = 30_000;

/**
 * The bucket's key for `u` when `u` is on this bucket's public host and `env`
 * holds the keys to read the bucket directly; otherwise null, and the bytes
 * come over HTTP instead.
 * @param {string} u
 * @param {Record<string, string>} [env]
 */
export function bucketKey(u, env = {}) {
  const base = env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const keyed = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].every((k) => env[k]);
  if (!base || !keyed || !u.startsWith(`${base}/`)) return null;
  return u.slice(base.length + 1) || null;
}

/** One S3 client per env a script passes in. */
const buckets = new WeakMap();

/**
 * The bytes behind one of our public urls. Local dev writes root-relative
 * paths under public/; production writes absolute ones on the bucket's host.
 *
 * Pass the env the script read (`databaseUrl`'s `env`) and a url on the
 * bucket's host is read through the bucket's S3 endpoint, as docs/TRAPS.md
 * says every bulk reader must: from outside India an uncached photograph came
 * off the public host at 7-40 KB/s (bug audit 3, T2b-08). Anything else comes
 * over HTTP. Either way a file slower than DEADLINE_MS fails, which every
 * caller already records, rather than hanging the run.
 * @param {string} u
 * @param {Record<string, string>} [env]
 * @returns {Promise<Buffer>}
 */
export async function bytesFor(u, env) {
  if (u.startsWith("/")) return readFile(path.join(process.cwd(), "public", u.slice(1)));
  const key = bucketKey(u, env);
  if (key) {
    // Loaded here, not at the top: most scripts import this file only for argv().
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    let s3 = buckets.get(env);
    if (!s3) {
      s3 = new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      });
      buckets.set(env, s3);
    }
    const res = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }), {
      abortSignal: AbortSignal.timeout(DEADLINE_MS),
    });
    return Buffer.from(await res.Body.transformToByteArray());
  }
  const res = await fetch(u, { signal: AbortSignal.timeout(DEADLINE_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
