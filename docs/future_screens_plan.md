# Future Screens Plan
> Scope: Android app screens, extension screens, and missing product surfaces

## Goal

Turn FocusGate from a functional tool into a product with clear, trustworthy, low-friction workflows.

## Android Screens

### Dashboard

- Add a protection health card with:
  sync status, last successful enforcement, current focus mode, and pending issues
- Add a today timeline:
  warnings sent, blocks triggered, focus sessions started, sync failures
- Add quick actions:
  start focus, pause enforcement, test block, retry sync

### Apps

- Split into tabs:
  installed apps, controlled apps, blocked now, suggestions
- Add presets:
  social, short video, shopping, gaming, work-safe
- Add explainability:
  why each app maps to a domain or NextDNS service

### Focus

- Make it a real commitment screen:
  countdown, reason, targets affected, friction to exit
- Add modes:
  light focus, hard lock, scheduled focus, emergency allow

### Schedule

- Add a real weekly planner
- Add reusable templates:
  workday, study block, sleep, deep work
- Add schedule conflict handling and preview

### Insights

- Add daily, weekly, and 30-day views
- Add saved time, top distractions, strongest hours, and relapse patterns
- Add comparison:
  this week vs last week

### Settings

- Add setup checklist
- Add diagnostics center
- Add export/import of config
- Add anti-bypass and guardian controls

## Missing Android Screens

### Onboarding

- Welcome
- Why FocusGate works
- NextDNS setup
- Permissions
- First rule setup
- Success verification

### Protection Health

- Dedicated diagnostics screen
- DNS connected?
- rules active?
- usage access granted?
- last successful block?
- reboot recovery status?

### Rule Explainability

- Per-target screen showing:
  rule type, source, scope, mapped domain, remote service state, recent blocks

### Subscription / Pricing

- Keep free tier credible
- Show what paid unlocks only after core trust is strong

## Extension Screens

### Dashboard

- Add stronger sync telemetry
- Add top blocked services
- Add current active browser block count

### Apps

- Separate:
  custom domains, NextDNS apps, categories, recommended distractions
- Add multi-select presets for common services

### Insights

- Add recent block events grouped by service
- Add domain/session trends

### Settings

- Add connection test
- Add profile-wide warning copy
- Add mode selector with clearer tradeoffs

## Suggested Build Order

1. Onboarding
2. Protection Health
3. Better Dashboard
4. Better Apps management
5. Better Insights
6. Focus hardening
7. Schedule planner
