# Future Screens Plan
> Updated: 30 Mar 2026
> Scope: Android screens, extension popup screens, and missing product surfaces

## Purpose

This document explains what each user-facing surface should do, what is missing today, and which files will likely carry the work.

## Android Screens

### Dashboard

Current role:
- high-level summary
- quick trust signal

What it should become:
- protection health summary
- current focus state
- active rule count
- most recent sync result
- clear “what happened today” view

Likely files:
- `src/screens/DashboardScreen.tsx`
- `src/services/logger.ts`
- `src/store/syncState.ts`

### Apps

Current role:
- rule management

What it should become:
- controlled apps
- recommended distractions
- presets
- explainability for how an app maps to a domain or service
- better “blocked now” visibility

Likely files:
- `src/screens/AppsScreen.tsx`
- `src/components/AppPickerModal.tsx`
- `src/data/appDomains.json`

### Focus

Current role:
- manual focus session entry point

What it should become:
- commitment mode screen
- visible countdown
- stronger stop/override friction
- summary of affected targets

Likely files:
- `src/screens/FocusScreen.tsx`
- `packages/core/src/engine.ts`

### Schedule

Current role:
- time-window blocking

What it should become:
- weekly planner
- reusable templates
- conflict preview
- clearer visual explanation of schedule coverage

Likely files:
- `src/screens/ScheduleScreen.tsx`
- `packages/state/src/schedules.ts`

### Insights

Current role:
- usage summary

What it should become:
- daily trends
- weekly comparisons
- strongest distraction windows
- most blocked targets
- saved-time narrative

Likely files:
- `src/screens/InsightsScreen.tsx`
- `packages/core/src/insights.ts`

### Settings

Current role:
- credentials, diagnostics, controls

What it should become:
- full diagnostics center
- protection health
- sync recovery
- guardian and strict mode configuration
- maintenance actions

Likely files:
- `src/screens/SettingsScreen.tsx`
- `src/store/storageAdapter.ts`

## Missing Android Screens

### Onboarding

Needs:
- product explanation
- NextDNS setup
- permissions
- first success

Likely files:
- `src/screens/OnboardingScreen.tsx`
- `src/components/AutoSetupModal.tsx`

### Protection Health

Needs:
- DNS connected?
- sync healthy?
- permissions granted?
- last real block succeeded?

Likely files:
- could begin inside `src/screens/SettingsScreen.tsx`
- could later become its own screen

## Extension Popup Screens

### Dashboard

Should answer:
- is protection active?
- what mode am I in?
- what changed recently?

Likely files:
- `extension/src/screens/DashboardScreen.js`
- `extension/src/background/platformAdapter.js`

### Apps

Should be the main extension control surface.

Needs:
- custom domains
- NextDNS app toggles
- category toggles
- recommendations
- real browser-only vs profile-wide explanation

Likely files:
- `extension/src/screens/AppsScreen.js`
- `extension/src/lib/appCatalog.js`

### Focus

Should become:
- browser focus presets
- timer state
- quick stop path

Likely files:
- `extension/src/screens/FocusScreen.js`
- `extension/src/background/lifecycle.js`

### Insights

Should become:
- recent blocks
- top blocked domains
- top blocked services
- recent sync/errors

Likely files:
- `extension/src/screens/InsightsScreen.js`
- `packages/core/src/api.ts`

### Settings

Should become:
- NextDNS connection control
- mode selector
- connection test
- maintenance
- warnings for profile-wide toggles

Likely files:
- `extension/src/screens/SettingsScreen.js`
- `extension/src/background/platformAdapter.js`

## Build Order Recommendation

1. Settings and diagnostics
2. Better Dashboard
3. Better Apps control surface
4. Better Focus behavior
5. Better Insights
6. Schedule improvements
