# Extension Execution Backlog
> Written: 29 Mar 2026
> Goal: give a buildable order of work for the next implementation sprint

---

## Sprint 1

### 1. Stabilize the extension runtime

- make popup imports and background imports final
- ensure `npm run extension:check` passes
- ensure `extension/build.js` produces a loadable unpacked extension
- add one command in root README for loading extension in Chrome

### 2. Unify extension storage contract

- define canonical storage keys
- ensure popup, background, and shared services use same keys
- remove duplicate state transforms in popup/background

### 3. Add browser-only block engine

- map rule list to DNR dynamic rules
- support add, toggle, delete for custom domains
- show active block count on dashboard

### Deliverable

- unpacked extension works
- browser-only blocking works for custom domains

---

## Sprint 2

### 1. Build focus mode for browser

- start focus session
- stop focus session
- countdown persistence
- auto-apply local browser block rules during session

### 2. Add diagnostics panel

- NextDNS configured / not configured
- last sync success
- last sync failure
- local DNR rule count
- current mode: browser-only / profile-wide

### 3. Add connection test UX

- save API key/profile ID
- test connection action
- clear error messaging

### Deliverable

- browser focus mode is reliable
- diagnostics explain current state

---

## Sprint 3

### 1. Integrate NextDNS denylist sync

- push custom blocked domains to denylist
- pull existing denylist state where useful
- keep browser rules and denylist changes explainable

### 2. Integrate parental control services

- fetch services list from profile
- support toggling service rules
- mark these as profile-wide

### 3. Integrate parental control categories

- fetch categories list
- support toggling category rules
- add warning copy before enabling profile-wide categories

### Deliverable

- hybrid blocking mode works
- service/category rules are available in UI

---

## Sprint 4

### 1. Insights

- blocked request count
- most blocked domains
- recent focus sessions
- latest NextDNS log highlights

### 2. Logs and audit trail

- local event log
- sync events
- rule changes
- emergency unblock events

### 3. Presets

- social detox
- deep work
- video blackout
- late-night shutdown

### Deliverable

- extension starts feeling like a complete product

---

## Sprint 5

### 1. Safety and trust

- emergency unblock flow
- profile-wide warning banners
- explicit explanation of what affects all devices

### 2. Polish

- clean empty states
- onboarding
- keyboard-safe popup UX
- store listing preparation

### 3. Release checks

- extension structural check
- extension build check
- manual browser smoke checklist

### Deliverable

- launch-ready beta extension

---

## Parallel Mobile Work

While extension work moves, keep Android limited to:

- build stability
- shared rules/types/core package maintenance
- diagnostics parity

Do not expand Android feature scope until extension MVP is solid.

---

## First Files To Touch

### Extension runtime

- `extension/src/background/lifecycle.js`
- `extension/src/background/platformAdapter.js`
- `extension/src/popup/popup.js`

### Extension UI

- `extension/src/screens/DashboardScreen.js`
- `extension/src/screens/AppsScreen.js`
- `extension/src/screens/SettingsScreen.js`

### Shared packages

- `packages/core/src/api.ts`
- `packages/core/src/engine.ts`
- `packages/state/src/rules.ts`
- `packages/state/src/schedules.ts`
- `packages/sync/src/index.ts`

---

## Immediate Next 5 Tasks

1. Add extension build verification to root scripts.
2. Build rule editor for `domain | service | category`.
3. Add DNR sync adapter for browser-only enforcement.
4. Add NextDNS services/categories fetch layer.
5. Add dashboard diagnostics and mode banner.
