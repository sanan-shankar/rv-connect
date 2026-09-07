// Shared verifier helper: authed screenshot + console/pageerror + doc status.
// Usage: node scripts/qa/verify-shot.mjs <route> <outName.png> [mobile]
// Prints one JSON line: {route, status, errors[], out}
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { shoot } from "./_shoot.mjs";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));

// `quiet` because dotenv 17 otherwise prints a banner, and this script's
// contract is exactly one JSON line on stdout.
config({ path: ".env", quiet: true });

const [route, out = "shot.png", mobile] = process.argv.slice(2);
/* Loopback, and not configurable. It used to be typed twice; it is once now,
   and it stays a literal on purpose -- a base URL from the environment is the
   thing `local-base-url.mjs` exists to refuse, because this script mints an
   admin session cookie against whatever origin it is pointed at. */
const BASE = "http://localhost:3000";

const { outPath, status, errors } = await shoot({
  url: BASE + route,
  authed: true,
  mobile: mobile === "mobile",
  out,
  settleMs: 500,
  watchConsole: true,
  /* This script REPORTS a failed navigation instead of throwing on it --
     `status` is a field its callers read. */
  tolerateNavError: true,
});

console.log(JSON.stringify({ route, status, errors, out: outPath }));
