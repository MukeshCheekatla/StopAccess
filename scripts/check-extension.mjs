import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const extensionRoot = path.join(root, 'extension');
const manifestPath = path.join(extensionRoot, 'manifest.json');
const privacyPath = path.join(extensionRoot, 'PRIVACY.md');

const expectedIconSizes = new Map([
  ['16', 16],
  ['32', 32],
  ['48', 48],
  ['128', 128],
]);

const sensitivePermissions = new Set([
  'history',
  'tabs',
  'webRequest',
  'cookies',
  'bookmarks',
  'downloads',
  'identity',
]);

const analyticsVendors = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'mixpanel.com',
  'api-js.mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'posthog.com',
  'plausible.io',
  'hotjar.com',
  'sentry.io',
  'browser-intake-datadoghq.com',
];

const analyticsPackages = [
  '@sentry/browser',
  '@sentry/react',
  '@segment/analytics-next',
  'amplitude-js',
  'mixpanel-browser',
  'posthog-js',
  'plausible-tracker',
  'web-vitals',
];

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

function collectSourceFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.turbo'
      ) {
        continue;
      }
      collectSourceFiles(fullPath, acc);
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx|js|mjs|html|json)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function getPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getCspDirective(policy, directiveName) {
  const directives = new Map();
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      continue;
    }
    directives.set(tokens[0], tokens.slice(1));
  }
  return directives.get(directiveName) ?? [];
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

if (manifest.manifest_version !== 3) {
  fail('manifest_version must be 3 for the current extension package');
}

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

for (const [sizeLabel, expectedSize] of expectedIconSizes) {
  const relativeFile = manifest.icons?.[sizeLabel];
  if (!relativeFile) {
    fail(`manifest.icons is missing required ${sizeLabel}x${sizeLabel} icon`);
  }

  const target = path.join(extensionRoot, relativeFile);
  const pngSize = getPngSize(target);
  if (!pngSize) {
    fail(`manifest icon must be a PNG file: ${relativeFile}`);
  }
  if (pngSize.width !== expectedSize || pngSize.height !== expectedSize) {
    fail(
      `manifest icon ${relativeFile} is ${pngSize.width}x${pngSize.height}; expected ${expectedSize}x${expectedSize}`,
    );
  }
}

for (const [sizeLabel, relativeFile] of Object.entries(
  manifest.action?.default_icon ?? {},
)) {
  const expectedSize = Number(sizeLabel);
  const target = path.join(extensionRoot, relativeFile);
  const pngSize = getPngSize(target);
  if (!pngSize) {
    fail(`action.default_icon must be a PNG file: ${relativeFile}`);
  }
  if (pngSize.width !== expectedSize || pngSize.height !== expectedSize) {
    fail(
      `action.default_icon ${relativeFile} is ${pngSize.width}x${pngSize.height}; expected ${expectedSize}x${expectedSize}`,
    );
  }
}

const extensionPagesCsp =
  manifest.content_security_policy?.extension_pages ??
  "script-src 'self'; object-src 'self';";
const scriptSrc = getCspDirective(extensionPagesCsp, 'script-src');
if (!scriptSrc.includes("'self'")) {
  fail("content_security_policy.extension_pages script-src must include 'self'");
}
for (const source of scriptSrc) {
  if (
    source === "'unsafe-eval'" ||
    source === "'unsafe-inline'" ||
    /^https?:/i.test(source)
  ) {
    fail(
      `content_security_policy.extension_pages has disallowed script-src value: ${source}`,
    );
  }
}

const objectSrc = getCspDirective(extensionPagesCsp, 'object-src');
if (!objectSrc.includes("'self'")) {
  fail("content_security_policy.extension_pages object-src must include 'self'");
}

const connectSrc = getCspDirective(extensionPagesCsp, 'connect-src');
for (const source of connectSrc) {
  if (/^http:/i.test(source)) {
    fail(`connect-src must not use insecure HTTP: ${source}`);
  }
}

const remoteCodePatterns = [
  /<script\b[^>]*\bsrc=["']https?:\/\//i,
  /import\s*\(\s*["']https?:\/\//i,
  /(?:^|[^\w@])import\s+[^'"]*["']https?:\/\//i,
  /importScripts\s*\(\s*["']https?:\/\//i,
  /new\s+Worker\s*\(\s*["']https?:\/\//i,
  /new\s+Function\s*\(/i,
  /\beval\s*\(/i,
  /set(?:Timeout|Interval)\s*\(\s*["'`]/i,
];

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

for (const file of collectSourceFiles(extensionRoot)) {
  const relativeFile = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of remoteCodePatterns) {
    if (pattern.test(source)) {
      fail(
        `possible remote or dynamic executable code in ${relativeFile}; bundle extension code locally`,
      );
    }
  }
  for (const vendor of analyticsVendors) {
    if (source.toLowerCase().includes(vendor)) {
      fail(
        `analytics/telemetry vendor "${vendor}" found in ${relativeFile}; disclose and explicitly allow it before shipping`,
      );
    }
  }
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'),
);
const allDependencies = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
for (const packageName of analyticsPackages) {
  if (Object.hasOwn(allDependencies, packageName)) {
    fail(
      `analytics dependency "${packageName}" is installed; disclose and explicitly allow it before shipping`,
    );
  }
}

const requestedPermissions = new Set(manifest.permissions ?? []);
const requestedSensitivePermission = [...requestedPermissions].some((p) =>
  sensitivePermissions.has(p),
);
const hasBroadHostAccess = (manifest.host_permissions ?? []).includes(
  '<all_urls>',
);
if (requestedSensitivePermission || hasBroadHostAccess) {
  if (!fs.existsSync(privacyPath)) {
    fail(
      'extension/PRIVACY.md is required because the manifest requests sensitive browsing permissions',
    );
  }

  const privacy = fs.readFileSync(privacyPath, 'utf8').toLowerCase();
  const requiredPrivacyTopics = [
    'browsing activity',
    'nextdns',
    'analytics',
    'third parties',
    'local',
  ];
  for (const topic of requiredPrivacyTopics) {
    if (!privacy.includes(topic)) {
      fail(`extension/PRIVACY.md must mention "${topic}"`);
    }
  }
}

console.log('Extension check passed.');
