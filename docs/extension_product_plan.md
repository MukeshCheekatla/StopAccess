# Extension Product Plan
> Updated: 30 Mar 2026
> Scope: product role, UX direction, enforcement model, and future capability for the browser extension

## Purpose

This file defines what the extension should be in the overall FocusGate product.
It is not just a browser companion.
It should become one of the main product surfaces because it is the easiest way for users to feel FocusGate working quickly.

## Why The Extension Matters

The extension is currently the lowest-friction entry point in the product.

Compared with Android, it is:

- easier to install and test
- easier to understand visually
- faster to toggle on and off
- better suited to browser distractions like YouTube, Reddit, Instagram web, and news sites

Compared with a pure NextDNS dashboard, it is:

- closer to the user’s daily browsing context
- more brandable and product-specific
- capable of showing product decisions instead of raw DNS controls

## Product Role

The extension should become:

- the fastest daily control surface
- the easiest place to manage web distractions
- the clearest place to manage browser-only vs profile-wide enforcement
- the easiest place to show recent blocked activity
- the simplest path to first product value

It should not become:

- a hidden advanced-only panel
- a full replacement for Android system-level app blocking
- a misleading proxy for device-wide enforcement when only the browser is affected

## User Jobs

The extension should help users do five jobs well:

1. Start blocking quickly.
2. Toggle common distracting services without editing raw domain lists.
3. Understand whether the current action affects only the browser or the whole NextDNS profile.
4. See what was recently blocked and why.
5. Recover easily when setup or sync is broken.

## Enforcement Modes

### Browser-only mode

Mechanism:

- `declarativeNetRequest`
- local extension state

Strengths:

- fast
- no DNS propagation concerns
- no risk of affecting other devices

Weaknesses:

- browser-only
- weaker than network-level enforcement
- easier for determined users to bypass by switching browser or device

### Hybrid mode

Mechanism:

- browser DNR
- targeted NextDNS denylist/domain sync

Strengths:

- stronger than local-only blocking
- still relatively understandable
- useful for known distraction domains

Weaknesses:

- introduces remote state
- requires better sync clarity
- domain mapping quality matters

### Profile-wide mode

Mechanism:

- browser DNR
- NextDNS denylist
- NextDNS parental-control services and categories

Strengths:

- strongest enforcement available in this product surface
- easiest way to block major services with one toggle
- useful for serious detox and commitment flows

Weaknesses:

- affects the whole NextDNS profile
- may affect other devices using that profile
- easiest place for user confusion if the UI is vague

## Product Requirement For Profile-Wide Actions

Every UI that toggles NextDNS profile-wide controls must explain:

- this change affects the NextDNS profile
- it may affect other devices using the same profile
- turning it off here changes the remote profile state, not just the browser

## Core Screens

### Dashboard

Should show:

- current mode
- current health state
- last sync result
- recent actions
- quick start and stop focus controls

### Apps / Services

Should show:

- curated list of supported services such as TikTok, Instagram, YouTube, Reddit, Discord, ChatGPT, Zoom, Spotify
- branded icons
- search
- current toggle state
- scope indicator: browser-only, hybrid, profile-wide

### Focus

Should show:

- active session timer
- what is blocked in this session
- quick presets
- option to choose browser-only or stronger enforcement

### Insights

Should show:

- recent blocked services
- recent blocked domains
- session history
- simple weekly summary later

### Settings

Should show:

- login and credentials state
- profile ID and API key state
- connection test
- sync status
- scope explanation
- import/export or reset later

## App And Service Catalog Direction

The extension should not expose raw NextDNS internals directly as the main UX.
Instead, it should provide a curated product catalog with:

- display name
- service id
- category mapping if relevant
- primary domains
- icon source
- whether the item supports browser-only blocking, profile-wide blocking, or both

This catalog should live in shared code when possible so Android and extension can eventually reference the same conceptual targets.

## Recommended UX Direction

### Start simple

The default extension experience should feel like:

- pick distractions
- choose blocking strength
- turn on focus

not:

- configure DNS structures
- compare raw lists
- manually reason about dozens of technical states

### Make state visible

Every important screen should make these things obvious:

- are we connected to NextDNS
- is protection active
- what scope is currently active
- what changed recently

### Explain scope with language, not jargon

Prefer:

- Browser only
- Browser + NextDNS
- Entire NextDNS profile

Avoid leading with terms like:

- DNR
- parentalControl.services
- category sync

## Future Capability Areas

### Near term

- stable NextDNS login/configuration
- service toggles that map to real NextDNS `active: true/false`
- branded app/service icons
- recent actions feed
- health/status surfaces

### Mid term

- browser-only presets
- work and study modes
- temporary unblock flow with friction
- richer analytics from NextDNS logs

### Longer term

- multi-browser support if architecture allows
- account-based cloud sync
- extension as the main daily command center across devices

## Success Measures

The extension is succeeding when:

- a new user can turn on blocking within minutes
- users understand whether a toggle affects only the browser or the whole profile
- service toggles feel reliable and real
- recent block activity is visible
- support requests shift from “nothing works” to narrower, diagnosable issues

## One-Sentence Direction

The extension should become the easiest and most trusted way to control FocusGate during normal daily browsing.
