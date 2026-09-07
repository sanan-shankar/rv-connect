// Screenshot any public page. `screenshot.mjs <url> [label] [--mobile]`.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shoot } from './_shoot.mjs';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));

const url = process.argv[2] || 'http://localhost:3000';
// Flags are filtered out so `screenshot.mjs <url> --mobile` (no label) cannot
// end up with a file called "screenshot-7---mobile.png".
const label = (process.argv[3] || '').startsWith('--') ? '' : process.argv[3] || '';

const { outPath } = await shoot({
  url,
  suffix: label,
  mobile: process.argv.includes('--mobile'),
});

console.log(`Screenshot saved: ${outPath}`);
