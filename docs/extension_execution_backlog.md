# Extension Execution Backlog
> Updated: 30 Mar 2026
> Scope: concrete extension-first build order, with emphasis on getting to a stable and usable product surface quickly

## Purpose

This file is the working backlog for the browser extension.
It turns the extension product plan into an ordered list of implementation priorities.

The backlog is grouped into:

- `Now`: work that is blocking extension reliability or usefulness
- `Next`: work that improves the extension into a real daily-use surface
- `Later`: work that should wait until the foundation is stronger

## Now

### 1. Finish typed NextDNS exports

Problem:
the extension background adapter depends on shared API functions that have drifted or disappeared.

Why it matters:
if these functions are undefined at runtime, the extension may build but fail during actual user actions.

Main work:

- align `packages/core/src/api.ts` exports with extension callers
- align `packages/core/src/index.ts` barrel exports
- make return types explicit for empty-body success responses
- remove stale call sites or rename them coherently

Likely files:

- `packages/core/src/api.ts`
- `packages/core/src/index.ts`
- `extension/src/background/platformAdapter.js`

### 2. Finish sync-state persistence

Problem:
the extension needs stable local knowledge of what it last asked NextDNS to do and what actually succeeded.

Why it matters:
without this, the UI can show toggles that look correct while the remote profile is different.

Main work:

- store last sync attempt time
- store last sync success time
- store last error summary
- store last-known service states

Likely files:

- `packages/state/src/sync.ts`
- `extension/src/background/index.js`
- `extension/src/screens/DashboardScreen.js`

### 3. Add a real connection test button

Problem:
users can enter credentials but still not know whether the profile is reachable and usable.

Main work:

- add a settings action that calls a lightweight profile endpoint
- show success, unauthorized, missing profile, and network-failure states separately
- log the result in recent actions

Likely files:

- `extension/src/screens/SettingsScreen.js`
- `packages/core/src/api.ts`

### 4. Add a recent actions feed

Problem:
the extension currently has weak trust feedback.

Main work:

- log service toggles
- log focus start/stop
- log sync success/failure
- log connection tests

Likely files:

- `extension/src/screens/DashboardScreen.js`
- `extension/src/background/index.js`
- `packages/state/src/history.ts`

### 5. Add recommended distractions in Apps

Problem:
raw toggles alone are functional but not productized.

Main work:

- curate a default list using the NextDNS parental-control service set
- add search and grouping
- highlight popular targets such as Instagram, YouTube, Reddit, TikTok, Discord, ChatGPT, Zoom, Spotify

Likely files:

- `extension/src/lib/appCatalog.js`
- `extension/src/screens/AppsScreen.js`

## Next

### 1. Improve Insights

Build a lightweight insights surface using:

- recent blocked services
- recent blocked domains
- simple counts over time

### 2. Improve presets

Add a small set of strong, understandable presets such as:

- Deep Work
- Social Detox
- Study Session
- Sleep Wind-Down

### 3. Improve onboarding

Add a first-run path that explains:

- what the extension can do on its own
- what requires NextDNS
- how profile-wide toggles differ from browser-only blocking

### 4. Add export/import

Let users export local preset/state configuration later, once the model is stable.

### 5. Strengthen scope messaging

Every place that controls NextDNS profile-wide state should include clearer, repeated copy about the scope of the action.

## Later

### 1. Better multi-device reconciliation

Eventually the extension should handle drift between:

- extension local state
- Android state
- remote NextDNS profile state

### 2. Shared rule packs

Later we can support curated packs such as:

- Creator mode
- Exam mode
- Zero-social mode

### 3. Additional browser support

Only pursue this after the current Chrome-based architecture is stable and the shared code boundaries are clean enough to reuse.

## First Files To Touch

If work needs to start immediately, begin with:

1. `packages/core/src/api.ts`
2. `packages/core/src/index.ts`
3. `extension/src/background/platformAdapter.js`
4. `extension/src/screens/SettingsScreen.js`
5. `extension/src/screens/AppsScreen.js`
6. `extension/src/screens/DashboardScreen.js`

## Definition Of Done For Extension Baseline

The extension reaches a healthy baseline when:

- login and profile setup are understandable
- service toggles hit real NextDNS state reliably
- the UI clearly separates browser-only and profile-wide behavior
- recent actions and health are visible
- the extension feels like a real product surface, not only a developer tool
