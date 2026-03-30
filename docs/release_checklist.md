# Release Checklist
> Updated: 30 Mar 2026

## Shared Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`

## Android Checks

- debug build succeeds
- onboarding works
- settings save works
- one rule can be added
- one sync can be triggered

## Extension Checks

- `npm run extension:check`
- `npm --workspace extension run build`
- popup loads unpacked
- one NextDNS toggle works

## Release Discipline

- version bump
- smoke notes recorded
- docs updated when behavior changed
