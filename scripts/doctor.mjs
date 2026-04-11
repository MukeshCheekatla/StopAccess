import fs from 'fs';

/**
 * StopAccess Doctor — Workspace and RN Consistency Check
 */

console.log('StopAccess Doctor is checking your workspace health...\n');

try {
  // 1. Root package.json check
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const targetRN = pkg.dependencies['react-native'];
  console.log(`[Doctor] Target RN in package.json: ${targetRN}`);

  // 2. Installed node_modules check
  try {
    const installedRN = JSON.parse(
      fs.readFileSync('./node_modules/react-native/package.json', 'utf8'),
    ).version;
    console.log(`[Doctor] Installed RN in node_modules: ${installedRN}`);

    if (!targetRN.includes(installedRN)) {
      console.warn('\n[Doctor] ⚠️ WARNING: Version Mismatch detected!');
      console.warn(`Target: ${targetRN}, Installed: ${installedRN}`);
      console.warn('Run "npm install" to fix this.\n');
    } else {
      console.log('[Doctor] ✅ RN version matches.');
    }
  } catch (e) {
    console.error('[Doctor] ❌ React Native not found in node_modules.');
  }

  // 3. Extension build check
  try {
    if (fs.existsSync('./extension/dist/manifest.json')) {
      console.log('[Doctor] ✅ Extension dist exists.');
    } else {
      console.log(
        '[Doctor] ⚠️ Extension not built yet. Run "npm run verify:extension".',
      );
    }
  } catch (e) {}

  // 4. Android asset check
  if (fs.existsSync('./android/app/src/main/assets/index.android.bundle')) {
    console.log('[Doctor] ✅ Android assets bundled.');
  } else {
    console.log(
      '[Doctor] ⚠️ Android bundle missing. Run "npm run android:bundle" before release.',
    );
  }

  console.log('\n[Doctor] Health check finished.');
} catch (error) {
  console.error('[Doctor] ❌ Doctor failed:', error.message);
}
