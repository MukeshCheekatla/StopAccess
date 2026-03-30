# FocusGate Master Plan
> Updated: 30 Mar 2026
> Scope: single source of truth for product direction, architecture, screens, execution order, release readiness, and recovery notes

## Purpose

This file replaces the scattered active docs set with one working document.

It should answer:

1. What FocusGate is trying to become.
2. What is already true in the repo right now.
3. What we should build next.
4. How Android, extension, shared packages, and NextDNS fit together.
5. How to recover, ship, and support the product.

The `docs/archive/` folder is still kept for history, but this file is the only active planning document.

## Product Definition

FocusGate should become a real commitment product for distraction control.

It should not behave like a generic screen-time tracker that only reports usage after the damage is done.
It should help users:

- choose the distractions that matter
- make their rules explicit
- enforce those rules with real friction
- understand clearly what is blocked, why, and where
- build a repeatable focus routine instead of relying on willpower

## Current Product Surfaces

### Android app

Current role:

- device-side app control
- usage-limit enforcement
- focus sessions and schedules
- permissions, diagnostics, and system-level state

Target role:

- the strong enforcement surface
- the place for stricter commitment tools such as guardian PIN and strict mode
- the place where users diagnose permission, sync, and protection-health issues

### Browser extension

Current role:

- fastest daily control surface
- easiest place to block websites and popular services
- easiest place to expose NextDNS toggles and real-time browser controls

Target role:

- the easiest daily-use product surface
- the clearest place to control browser-only vs profile-wide enforcement
- the best first-run activation point for many users

### Shared packages

Current role:

- shared API logic
- shared types
- sync coordination
- persistent state helpers
- domain/service mapping logic

Target role:

- the stable contract layer that keeps Android and extension aligned

## Product Principles

### Trust is a feature

Users must always be able to answer:

- Is protection active right now?
- What is blocked?
- Why is it blocked?
- Did sync succeed?
- If something is broken, what is broken?

### First successful block is the activation milestone

Installation is not activation.
The real activation moment is when the user sees a distracting app or site actually blocked in a way they understand.

### Strong modes must be explicit

Whenever FocusGate changes NextDNS profile-wide settings, the product must say so clearly.
Browser-only actions and profile-wide actions cannot feel identical in the UI.

### The product should help users return

Blocking alone creates friction.
The product also needs:

- insight
- progress visibility
- recent actions
- presets
- habit loops

## Current Architecture

### Monorepo shape

The repo currently centers around:

- root React Native app
- `extension/` for the browser extension
- `packages/core` for shared API/domain logic
- `packages/state` for state and persistence helpers
- `packages/sync` for sync orchestration
- `packages/types` for shared contracts

### Important product dependencies

- React Native for Android app
- Chrome extension runtime for browser control
- NextDNS API for remote blocking state and profile-wide enforcement

### Current enforcement model

FocusGate now supports three conceptual enforcement layers:

1. Browser-only:
   extension local blocking via browser controls
2. Hybrid:
   browser controls plus targeted NextDNS updates
3. Profile-wide:
   browser controls plus NextDNS services, categories, and denylist changes

## NextDNS Model

### Why NextDNS matters

NextDNS is what gives FocusGate stronger enforcement beyond local UI toggles.
It allows the product to:

- block known services with a simple toggle
- push denylist rules to the DNS layer
- inspect logs and analytics later
- coordinate stronger rules across devices

### What the product should use NextDNS for

- `parentalControl.services` for popular services like TikTok, Instagram, YouTube, Reddit, Discord, ChatGPT, Zoom, Spotify
- `parentalControl.categories` for broader modes later
- `denylist` for targeted custom domains
- profile fetch / connection test for setup validation
- logs / analytics for diagnostics and future insights

### Scope warning

NextDNS services and categories are profile-wide.
That means toggling them may affect:

- the current browser
- Android devices using the same profile
- any other device on that profile

This must always be explained in-product.

## Current User Flows

### Android primary flow

1. Install app.
2. Grant permissions.
3. Connect NextDNS if desired.
4. Add distracting apps or limits.
5. Start a focus session or rely on daily limits.
6. Review dashboard and diagnostics when something looks wrong.

### Extension primary flow

1. Load extension.
2. Enter NextDNS credentials if using remote enforcement.
3. Toggle common distracting services.
4. Start browser-only or stronger focus mode.
5. Review recent actions and health.

## Screen Plan

### Android Dashboard

Should show:

- protection health
- current active rules
- current focus state
- sync status
- recent actions
- shortcut into setup fixes

### Android Apps

Should show:

- installed targets
- current rule mode
- time used vs limit
- blocked-today state
- recommended distractors later

### Android Focus

Should show:

- active focus session
- time remaining
- affected apps/domains
- quick presets later

### Android Schedule

Should show:

- active schedules
- next trigger
- exceptions or override state

### Android Insights

Should show later:

- daily summary
- weekly trends
- top distractions
- time saved estimate

### Android Settings

Should show:

- permission health
- NextDNS connection state
- manual sync controls
- guardian PIN / strict mode
- logs and diagnostics

### Extension Dashboard

Should show:

- current mode
- current health
- quick focus toggle
- last sync result
- recent actions

### Extension Apps / Services

Should show:

- recommended services
- recognizable icons
- search
- toggle state
- enforcement scope

### Extension Focus

Should show:

- active session
- scope selection
- current affected services

### Extension Insights

Should show:

- recent blocked items
- simple counts
- top blocked services later

### Extension Settings

Should show:

- profile ID / API key state
- connection test
- sync health
- enforcement-mode explanation

## UI Direction

### General UI rules

