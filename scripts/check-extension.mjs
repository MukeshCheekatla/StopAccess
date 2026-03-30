import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const extensionRoot = path.join(root, 'extension');
const manifestPath = path.join(extensionRoot, 'manifest.json');

function fail(message) {
  console.error(`Extension check failed: ${message}`);
  process.exit(1);
}

function collectJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, acc);
      continue;
    }
    if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function resolveImport(fromFile, specifier) {
  const candidate = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  if (fs.existsSync(`${candidate}.js`)) {
    return `${candidate}.js`;
  }
  return null;
}

if (!fs.existsSync(manifestPath)) {
  fail('manifest.json is missing');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
].filter(Boolean);

for (const relativeFile of manifestFiles) {
  const target = path.join(extensionRoot, relativeFile);
  if (!fs.existsSync(target)) {
    fail(`manifest references missing file: ${relativeFile}`);
  }
}

const importPattern =
  /import\s+(?:.+?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
for (const file of collectJsFiles(path.join(extensionRoot, 'src'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!resolveImport(file, specifier)) {
      fail(
        `missing relative import "${specifier}" referenced by ${path.relative(
          root,
          file,
        )}`,
      );
    }
  }
}

console.log('Extension check passed.');
