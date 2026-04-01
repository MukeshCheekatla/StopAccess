/**
 * FocusGate Extension Build Script
 * Generates an optimized distribution with correct internal wiring.
 */
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const SRC_DIR = resolve(__dirname, 'src');
const DIST_DIR = resolve(__dirname, 'dist');

// Ensure directories
mkdirSync(DIST_DIR, { recursive: true });
mkdirSync(resolve(DIST_DIR, 'popup'), { recursive: true });
mkdirSync(resolve(DIST_DIR, 'assets'), { recursive: true });

const baseConfig = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  logLevel: 'info',
  alias: {
    '@focusgate/core': resolve(__dirname, '../packages/core/src'),
    '@focusgate/state': resolve(__dirname, '../packages/state/src'),
    '@focusgate/sync': resolve(__dirname, '../packages/sync/src'),
    '@focusgate/types': resolve(__dirname, '../packages/types/src'),
  },
};

async function build() {
  console.log('[FocusGate] Starting professional build...');

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
      entryPoints: [resolve(SRC_DIR, 'popup/popup.ts')],
      outfile: resolve(DIST_DIR, 'popup/popup.js'),
    }),
    // Dashboard App
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'dashboard/dashboard.ts')],
      outfile: resolve(DIST_DIR, 'dashboard.js'),
    }),
    // Content Script (SPA blocker)
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'background/contentScript.ts')],
      outfile: resolve(DIST_DIR, 'contentScript.js'),
      format: 'iife', // Content scripts must be IIFE
    }),
    // Blocked page logic
    esbuild.build({
      ...baseConfig,
      entryPoints: [resolve(SRC_DIR, 'blocked/blocked.ts')],
      outfile: resolve(DIST_DIR, 'blocked.js'),
      format: 'iife',
    }),
  ]);

  // Wiring and Static Assets
  const statics = [
    ['src/popup/popup.html', 'dist/popup/popup.html'],
    ['src/dashboard/index.html', 'dist/dashboard.html'],
    ['src/blocked/blocked.html', 'dist/blocked.html'],
    ['assets/icon.png', 'dist/assets/icon.png'],
  ];

  for (const [src, dst] of statics) {
    try {
      copyFileSync(resolve(__dirname, src), resolve(__dirname, dst));
    } catch (e) {
      console.warn(`[Build] Could not copy ${src} to ${dst}: ${e.message}`);
    }
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

    if (
      rawManifest.web_accessible_resources &&
      rawManifest.web_accessible_resources[0]
    ) {
      rawManifest.web_accessible_resources[0].resources = ['blocked.html'];
    }

    // Save the re-mapped manifest into dist/
    writeFileSync(
      resolve(DIST_DIR, 'manifest.json'),
      JSON.stringify(rawManifest, null, 2),
    );
    console.log('[FocusGate] Manifest re-mapped correctly for distribution.');
  } catch (e) {
    console.error(`[Build] Manifest re-mapping failed: ${e.message}`);
  }

  console.log('[FocusGate] Build complete.');
  console.log(
    '>>> IMPORTANT: Load the "dist" folder in chrome://extensions <<<',
  );
}

build().catch((err) => {
  console.error('[FocusGate] Build failed:', err);
  process.exit(1);
});