- state must be visible
- dangerous scope changes must be explicit
- error states must be actionable
- icons and service names should feel recognizable and productized

### Extension-specific UI rules

- think in services, not raw DNS internals
- label profile-wide actions clearly
- show loading, success, and failure for every toggle
- use app/service branding where possible

### Android-specific UI rules

- avoid burying health in logs only
- make setup blockers visible on the main surfaces
- show strict-mode and guardian effects clearly

## Shared Package Responsibilities

### `packages/core`

Should own:

- typed NextDNS calls
- domain/service maps
- reusable API behavior

### `packages/state`

Should own:

- sync state
- recent action history
- last-known remote state helpers

### `packages/sync`

Should own:

- orchestration between UI intents and remote updates
- retry and error handling
- mode-aware sync behavior

### `packages/types`

Should own:

- shared DTOs
- service/rule/sync types
- stable cross-surface contracts

## Current Strengths

- lint passes
- typecheck passes
- tests pass
- extension verification passes
- extension build succeeds
- docs are now organized enough to consolidate cleanly

## Current Weak Spots

- product scope can still confuse users when profile-wide actions are involved
- Android lifecycle and protection-health trust still need polishing
- insights are still early
- release/support posture is not mature enough yet for a wider launch

## Execution Order

### Phase 1: Reliability

Main goal:
stabilize shared API, sync, and visible health state.

Priority work:

- keep shared exports coherent
- preserve last-known sync state
- improve Android recovery and diagnostics
- improve extension runtime trust feedback

### Phase 2: Activation

Main goal:
make setup fast, obvious, and successful for first-time users.

Priority work:

- onboarding
- connection test
- starter targets
- first-success messaging

### Phase 3: Trust And Explainability

Main goal:
help users understand whether FocusGate is actually working.

Priority work:

- protection health surfaces
- recent actions
- better failure messaging
- clearer scope labels

### Phase 4: Commitment Features

Main goal:
make the product harder to casually bypass.

Priority work:

- strict mode
- guardian PIN
- emergency override with friction
- tamper warnings

### Phase 5: Insights And Retention

Main goal:
make users want to return even when they are not actively debugging or blocking.

Priority work:

- daily/weekly summaries
- top distractions
- trends
- presets

### Phase 6: Launch Readiness

Main goal:
make the repo and product shippable to real users.

Priority work:

- release checklist hardening
- privacy/support material
- basic support flows
- packaging and QA discipline

## Extension-First Backlog

### Now

- finish any remaining shared API polish for service toggles
- keep sync-state persistence visible and reliable
- keep connection test behavior clear
- improve recent actions quality
- improve recommended-service catalog

### Next

- richer insights
- better presets
- better onboarding
- stronger browser-only vs profile-wide messaging

### Later

- multi-device reconciliation
- shared rule packs
- broader browser support

## Android Backlog

### Now

- protect the current settings/diagnostics experience
- improve dashboard protection-health clarity
- keep app-rule enforcement understandable

### Next

- onboarding flow
- better first-rule guidance
- stronger focus and schedule UX

### Later

- richer insights
- polished anti-bypass flows
- premium-depth features if trust is strong

## Release And Support Requirements

Before treating FocusGate as launch-ready, the product needs:

- repeatable release flow
- privacy copy that matches actual behavior
- support/troubleshooting instructions
- clear permission explanations
- store assets and screenshots

## Recovery Notes

### If Android stops working

Check:

- Gradle wrapper and Java version
- Metro vs `run-android` split
- emulator/device visibility in `adb devices`
- NextDNS credentials and permission health in app settings

### If extension stops working

Check:

- extension build output
- background/runtime logs
- connection test result
- last sync state
- whether the action was browser-only or profile-wide

## FAQ Summary

### What is strict mode?

A higher-friction mode that delays or complicates impulsive disabling.

### What is guardian PIN?

An optional PIN protecting sensitive settings and overrides.

### What is hybrid mode?

Local browser enforcement plus targeted NextDNS sync.

### Why can one toggle affect other devices?

Because some NextDNS settings are profile-wide, not local-only.

## Privacy Position

FocusGate should stay conservative in its privacy posture.

Core principle:

- collect only what the product needs to enforce, explain, and improve focus

User-facing expectations:

- explain permissions plainly
- explain what uses NextDNS
- explain what stays local vs what becomes remote profile state

## Definition Of Done For “Real Product”

FocusGate becomes a real product when:

- setup leads quickly to a first successful block
- Android and extension both clearly show protection health
- sync failures are visible and diagnosable
- strong modes feel materially stricter than default platform tools
- users get insight and value beyond raw blocking
- release and support flows are documented

## File-Level Focus Areas

### Android app

- `src/screens/DashboardScreen.tsx`
- `src/screens/AppsScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/store/storageAdapter.ts`
- `src/engine/ruleEngine.ts`

### Extension

- `extension/src/screens/DashboardScreen.js`
- `extension/src/screens/AppsScreen.js`
- `extension/src/screens/SettingsScreen.js`
- `extension/src/background/platformAdapter.js`
- `extension/src/background/dnrAdapter.js`
- `extension/src/popup/popup.js`

### Shared packages

- `packages/core/src/api.ts`
- `packages/core/src/domains.ts`
- `packages/state/src/sync.ts`
- `packages/sync/src/index.ts`
- `packages/sync/src/syncAdapter.ts`
- `packages/types/src/index.ts`

## Archive Rule

Everything historical stays in `docs/archive/`.
That folder may contain:

- completed work
- partially completed but superseded work
- outdated snapshots

It is for history only, not current planning.

## One-Sentence Direction

FocusGate should become the product people use when they want their digital limits to be real, understandable, and hard to casually bypass.
