# FocusGate Product Roadmap 2026
> Written: 25 Mar 2026
> Goal: turn FocusGate from a working prototype into a durable Android product people trust daily

---

## Product Positioning

**FocusGate is not just a timer app.**
It should become a **commitment device** for people who want their app limits to actually hold.

### Core promise
- Pick the apps that derail you.
- Set clear rules once.
- Let FocusGate enforce them with very low friction.

### Product pillars
- **Trustworthy enforcement**: blocks should feel predictable, fast, and hard to bypass accidentally.
- **Low mental load**: setup should be simple, status should be obvious, and rules should feel easy to understand.
- **Behavior change support**: the app should help users improve habits, not just punish them.
- **Release readiness**: reliability, privacy, onboarding, and support surfaces must feel production-grade.

---

## What "Real Product" Means For FocusGate

We should treat these as the thresholds between "cool demo" and "real app":

### 1. Reliability
- Rules keep applying after reboot.
- Limits reset correctly every day.
- Focus sessions survive app backgrounding.
- NextDNS sync failures are visible and recoverable.

### 2. Clarity
- The user always knows:
  - whether protection is active
  - which apps are controlled
  - what is blocked right now
  - why something is blocked
  - what needs fixing if protection is not working

### 3. Retention
- The app should create a daily loop:
  - morning setup or carry-over rules
  - day progress and warnings
  - end-of-day summary
  - next-day reset and restart

### 4. Defensibility
- FocusGate must be meaningfully harder to bypass than a normal screen-time timer.
- The app should lean into its DNS + rules-engine identity rather than copying generic wellness apps.

---

## Current State Assessment

Based on the codebase today, FocusGate already has:
- real Android build
- installed app discovery
- rule engine with limits, schedules, and focus mode hooks
- NextDNS configuration and block sync
- onboarding, dashboard, apps, schedule, focus, and settings surfaces
- notifications and tests

The biggest gaps now are not basic screens. They are:
- enforcement resilience
- user trust and diagnostics
- anti-bypass depth
- meaningful history and insights
- onboarding quality and activation
- release and monetization readiness

---

## Roadmap Overview

## Phase 1: Product Hardening
**Theme:** make the app dependable enough for daily use

### Outcomes
- users can trust that rules keep working
- failures are visible instead of silent
- support/debugging becomes possible

### Features
- Boot-time reactivation:
  restore rules, schedules, focus state, and notifications after device reboot
- Background resilience:
  strengthen rule-engine lifecycle and document battery optimization handling
- Sync status model:
  show `idle`, `syncing`, `success`, `error`, and last successful sync time
- Retry and backoff:
  queue failed NextDNS writes and retry safely
- Local audit trail:
  structured event history for rule changes, sync attempts, blocks, unblocks, and resets
- Safe reset handling:
  guarantee midnight reset behavior even after app kills or time-zone changes

### Exit criteria
- app survives reboot and resumes protection
- sync errors are user-visible
- block/unblock state is explainable from logs

---

## Phase 2: Activation And Onboarding
**Theme:** help new users reach first success quickly

### Outcomes
- users finish setup
- users understand how FocusGate works
- users feel the first block working on day one

### Features
- Activation checklist:
  NextDNS connected, usage access granted, notification permission granted, first app added
- Guided "first rule" wizard:
  suggest common distracting apps and recommended starter limits
- Connectivity assistant:
  explain profile ID, API key, and how to verify DNS is active
- Test block flow:
  one-tap "verify FocusGate is working" action
- Empty-state education:
  each major screen should guide the next useful step

### Exit criteria
- a new user can install and reach a working block without outside help
- the app can clearly explain why setup is incomplete

---

## Phase 3: Anti-Bypass And Commitment Features
**Theme:** make FocusGate meaningfully stricter than default digital-wellbeing tools

### Outcomes
- users can choose stronger commitment modes
- casual bypass routes become harder

### Features
- DNS health monitor:
  detect whether NextDNS protection is currently active
- Strict Mode:
  editing or disabling rules has a delay or cooldown
- Guardian PIN:
  fully protect rule editing, settings, and emergency overrides
- Tamper signals:
  warn when permissions are revoked or protection state changes
- Frictionful override flow:
  require multiple confirmation steps for emergency unblock
- Optional accountability mode:
  export weekly report or share status with a trusted partner later

### Exit criteria
- bypassing the app requires deliberate effort, not one quick toggle
- high-commitment users can opt into stronger protections

---

## Phase 4: Retention And Behavior Change
**Theme:** make users want to keep the app installed

### Outcomes
- users can see progress
- users learn from patterns
- FocusGate becomes part of a routine

### Features
- Daily review:
  "what got blocked", "time saved", "closest calls", "top distractions"
- Weekly trends:
  app usage and limit-hit history over time
- Streaks and consistency:
  days where limits held, focus sessions completed, blocked apps avoided
- Goal presets:
  deep work, exam prep, sleep, social detox, weekend reset
- Contextual nudges:
  smarter warnings before likely overuse windows
- Session notes:
  optional short reflection after focus sessions

### Exit criteria
- the app provides value even when users are not currently being blocked
- the dashboard feels like a habit tool, not just a status screen

---

## Phase 5: Premium Product Layer
**Theme:** add reasons to pay without weakening the core free product

### Good premium candidates
- advanced analytics and weekly reports
- cloud backup and multi-device restore
- schedule templates and presets
- accountability features
- stronger strict-mode options
- custom categories and advanced rule combinations

### Free product should still include
- app selection
- usage limits
- focus sessions
- schedule blocking
- notifications
- core diagnostics

### Monetization principle
- charge for depth, automation, and history
- do not charge for the app simply working

---

## Phase 6: Launch Readiness
**Theme:** remove the reasons a real user would uninstall or distrust the app

### Must-have release items
- polished app icon and splash
- stable release build pipeline
- privacy policy and permission explanations
- Play Store copy and screenshots
- FAQ for NextDNS setup and common failures
- crash logging and support email/contact path
- basic analytics for activation and retention funnels

### Metrics to track
- onboarding completion rate
- percent of users who add at least one rule
- percent who connect NextDNS successfully
- first successful block rate
- day-1 / day-7 retention
- sync failure rate
- notification open rate

---

## Recommended Priority Order

### Do next
1. Product hardening
2. Activation/onboarding
3. DNS health + diagnostics
4. strict mode + guardian flows

### Do after that
1. daily/weekly insights
2. presets and templates
3. release pipeline and store assets

### Do later
1. cloud sync
2. accountability features
3. premium packaging

---

## Product Risks

### Technical
- NextDNS dependency remains a core external risk
- Android background restrictions may hurt reliability on some devices
- domain mapping quality affects perceived blocking quality

### Product
- if setup feels too technical, many users will churn before first value
- if enforcement feels weak, users will not trust the app
- if the app feels punitive without insights, retention will suffer

### Strategic response
- make trust and clarity first-class features
- design for first successful block as the activation moment
- add insight and progress loops before expanding feature surface too far

---

## One-Sentence Direction

**FocusGate should become the Android app people install when they are serious about making their limits real.**
