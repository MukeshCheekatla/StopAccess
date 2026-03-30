# Extension Recovery Plan

## Current State

The extension now has a basic structural verification script and a stable workspace shape, but it should be treated as a separate deliverable from the mobile app.

## Fixes Applied

- repaired broken popup/background import paths
- added reusable validation script:

```powershell
cmd /c npm run extension:check
```

- removed empty duplicate folders and dead workspace shells

## What To Check Before Shipping

1. Manifest references exist and point to real files.
2. Popup entry imports resolve correctly.
3. Background service worker imports resolve correctly.
4. Shared storage/api helpers still match the mobile app’s data model.

## Validation Workflow

### Structure check

```powershell
cmd /c npm run extension:check
```

### Extension build check

```powershell
cd extension
cmd /c npm run build
```

### Manual browser smoke test

1. Load `extension/` as an unpacked extension in Chrome.
2. Open popup.
3. Switch between Dashboard, Apps, and Settings.
4. Save a test NextDNS config.
5. Trigger a manual sync from the popup if exposed.
6. Confirm background service worker stays healthy in Chrome extension inspector.

## Next Product Work

1. Add a dedicated extension `check`/`build` CI step.
2. Add one shared domain/rule contract package test so mobile and extension do not drift.
3. Replace placeholder extension UI states with real sync/error visibility.
