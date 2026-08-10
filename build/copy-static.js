// Post-build: copy the non-Vue parts of the extension into dist/ alongside the
// Vite-built dist/roster.js. content.js / background.js / injected.js stay
// vanilla on purpose (they hold the observer, CSRF and umami plumbing) and are
// deliberately kept out of the Vue build so that risk stays in the app layer.
//
// Keep this list in sync with everything manifest.json references — a missing
// content-script file makes the whole injection fail silently.
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// Files/dirs copied verbatim. dist/roster.js is produced by `vite build`.
const STATIC = [
  "manifest.json",
  "content.js",
  "background.js",
  "injected.js",
  "roster.css",
  "star.svg",
  "icons",
];

await mkdir(dist, { recursive: true });
for (const name of STATIC) {
  await cp(join(root, name), join(dist, name), { recursive: true });
}
console.log(`copied ${STATIC.length} static entries → dist/`);
