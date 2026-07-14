import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const requiredIcons = [
  ["icon-192.png", 192, 192],
  ["icon-512.png", 512, 512],
  ["apple-touch-icon.png", 180, 180],
];

async function loadEnvironmentFile(filename) {
  try {
    const contents = await readFile(path.join(root, filename), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadEnvironmentFile(".env");
await loadEnvironmentFile(".env.local");

const supabaseUrl = process.env.supabaseUrl?.trim();
const supabasePublishableKey = process.env.supabasePublishableKey?.trim();

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing supabaseUrl or supabasePublishableKey. Add both to the deployment environment.");
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  throw new Error("supabaseUrl must be the HTTPS URL for a Supabase project.");
}

for (const [filename, expectedWidth, expectedHeight] of requiredIcons) {
  const contents = await readFile(path.join(root, "icons", filename));
  const isPng = contents.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = contents.readUInt32BE(16);
  const height = contents.readUInt32BE(20);
  if (!isPng || width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${filename} must be a ${expectedWidth} × ${expectedHeight} PNG.`);
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const filename of ["index.html", "styles.css", "app.js", "supabase-client.js", "program-schema-error.js", "rest-timer.js", "manifest.webmanifest", "sw.js"]) {
  await cp(path.join(root, filename), path.join(output, filename));
}
await cp(path.join(root, "icons"), path.join(output, "icons"), { recursive: true });

const runtimeConfig = `// Generated during deployment. Contains browser-safe public Supabase configuration only.\nwindow.TRAIN_CONFIG = ${JSON.stringify({ supabaseUrl, supabasePublishableKey }, null, 2)};\n`;
await writeFile(path.join(output, "config.js"), runtimeConfig, "utf8");

console.log("Production site built in dist/");
