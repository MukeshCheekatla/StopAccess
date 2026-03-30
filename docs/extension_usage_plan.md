# Extension Usage Plan
> Written: 30 Mar 2026
> Purpose: define how the FocusGate extension page should be used by real users and what each page must accomplish

## Goal

Make the extension popup feel like a real control center, not just a debug panel.

The popup should help a user do four things quickly:

1. understand whether protection is active
2. turn blocking on or off confidently
3. manage specific distractions fast
4. see what happened recently

---

## Primary User Flows

## 1. First-Time Setup

### User intent

"I just installed the extension. I want it working fast."

### Popup flow

1. Open extension
2. Land on Dashboard with a strong empty state
3. Tap Settings
4. Paste NextDNS Profile ID and API key
5. Pick enforcement level:
   browser-only, hybrid, or profile-wide
6. Return to Apps
7. Toggle first distracting app or add first custom domain
8. See success state on Dashboard

### Required UX

- clear "Login to NextDNS" language
- clear warning that services/categories are profile-wide
- clear success state after first real toggle

---

## 2. Daily Blocking Flow

### User intent

"I want to quickly enable or disable distractions before work."

### Popup flow

1. Open extension
2. Go to Apps
3. Search for TikTok, Instagram, YouTube, Reddit, etc.
4. Toggle ON the apps/services to block
5. Optionally enable a category like social networks
6. Go back to Dashboard and confirm protection status

### Required UX

- search should be instant
- toggles should feel immediate
- status should update without ambiguity
- ON should mean blocked now
- OFF should mean allowed now

---

## 3. Focus Session Flow

### User intent

"I want a temporary focused work session."

### Popup flow

1. Open extension
2. Go to Focus
3. Pick 15, 25, 45, or 60 minutes
4. Start focus session
5. Browser blocks apply immediately
6. Dashboard shows timer and active state
7. User can stop early only through a clear action

### Required UX

- countdown visible
- active focus state visible on Dashboard
- explicit list of what is affected
- optional stricter mode later

---

## 4. Review Recent Activity

### User intent

"I want to know if the extension is actually doing anything."

### Popup flow

1. Open Dashboard or Insights
2. See:
   current status, last sync, latest block events, top blocked domains
3. If something failed, jump to Settings or diagnostics

### Required UX

- latest block data should feel trustworthy
- sync failure should be obvious
- empty states should explain why nothing appears yet

---

## Recommended Page Roles

## Dashboard

Should answer in 3 seconds:

- Is FocusGate active?
- What mode am I using?
- What is blocked right now?
- When did it last sync?

Must include:

- shield / protection status
- current enforcement level
- active block count
- current focus state
- last sync result

## Apps

Should be the main control surface.

Must include:

- Custom Domains tab
- NextDNS Apps tab
- Categories tab
- searchable list
- true/false toggle state from NextDNS where applicable

## Focus

Should be the fastest route into a short protection session.

Must include:

- presets
- active timer
- stop action
- summary of affected blocks

## Insights

Should explain outcomes, not just show numbers.

Must include:

- recent blocks
- top blocked domains
- strongest distraction sources
- basic trends over time

## Settings

Should be the trust and recovery page.

Must include:

- NextDNS credentials
- connection status
- mode selector
- warnings for profile-wide behavior
- maintenance actions

---

## Page Success Criteria

## Dashboard success

- user instantly understands whether protection is working

## Apps success

- user can find and toggle a target in under 10 seconds

## Focus success

- user can start a session in one action

## Insights success

- user can see proof that enforcement is happening

## Settings success

- user can recover from config problems without confusion

---

## Immediate Improvements To Make Next

1. Add a proper connection test button in Settings
2. Add a mode banner on Dashboard:
   browser-only, hybrid, or profile-wide
3. Add a recent actions feed:
   toggled on, toggled off, sync success, sync failure
4. Add "recommended distractions" in Apps for fast setup
5. Add a first-run empty state that routes directly into setup

---

## Product Rule

Every extension page should answer:

- what is happening
- what I can do next
- whether this affects only this browser or my whole NextDNS profile
