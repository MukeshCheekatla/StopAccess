# Extension UI Plan
> Updated: 30 Mar 2026
> Scope: screen-by-screen UI direction for the browser extension

## Purpose

This file exists because the extension is now important enough to deserve its own UI plan instead of being folded into generic future docs.

The extension UI should be:

- fast to scan
- explicit about enforcement scope
- branded around recognizable apps and services
- understandable even for users who do not know what NextDNS is

## Design Goals

### Goal 1: Instant clarity

A user opening the popup should be able to tell in a few seconds:

- whether FocusGate is active
- whether NextDNS is connected
- what mode is active
- what changed recently

### Goal 2: Service-first management

Users think in terms of:

- Instagram
- YouTube
- Reddit
- Discord
- ChatGPT

not in terms of raw domain lists.

### Goal 3: Scope transparency

Every toggle or action that is profile-wide should visually differ from browser-only actions.

Examples:

- a label under the toggle
- a small Profile-wide chip
- a confirmation panel for sensitive changes

### Goal 4: Trust feedback

If a user taps a toggle, the extension should show:

- loading state
- success state
- failure state with reason

Silent toggles are not acceptable for a product built around enforcement trust.

## Screen Plans

### Popup Dashboard

Should contain:

- primary status card
- current mode
- quick start/stop focus button
- last sync time
- recent actions preview

### Apps / Services Screen

Should contain:

- search input
- recommended apps section
- all supported service list
- icon, name, scope label, toggle, and state

### Focus Screen

Should contain:

- active preset or session
- remaining time if timed
- list of currently affected services
- mode selector

### Insights Screen

Should contain:

- recent blocked items
- session counts
- top blocked services
- simple day/week summary later

### Settings Screen

Should contain:

- profile connection section
- API key / profile ID status
- connection test
- sync health
- explanation of enforcement modes

## Icon Strategy

The extension should use real app/service icons where possible and legally appropriate.

The catalog should support:

- bundled local icons for core services
- fallback favicon or generated badge
- consistent sizing, padding, and background treatment

## Content Style

Use product language such as:

- Browser only
- Browser + NextDNS
- Entire profile
- Connected
- Needs setup
- Sync failed

Avoid internal language such as:

- `parentalControl.services`
- `denylist PATCH`
- `DNR rule set`

## Recommended Build Order

1. Improve Apps screen rows and icon rendering.
2. Add consistent status/loading/error states for toggles.
3. Upgrade Dashboard to show health and recent actions.
4. Upgrade Settings to explain connection and enforcement modes.
5. Add Focus and Insights screens polish.
