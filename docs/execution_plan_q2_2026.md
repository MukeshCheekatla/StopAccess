# FocusGate Execution Plan Q2 2026
> Written: 25 Mar 2026
> Scope: practical build order for turning the current codebase into a launchable product

---

## Planning Rules

- Focus on features that improve trust, activation, and retention first.
- Prefer shipping complete vertical slices over partial infrastructure.
- Every phase should leave the product in a better usable state.
- Avoid starting cloud or premium work before local reliability is solid.

---

## Phase A: Reliability Sprint
**Target:** 1-2 weeks

### Objectives
- make protection survive real-world device conditions
- remove silent failure modes

### Work items
- Add explicit sync state store:
  last sync time, last error, pending operation count, status enum
- Improve `nextdns.ts` with:
  retry/backoff, better error parsing, and unified response handling
- Extend `ruleEngine.ts` with:
  safe resume behavior, boot restore handling, and clearer separation between rule evaluation and sync
- Add boot recovery checks in Android:
  restart notifications or sync tasks after reboot
- Add persistent diagnostic entries for:
  rule evaluation, sync attempts, sync failures, reset events, focus start/end

### Deliverables
- visible sync health on Settings and Dashboard
- reproducible logs for every important enforcement action
- reliable re-entry after reboot

### Suggested files
- `src/api/nextdns.ts`
- `src/engine/ruleEngine.ts`
- `src/services/logger.ts`
- `src/store/storage.ts`
- `android/app/src/main/java/com/focusgate/BootReceiver.kt`

---

## Phase B: Activation Sprint
**Target:** 1 week

### Objectives
- reduce setup abandonment
- create first-success experience quickly

### Work items
- Build onboarding checklist state
- Add "first rule" flow with recommended apps and starter presets
- Add DNS verification action and clearer failure messages
- Add notification-permission request into onboarding
- Improve empty states across dashboard, apps, and schedule screens

### Deliverables
- user can complete setup without leaving the app confused
- user gets a clear success state after first working configuration

### Suggested files
- `src/screens/OnboardingScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/AppsScreen.tsx`
- `src/screens/DashboardScreen.tsx`

---

## Phase C: Diagnostics And Trust Sprint
**Target:** 1 week

### Objectives
- help users self-diagnose issues
- reduce support burden

### Work items
- Add "Protection Health" card:
  config ok, DNS active, permission ok, last sync ok
- Add test-block tool:
  attempt a known test domain and log result path
- Expand logs screen filters:
  sync, permission, focus, schedule, rule changes
- Add copy/export logs action for debugging

### Deliverables
- a user can answer "is FocusGate working right now?" from inside the app

### Suggested files
- `src/screens/SettingsScreen.tsx`
- `src/services/logger.ts`
- `src/api/nextdns.ts`

---

## Phase D: Commitment Features Sprint
**Target:** 1 week

### Objectives
- strengthen anti-bypass behavior
- support serious users with higher-friction modes

### Work items
- Finish Guardian PIN coverage for all sensitive actions
- Add Strict Mode cooldown logic
- Add emergency override flow with friction and logging
- Add warning when permissions or DNS protection are disabled

### Deliverables
- strong mode that feels materially different from standard screen-time controls

### Suggested files
- `src/screens/SettingsScreen.tsx`
- `src/screens/AppsScreen.tsx`
- `src/engine/ruleEngine.ts`
- `src/store/storage.ts`

---

## Phase E: Insights Sprint
**Target:** 1-2 weeks

### Objectives
- increase retention with visible progress
- make the app useful beyond blocking

### Work items
- Store daily snapshots
- Build weekly trends screen or dashboard section
- Show block count, time saved estimate, and streaks
- Add simple presets:
  deep work, sleep, social detox

### Deliverables
- dashboard becomes a progress surface, not only a monitoring surface

### Suggested files
- `src/modules/usageStats.ts`
- `src/screens/DashboardScreen.tsx`
- `src/screens/FocusScreen.tsx`
- `src/types/index.ts`

---

## Phase F: Launch Sprint
**Target:** 1 week

### Objectives
- make the app shippable outside the dev environment

### Work items
- release signing and build docs
- privacy policy and permissions explanation
- Play Store listing assets
- support email / issue channel
- minimal product analytics
- crash reporting integration

### Deliverables
- internal release candidate
- repeatable release checklist

### Suggested files
- `README.md`
- `docs/release_checklist.md`
- Android release config files

---

## Acceptance Criteria By Milestone

### Milestone 1: Trust
- lint, tests, and Android debug build stay green
- app can explain sync failures
- reboot does not leave protection in a broken unknown state

### Milestone 2: Activation
- new user can reach first successful block in one session
- setup blockers are surfaced with clear next actions

### Milestone 3: Retention
- users can view trends and daily summaries
- app gives value even on days without hard blocks

### Milestone 4: Launch
- release build process is documented and repeatable
- support and privacy surfaces exist

---

## Recommended Next Build Order

1. Sync state + diagnostics foundation
2. Onboarding checklist + first-rule wizard
3. DNS health and test-block tooling
4. Strict mode and guardian coverage
5. Daily/weekly insights
6. Release checklist and store prep

---

## Definition Of Done For "Real Product"

We can call FocusGate a real product when:
- a new user can set it up and experience a successful block quickly
- the app clearly shows whether protection is active
- rules survive normal device lifecycle events
- the user has meaningful reasons to return daily
- the app is documented and packaged for release
