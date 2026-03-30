# Product Roadmap 2026
> Updated: 30 Mar 2026
> Scope: product direction for the Android app, browser extension, shared packages, and release posture

## Purpose

This file is the highest-level product document for the current FocusGate repo.
It should answer four questions:

1. What kind of product FocusGate is trying to become.
2. Which user problems matter most.
3. Which surfaces matter most in 2026.
4. In what order we should invest product effort.

This is not a sprint backlog.
This file is the decision frame that the execution plans should inherit.

## Product Thesis

FocusGate should become a commitment product for people who are serious about reducing distraction, not a generic usage-tracking app.

The product should help users:

- identify the distractions that derail them most often
- define explicit rules around those distractions
- enforce those rules with real friction
- understand clearly when protection is active, broken, or bypassed
- build a repeatable focus routine rather than relying on momentary willpower

## User Problem

Most digital wellbeing tools fail for one of three reasons:

- they only show usage after the fact
- they are too easy to disable in the moment
- they are unclear about what they are actually enforcing

FocusGate should win by being stricter, clearer, and easier to trust.

## Product Surfaces

### Android app

Role in the product:

- system-level controller for installed apps
- permissions and diagnostics center
- setup and onboarding surface
- place where stricter commitment features live

### Browser extension

Role in the product:

- fastest daily control surface
- easiest way to block browser distractions
- clearest place to expose NextDNS service/category toggles
- lightweight insights and recent-actions surface

### Shared packages

Role in the product:

- typed API contracts
- rule definitions
- sync orchestration
- storage shapes
- shared diagnostics and domain/app catalogs

The shared packages are product infrastructure.
If they are unstable, both Android and the extension feel unreliable.

## Product Principles

### Principle 1: Trust is a feature

Users must be able to answer:

- Is protection active right now?
- What is being blocked?
- Why is it being blocked?
- If something failed, what failed?

Any behavior that is technically working but unclear to the user is still a product problem.

### Principle 2: First successful block is the activation moment

The most important early product moment is not installation.
It is the first time the user sees a distracting app or site actually blocked in a way they understand.

### Principle 3: Strong modes must be explicit

Whenever we use NextDNS services, categories, or denylist operations that affect a whole profile, the product must clearly explain:

- this action is profile-wide
- it may affect other devices on the same profile
- browser-only and profile-wide are different enforcement modes

### Principle 4: The product should reward return usage

If FocusGate only blocks, users will install it in a moment of frustration and then uninstall it when they feel punished.

The product must also help users:

- see progress
- understand patterns
- maintain routines
- recover after bad days

## Target User Segments

### Segment A: Serious self-control users

These users actively want friction.
They care about anti-bypass behavior, strict mode, guardian controls, and confidence that rules keep working.

### Segment B: Students and deep-work users

These users want study sessions, work sessions, preset modes, and quick browser blocking.
They value clarity and quick setup more than maximum strictness at first.

### Segment C: Digital detox and social-media reducers

These users want easy toggles for Instagram, YouTube, TikTok, Reddit, and browser distractions.
They need the extension and simple presets more than dense configuration.

## 2026 Strategic Priorities

### Priority 1: Reliability

This includes:

- Android reboot recovery
- permission-loss detection
- safe sync retries
- extension startup resilience
- consistent state between UI and enforcement layers

### Priority 2: Setup and activation

This includes:

- better onboarding
- stronger empty states
- guided first-rule flow
- setup checklists
- connection tests for NextDNS

### Priority 3: Trust and explainability

This includes:

- visible sync status
- diagnostics center
- recent actions feed
- health checks
- profile-wide warning language

### Priority 4: Retention and behavior support

This includes:

- daily and weekly insights
- streaks and saved-time narratives
- presets
- focus workflows
- relapse visibility

### Priority 5: Launch readiness

This includes:

- release checklists
- stable build process
- privacy documentation
- troubleshooting docs
- sane support flows

## Roadmap Phases

### Phase 1: Hardening the foundation

Objective:
make the existing Android app, extension, and sync layer trustworthy enough to build on.

Expected outcomes:

- fewer silent failures
- better recovery after reboot or app restart
- consistent shared API surface
- clear sync status and logs

### Phase 2: Activation and setup quality

Objective:
make it easy for a new user to go from install to first meaningful block.

Expected outcomes:

- setup feels guided instead of technical
- empty states show next actions
- users understand browser-only vs profile-wide behavior
- connection failures are actionable

### Phase 3: Stronger commitment and anti-bypass

Objective:
make FocusGate stronger than default digital wellbeing tools.

Expected outcomes:

- editing rules is harder in strict mode
- guardian controls cover the important escape hatches
- bypass signals are surfaced clearly
- users can choose the right level of enforcement

### Phase 4: Insights and habit loop

Objective:
make the product useful on an ongoing basis, not only during setup or crisis moments.

Expected outcomes:

- users can review what happened each day
- they can see patterns across the week
- the dashboard becomes a return surface
- focus sessions feel part of a routine

### Phase 5: Launch and packaging

Objective:
make the product shippable, supportable, and legible to outside users.

Expected outcomes:

- repeatable build process
- clean release docs
- clear privacy and permissions messaging
- basic support infrastructure

## What “Real Product” Means Here

We should consider FocusGate a real product when all of the following are true:

- a new user can reach first successful blocking without guesswork
- Android and extension behavior are understandable
- rules survive normal lifecycle events
- the user can see whether protection is healthy
- the product offers a reason to return daily
- release and support processes are documented

## Monetization Direction

The free product should include:

- core blocking
- basic focus sessions
- app selection
- schedules
- core diagnostics
- browser-only blocking

Potential paid features later:

- deeper analytics
- advanced presets
- accountability features
- history export and cloud backup
- stronger strict-mode variants

Principle:
charge for depth and advanced workflows, not for the product simply functioning.

## Risks

### Technical risks

- NextDNS remains an external dependency and profile-wide changes can confuse users
- Android background restrictions vary by vendor and can damage trust
- shared package drift can break both app and extension at once

### Product risks

- setup may still feel too technical for casual users
- strong controls may feel punitive if not balanced with insight and clarity
- profile-wide behavior may surprise users who share a DNS profile

## One-Sentence Direction

FocusGate should become the tool people use when they want their digital limits to be real, visible, and hard to casually bypass.
