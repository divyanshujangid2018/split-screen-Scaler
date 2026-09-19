#!/usr/bin/env node
// Generates a synthetic multi-user dataset under sample-data/ for exercising the app
// without needing real user data. Run with `npm run generate-samples`, or
// `npm run generate-samples -- --big` for the 15-user / 500-files-per-user stress case.
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const big = args.includes("--big");
const outArgIndex = args.indexOf("--out");
const outDir = outArgIndex >= 0 ? args[outArgIndex + 1] : join(fileURLToPath(new URL("..", import.meta.url)), "sample-data");

const USER_COUNT = big ? 15 : 8; // includes reference
const FILES_PER_FOLDER = big ? 170 : 6;
const FOLDERS = ["app", "assets", "config"];

function textFile(seed) {
  return `// Generated sample file (seed ${seed})\nfunction handler_${seed}() {\n  return ${seed} * 2;\n}\n`;
}

function jsonFile(seed) {
  return JSON.stringify({ id: seed, name: `item-${seed}`, enabled: true }, null, 2) + "\n";
}

function buildReferenceManifest() {
  const manifest = [];
  for (const folder of FOLDERS) {
    for (let i = 0; i < FILES_PER_FOLDER; i++) {
      const isJson = i % 5 === 0;
      const name = isJson ? `item_${i}.json` : `file_${i}.txt`;
      manifest.push({
        relativePath: `${folder}/${name}`,
        content: isJson ? jsonFile(`${folder}-${i}`) : textFile(`${folder}-${i}`),
      });
    }
  }
  manifest.push({ relativePath: "README.md", content: "# Sample Project\n\nGenerated for FileCompare testing.\n" });
  return manifest;
}

function writeFiles(root, files) {
  for (const f of files) {
    const full = join(root, f.relativePath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, f.content);
  }
}

function mutate(manifest, userIndex) {
  const out = [];
  manifest.forEach((f, i) => {
    const bucket = (i + userIndex) % 20;
    if (bucket === 0) return; // missing (~5%)
    if (bucket === 1) {
      // modified
      out.push({ relativePath: f.relativePath, content: f.content + `\n// modified by user ${userIndex}\n` });
      return;
    }
    if (bucket === 2) {
      // renamed (same content, tweaked filename)
      const renamed = f.relativePath.replace(/(\.[a-z0-9]+)$/i, `_v2$1`);
      out.push({ relativePath: renamed, content: f.content });
      return;
    }
    out.push(f); // identical
  });
  if (userIndex % 3 === 0) {
    out.push({ relativePath: `assets/new_asset_user${userIndex}.txt`, content: `Extra file only user ${userIndex} has.\n` });
  }
  return out;
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const referenceManifest = buildReferenceManifest();
writeFiles(join(outDir, "reference"), referenceManifest);

for (let u = 2; u <= USER_COUNT; u++) {
  const userDir = join(outDir, `user${String(u).padStart(2, "0")}`);
  writeFiles(userDir, mutate(referenceManifest, u));
}

const totalFiles = referenceManifest.length * USER_COUNT;
console.log(`Generated ${USER_COUNT} user folders (~${totalFiles} files total) at ${outDir}`);
console.log(`Reference: ${join(outDir, "reference")}`);
