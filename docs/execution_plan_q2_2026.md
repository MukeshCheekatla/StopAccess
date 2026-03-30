# Execution Plan Q2 2026
> Updated: 30 Mar 2026
> Scope: practical build order for the next product cycle using the current monorepo

## Purpose

This file translates the product roadmap into execution order.
It is meant to answer:

- what should be built first
- what each phase is trying to prove
- which files or modules are likely to move
- what “done” looks like for each milestone

## Working Rules

- finish vertical slices, not disconnected feature fragments
- reduce silent failure before adding new complexity
- keep Android, extension, and shared packages in sync
- ship trust and activation improvements before premium ideas

## Phase A: Reliability Foundation

### Goal

Make Android enforcement, extension enforcement, and NextDNS sync predictable enough that the rest of the roadmap has something stable to build on.

### Why this comes first

The repo has already shown signs of drift between:

- shared package exports
- Android app imports
- extension background adapters
- local install state and build tooling

If this layer is unstable, onboarding, insights, and UI work will only sit on top of broken plumbing.

### Main work

- stabilize the shared NextDNS API surface in `packages/core/src/api.ts`
- align sync orchestration in `packages/sync/src/index.ts`
- settle sync persistence and last-known-state handling in `packages/state/src/sync.ts`
- harden Android recovery flows in `android/app/src/main/java/com/focusgate/BootReceiver.kt`
- improve structured logs and visible sync diagnostics across app and extension

### Likely files

- `packages/core/src/api.ts`
- `packages/core/src/index.ts`
- `packages/sync/src/index.ts`
- `packages/state/src/sync.ts`
- `src/api/nextdns.ts`
- `src/services/logger.ts`
- `extension/src/background/platformAdapter.js`
- `extension/src/background/index.js`

### Exit criteria

- shared API exports are coherent and typed
- manual sync works again from both Android and extension
- sync status has meaningful states such as idle, syncing, success, error
- recent sync failures are user-visible instead of silent

## Phase B: Activation And Setup

### Goal

Make the product feel understandable and usable during the first session.

### Main work

- strengthen onboarding in `src/screens/OnboardingScreen.tsx`
- improve settings clarity in `src/screens/SettingsScreen.tsx`
- add recommended targets and starter presets in `src/screens/AppsScreen.tsx`
- add first-success status cards on Android dashboard and extension popup
- make NextDNS connection steps clearer in both app and extension settings

### Likely files

- `src/screens/OnboardingScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/AppsScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- `extension/src/screens/SettingsScreen.js`
- `extension/src/screens/DashboardScreen.js`

### Exit criteria

- a new user can complete setup without outside instructions
- the app can clearly explain why blocking is not active
- browser-only and profile-wide modes are explained in plain language

## Phase C: Diagnostics And Trust

### Goal

Help users answer “is FocusGate working right now?” without leaving the product.

### Main work

- add a Protection Health summary on Android and in the extension
- add diagnostics for config health, permissions, DNS health, and last sync
- build a recent actions feed for rule changes, sync attempts, and enforcement events
- improve logs filtering and exportability for support/debugging

### Likely files

- `src/screens/SettingsScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/services/logger.ts`
- `src/api/nextdns.ts`
- `extension/src/screens/DashboardScreen.js`
- `extension/src/screens/SettingsScreen.js`
- `packages/state/src/sync.ts`

### Exit criteria

- a user can tell whether protection is active
- sync and permission failures are visible
- support/debugging no longer depends only on terminal logs

## Phase D: Commitment Features

### Goal

Make the product materially stronger for users who want real friction.

### Main work

- finish guardian coverage for sensitive actions
- add strict mode cooldown logic
- build an emergency override flow with explicit friction
- warn when key permissions or DNS protection are disabled

### Likely files

- `src/screens/SettingsScreen.tsx`
- `src/screens/AppsScreen.tsx`
- `src/engine/ruleEngine.ts`
- `src/store/storage.ts`
- `packages/types/src/index.ts`

### Exit criteria

- disabling or weakening protection requires deliberate action
- users can opt into stronger commitment without ambiguity

## Phase E: Insights And Retention

### Goal

Turn raw enforcement events into meaningful product value that keeps users coming back.

### Main work

- store daily snapshots and weekly summaries
- add top distractions, block counts, and trend views
- introduce saved-time estimate carefully and transparently
- add preset modes such as deep work, sleep, social detox

### Likely files

- `src/modules/usageStats.ts`
- `src/screens/DashboardScreen.tsx`
- `src/screens/FocusScreen.tsx`
- `extension/src/screens/InsightsScreen.js`
- `packages/types/src/index.ts`
- `packages/state/src/history.ts`

### Exit criteria

- a user can understand progress across days, not only right now
- the product offers value even when the user did not hit a hard block today

## Phase F: Launch Preparation

### Goal

Make the product releasable and supportable outside the current development flow.

### Main work

- stabilize release checklist and build steps
- polish privacy and permission explanations
- prepare app store listing assets and support materials
- define a minimum support/debugging workflow

### Likely files

- `README.md`
- `docs/release_checklist.md`
- `docs/privacy_policy.md`
- Android release config files
- extension packaging files

### Exit criteria

- release build process is documented and repeatable
- the product can be handed to an external tester without constant developer help

## Milestones

### Milestone 1: Trust baseline

Success means:

- core checks pass consistently
- the sync layer is coherent
- Android and extension both reflect real protection state

### Milestone 2: First-session success

Success means:

- a new user can reach a first block quickly
- setup blockers are clear and fixable from inside the product

### Milestone 3: Retention baseline

Success means:

- users can review progress and patterns
- dashboard and popup become return surfaces

### Milestone 4: Release candidate

Success means:

- release docs are stable
- privacy/support surfaces exist
- the app is understandable enough for outside testing

## Recommended Build Order

1. Fix shared API and sync mismatches.
2. Restore reliable Android and extension state visibility.
3. Improve onboarding and settings clarity.
4. Add protection-health and recent-actions surfaces.
5. Add commitment features.
6. Add insights and presets.
7. Finish release packaging and support docs.

## Definition Of Done For This Cycle

This cycle is successful when:

- the repo builds and runs from a clean install
- Android and extension both use the same shared logic where appropriate
- users can tell if FocusGate is working
- setup feels guided instead of technical
- the product can be shown to testers without constant hand-holding
