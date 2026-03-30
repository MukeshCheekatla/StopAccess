# Extension Product Plan
> Written: 29 Mar 2026
> Goal: make the browser extension the fastest path to a real FocusGate product

---

## Why Extension First

The extension is the easiest place to deliver strong blocking quickly:

- browser blocking is immediate
- `declarativeNetRequest` gives us direct enforcement in Chrome
- NextDNS adds stronger network-level backup
- setup is simpler than Android permissions + device-specific background behavior

This means the extension can become:

- the fastest product to ship
- the easiest product for users to understand
- the best place to validate FocusGate’s blocking model

---

## Product Model

We should support three enforcement levels.

### Level 1: Browser Only

Use Chrome `declarativeNetRequest` only.

Best for:
- fastest setup
- safest UX
- per-browser blocking
- instant focus mode

### Level 2: Browser + NextDNS Domain Sync

Use:
- `declarativeNetRequest`
- NextDNS `denylist`

Best for:
- stronger block persistence
- custom domains
- blocking that survives basic browser workarounds

### Level 3: Browser + NextDNS Services/Categories

Use:
- `declarativeNetRequest`
- NextDNS `denylist`
- `parentalControl.services`
- `parentalControl.categories`

Best for:
- high-commitment mode
- fast support for known platforms like YouTube, TikTok, Facebook
- broad presets like `social-networks`

Important:
- services/categories are profile-wide, not browser-only
- UI must clearly warn users when a block affects all devices on that profile

---

## Core Features To Build

### 1. Fast Blocking

- one-click block/unblock for selected services/sites
- instant focus mode timer
- schedule-based browser blocking
- temporary unblock with friction

### 2. Rule Types

- custom domain rules
- known service rules from NextDNS `parentalControl.services`
- category rules from NextDNS `parentalControl.categories`
- browser-only local rules

### 3. Diagnostics

- NextDNS connection status
- last sync time
- current active block mode
- browser rules active count
- profile-wide warning state

### 4. Insights

- blocked attempts
- top blocked domains
- focus session completions
- daily browser time summary
- sync history

---

## Recommended UX

### Main Tabs

1. Dashboard
2. Blocklist
3. Focus
4. Insights
5. Settings

### Dashboard should show

- shield status
- browser-only vs profile-wide mode
- focus state
- active blocks count
- last sync result

### Blocklist should support

- add custom domain
- add service from NextDNS services
- add category from NextDNS categories
- toggle local-only vs profile-wide

### Focus should support

- 15 / 25 / 45 / 60 minute presets
- browser-only focus
- strong focus using NextDNS

### Settings should support

- profile ID
- API key
- test connection
- sync mode
- emergency unblock behavior

---

## Technical Direction

### Local enforcement

Use `chrome.declarativeNetRequest.updateDynamicRules` as the first enforcement layer.

### Strong sync layer

Use NextDNS API for:

- `denylist`
- `parentalControl.services`
- `parentalControl.categories`
- `analytics/*`
- `logs`

### Data model

Each rule should include:

- id
- label
- type: `domain | service | category`
- scope: `browser | profile`
- active
- source: `manual | preset`

### Sync modes

- `browser_only`
- `hybrid`
- `profile_enforced`

---

## Build Order

## Phase A: Reliable Extension Core

- stabilize popup and background lifecycle
- keep rules in one storage contract
- make `extension:check` part of normal workflow
- confirm build + unpacked-load loop

### Exit

- extension loads cleanly every time
- popup navigation works
- background worker remains healthy

---

## Phase B: Browser Blocking MVP

- custom domain rules
- DNR sync
- focus mode timer
- dashboard status

### Exit

- users can block domains instantly in browser
- focus mode can start and stop reliably

---

## Phase C: NextDNS Strong Mode

- sync denylist
- fetch and show available parental control services
- fetch and show categories
- add mode warnings for profile-wide actions

### Exit

- users can choose browser-only or profile-wide enforcement
- NextDNS actions are visible and explainable

---

## Phase D: Insights And Logs

- blocked attempts feed
- latest logs
- top blocked domains/services
- daily charts

### Exit

- extension feels like a product, not just a popup

---

## Phase E: Launch Readiness

- onboarding
- error states
- settings polish
- store listing assets
- FAQ and support docs

---

## Biggest Risks

### 1. Profile-wide confusion

If users do not understand that services/categories affect the whole NextDNS profile, trust will break.

### 2. Background service worker fragility

The extension must survive Chrome lifecycle behavior cleanly.

### 3. Rule drift

Local browser rules and NextDNS profile rules must remain explainable and in sync.

---

## Recommendation

Ship the extension as:

1. browser-first
2. hybrid by default
3. profile-wide only when explicitly enabled

That gives us the easiest usable product fast, without losing the power of NextDNS.
