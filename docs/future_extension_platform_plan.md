# Future Extension Platform Plan
> Scope: Chrome extension growth beyond the current workable baseline

## Current Baseline

- popup builds successfully
- shared packages resolve cleanly
- browser domain blocks work
- NextDNS services/categories can be toggled

## Next Goals

### 1. Better Browser Enforcement

- expand DNR rule generation to include common subdomain patterns
- support preset packs:
  short video, social, gaming, shopping, adult content
- show exact rule count and recent DNR updates

### 2. Better NextDNS Productization

- show which toggles are browser-only vs profile-wide
- let users preview the impact before enabling profile-wide blocks
- add “sync from NextDNS” and “push to NextDNS” actions explicitly

### 3. Better Icons And Metadata

- keep local curated icon metadata for major services
- fallback gracefully when remote icon source fails
- optionally add logos for top domains and recommended targets

### 4. Better Insights

- top blocked services
- top blocked domains
- recent sessions by distraction source
- time saved estimate

### 5. Better UX

- onboarding inside the popup
- permission/help panel
- focus presets
- warning banners when using a shared NextDNS profile

## Longer-Term Ideas

- Firefox support if architecture stays portable
- companion web dashboard for rule management
- import/export of presets
- shared rule packs

## Delivery Order

1. Browser and profile-wide state clarity
2. Better presets and recommendations
3. Better insights
4. Better onboarding and exports
