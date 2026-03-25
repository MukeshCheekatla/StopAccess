# FocusGate — UI/UX Upgrade Plan (Progress Tracking)
> Last Updated: 24 Mar 2026

---

## 🎨 Design Direction [DONE]
- [x] Theme: Dark glass morphism.
- [x] vivid accent colors (#7C6FF7).
- [x] Premium Feel: Clean, minimal, fast.

---

## 📱 Screen-by-Screen progress

### 1. Dashboard Screen [DONE]
- [x] Header: Greeting + dynamic date display.
- [x] Today's Summary Card: Screen time, Blocked count, Limits.
- [x] App Usage List: Real icons, Usage bars (green/yellow/red logic).
- [x] Distracting Apps Section: Vertical list for quick-add.
- [x] Auto-refresh: Every 15-30s.

### 2. Apps Screen [DONE]
- [x] App Picker Modal: Searchable list of ALL installed user apps.
- [x] Card Redesign: Icon, Name (Capitalized), Package ID.
- [x] Mode Toggle: Allow / Limit / Block.
- [x] Smart Limit Editor: Hours/Minutes spinner modal.

### 3. Focus Screen [PENDING]
- [ ] Big Timer Countdown.
- [ ] Breathing Animation.
- [ ] App Blocks Summary.

### 4. Schedule Screen [PENDING]
- [ ] Weekly Calendar Strip.
- [ ] Schedule Cards with time ranges.

### 5. Settings Screen [PARTIAL]
- [x] NextDNS Connection Status.
- [x] Usage Permission Status.
- [ ] Strict Mode / Danger Zone.

### 6. Onboarding [PENDING]
- [ ] 3-Screen Welcome Flow.
- [ ] Permission Request Wizard.

---

## 🖼️ Real App Icons [DONE]
- [x] Native `InstalledAppsModule.kt` with robust icon fetching.
- [x] Single-icon retrieval (`getIconForPackage`) for performance.
- [x] `AppIconImage` component with Global Sync/Cache.
- [x] System App Visibility (`QUERY_ALL_PACKAGES`).

---

## ✅ Current Focus
**We have completed the "Production Upgrade (Phase 1)".** 
Next steps would be the **Focus Timer** and **Scheduling** screens to finish the core utility.
