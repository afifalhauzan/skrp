// Copies the Pyodide runtime from node_modules into public/pyodide (self-hosted).
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = dirname(require.resolve("pyodide/package.json"));
const dest = join(process.cwd(), "public", "pyodide");
const files = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];
mkdirSync(dest, { recursive: true });
for (const f of files) {
  if (!existsSync(join(src, f))) throw new Error(`pyodide file missing: ${f}`);
  cpSync(join(src, f), join(dest, f));
}
console.log(`pyodide: copied ${files.length} files to public/pyodide`);
