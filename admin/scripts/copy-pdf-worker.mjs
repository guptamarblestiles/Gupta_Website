// pdf.js parses PDFs in a Web Worker. The worker file has to be served
// from this app's own origin, at the exact version of the pdfjs-dist
// library in use, so it is copied into public/ on every install rather
// than committed (where it could drift from the library version).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });
copyFileSync(src, join(publicDir, "pdf.worker.min.mjs"));
console.log("Copied pdf.js worker to public/pdf.worker.min.mjs");
