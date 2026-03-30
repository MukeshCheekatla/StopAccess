# Extension Recovery Plan
> Updated: 30 Mar 2026

## Use This File For

- extension load failures
- popup build problems
- service worker problems
- bad NextDNS toggle behavior

## Core Verification

### Structure

```powershell
cmd /c npm run extension:check
```

### Build

```powershell
cmd /c npm --workspace extension run build
```

### Manual smoke test

1. Load `extension/` as unpacked
2. Open popup
3. Switch all pages
4. Save NextDNS config
5. Toggle a service
6. Confirm background worker stays healthy

## Common Failure Modes

- bad shared package exports
- popup imports drifting from package APIs
- NextDNS functions existing in UI but not exported from shared core
- service-worker lifecycle resets

## Recovery Order

1. run structure check
2. run extension build
3. inspect platform adapter and shared core exports
4. manually load unpacked extension
