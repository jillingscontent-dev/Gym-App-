import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "app.js",
  "supabase-client.js",
  "program-schema-error.js",
  "rest-timer.js",
  "scripts/build.mjs",
  "scripts/lint.mjs",
  "tests/program-schema-error.test.mjs",
  "tests/rest-timer.test.mjs",
];

for (const filename of files) {
  execFileSync(process.execPath, ["--check", path.join(root, filename)], { stdio: "inherit" });
}
console.log(`Checked ${files.length} JavaScript files.`);
