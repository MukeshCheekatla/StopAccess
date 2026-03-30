/**
 * FocusGate Extension Build Script
 * Bundles src/ + packages/core into self-contained files Chrome can load.
 * Run: node build.js
 * Watch: node build.js --watch
 */
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

// Ensure dist folder exists
mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
mkdirSync(resolve(__dirname, 'dist/popup'), { recursive: true });

const baseConfig = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  logLevel: 'info',
  // Resolve workspaces directly to their single source of truth.
  alias: {
    '@focusgate/core': resolve(__dirname, '../packages/core/src'),
    '@focusgate/state': resolve(__dirname, '../packages/state/src'),
    '@focusgate/sync': resolve(__dirname, '../packages/sync/src'),
    '@focusgate/types': resolve(__dirname, '../packages/types/src'),
    '@focusgate/ui': resolve(__dirname, '../packages/ui/src'),
  },
};

const builds = [
  // Service Worker
  {
    ...baseConfig,
    entryPoints: [resolve(__dirname, 'src/background/lifecycle.js')],
    outfile: resolve(__dirname, 'dist/background.js'),
  },
  // Popup
  {
    ...baseConfig,
    entryPoints: [resolve(__dirname, 'src/popup/popup.js')],
    outfile: resolve(__dirname, 'dist/popup/popup.js'),
  },
];

// Copy static files
function copyStatics() {
  const copies = [
    ['src/popup/popup.html', 'dist/popup/popup.html'],
    ['assets/icon.png', 'dist/assets/icon.png'],
    ['manifest.json', 'manifest.json'], // Root manifest must exist for loading from ROOT
  ];

  // Also copy to DIST for "load from dist" users
  try {
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(__dirname, 'dist/manifest.json'),
    );
  } catch (e) {}

  mkdirSync(resolve(__dirname, 'dist/assets'), { recursive: true });
  for (const [src, dst] of copies) {
    try {
      copyFileSync(resolve(__dirname, src), resolve(__dirname, dst));
    } catch (e) {
      console.warn(`Copy skipped: ${src} (${e.message})`);
    }
  }
  console.log('[FocusGate] Static files copied to dist/');
}

if (watch) {
  const contexts = await Promise.all(builds.map((c) => esbuild.context(c)));
  await Promise.all(contexts.map((c) => c.watch()));
  copyStatics();
  console.log('[FocusGate] Watching for changes...');
} else {
  await Promise.all(builds.map((c) => esbuild.build(c)));
  copyStatics();
  console.log('[FocusGate] Build complete → load extension/dist/ in Chrome');
}
