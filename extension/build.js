/**
 * StopAccess Extension Build Script
 * Generates an optimized distribution with correct internal wiring.
 */
import * as esbuild from 'esbuild';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- SIMPLE ENV LOADER ---
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Paths
const SRC_DIR = resolve(__dirname, 'src');
const DIST_DIR = resolve(__dirname, 'dist');

// Ensure directories
rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });
mkdirSync(resolve(DIST_DIR, 'popup'), { recursive: true });
mkdirSync(resolve(DIST_DIR, 'blocked'), { recursive: true });
mkdirSync(resolve(DIST_DIR, 'assets'), { recursive: true });

const baseConfig = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  logLevel: 'info',
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    // Supabase credentials — set these in your .env before building
    __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || ''),
    __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  },
  alias: {
    '@stopaccess/core': resolve(__dirname, '../packages/core/src'),
    '@stopaccess/state': resolve(__dirname, '../packages/state/src'),
    '@stopaccess/sync': resolve(__dirname, '../packages/sync/src'),
    '@stopaccess/types': resolve(__dirname, '../packages/types/src'),
  },
};

async function build() {
  console.log('[StopAccess] Starting professional build...');

  await Promise.all([
    // Service Worker
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'background/lifecycle.ts')],
      outfile: resolve(DIST_DIR, 'background.js'),
    }),
    // Popup App
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'popup/popup.tsx')],
      outfile: resolve(DIST_DIR, 'popup/popup.js'),
    }),
    // Dashboard App
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'dashboard/dashboard.tsx')],
      outfile: resolve(DIST_DIR, 'dashboard.js'),
    }),
    // Content Script (SPA blocker)
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'background/contentScript.ts')],
      outfile: resolve(DIST_DIR, 'contentScript.js'),
      format: 'iife', // Content scripts must be IIFE
    }),
    // Dedicated Block Screen (DNS Hard Mode)
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'blocked/blocked.ts')],
      outfile: resolve(DIST_DIR, 'blocked/blocked.js'),
    }),
  ]);

  // Wiring and Static Assets
  const statics = [
    ['src/popup/popup.html', 'dist/popup/popup.html'],
    ['src/dashboard/index.html', 'dist/dashboard.html'],
    ['src/blocked/blocked.html', 'dist/blocked/blocked.html'],
    ['assets/icon.png', 'dist/assets/icon.png'],
    ['assets/icon-16.png', 'dist/assets/icon-16.png'],
    ['assets/icon-32.png', 'dist/assets/icon-32.png'],
    ['assets/icon-48.png', 'dist/assets/icon-48.png'],
    ['assets/icon-96.png', 'dist/assets/icon-96.png'],
    ['assets/icon-128.png', 'dist/assets/icon-128.png'],
  ];

  for (const [src, dst] of statics) {
    try {
      copyFileSync(resolve(__dirname, src), resolve(__dirname, dst));
    } catch (e) {
      console.warn(`[Build] Could not copy ${src} to ${dst}: ${e.message}`);
    }
  }

  // --- LOCALES COPY ---
  try {
    const localeDir = resolve(__dirname, '_locales');
    if (existsSync(localeDir)) {
      const distLocaleDir = resolve(DIST_DIR, '_locales');
      const lang = 'en'; // Current default
      const langSrc = resolve(localeDir, lang);
      const langDest = resolve(distLocaleDir, lang);

      if (existsSync(langSrc)) {
        mkdirSync(langDest, { recursive: true });
        copyFileSync(
          resolve(langSrc, 'messages.json'),
          resolve(langDest, 'messages.json'),
        );
        console.log(`[Build] Copied ${lang} locales.`);
      }
    }
  } catch (e) {
    console.warn(`[Build] Locales copy failed: ${e.message}`);
  }

  // --- MANIFEST RE-MAPPING FOR DIST FOLDER ---
  try {
    const rawManifest = JSON.parse(
      readFileSync(resolve(__dirname, 'manifest.json'), 'utf8'),
    );

    // Adjust paths so they are relative to the 'dist' folder root
    rawManifest.background.service_worker = 'background.js';
    rawManifest.action.default_popup = 'popup/popup.html';

    if (rawManifest.content_scripts && rawManifest.content_scripts[0]) {
      rawManifest.content_scripts[0].js = ['contentScript.js'];
    }

    // Save the re-mapped manifest into dist/
    writeFileSync(
      resolve(DIST_DIR, 'manifest.json'),
      JSON.stringify(rawManifest, null, 2),
    );
    console.log('[StopAccess] Manifest re-mapped correctly for distribution.');
  } catch (e) {
    console.error(`[Build] Manifest re-mapping failed: ${e.message}`);
  }

  console.log('[StopAccess] Build complete.');
  console.log(
    '>>> IMPORTANT: Load the "dist" folder in chrome://extensions <<<',
  );
}

build().catch((err) => {
  console.error('[StopAccess] Build failed:', err);
  process.exit(1);
});
