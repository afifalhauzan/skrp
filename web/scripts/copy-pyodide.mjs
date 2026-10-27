// Self-hosts the Pyodide runtime: copies it from node_modules into public/pyodide.
// Must stay in step with PYODIDE_VERSION in src/features/python-editor/runnerClient.ts.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = dirname(require.resolve("pyodide/package.json"));
const dest = join(process.cwd(), "public", "pyodide");
const files = [
  "pyodide.js",
  "pyodide.asm.js",
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
