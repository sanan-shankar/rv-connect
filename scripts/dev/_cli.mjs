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

/** The bytes behind one of our public urls. Local dev writes root-relative
 *  paths under public/; production writes absolute ones on the bucket's host. */
export async function bytesFor(u) {
  if (u.startsWith("/")) return readFile(path.join(process.cwd(), "public", u.slice(1)));
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
