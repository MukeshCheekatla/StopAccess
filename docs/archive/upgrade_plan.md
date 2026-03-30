# FocusGate — Upgrade Plan (MVP → Real App)
> Written: 24 Mar 2026

---

## ✅ Current State (Done)
- Android builds and runs on device
- UsageStatsModule (Kotlin) reads real app foreground time
- Rule engine runs every 60s, evaluates limits
- NextDNS denylist toggle (active: true/false) via PATCH
- Settings screen: API key, profile ID, test connection
- Schedules screen: time-window blocking
- Dashboard, Apps, Focus screens working

---

## 🚀 Sprint 2 — Polish & Reliability

### 2.1 Onboarding Flow (Priority: HIGH)
**Problem:** User lands on Dashboard with no context.  
**Fix:** Add a 3-step onboarding on first launch:
1. Welcome screen — explain what FocusGate does
2. NextDNS setup — direct link to nextdns.io, paste API key + profile ID
3. Usage permission — one-tap grant with explanation

**Files to create:** `src/screens/OnboardingScreen.tsx`  
**Files to modify:** `App.tsx` — detect first launch via MMKV flag

---

### 2.2 Real-time Dashboard (Priority: HIGH)
**Problem:** Dashboard is static, doesn't refresh automatically.  
**Fix:**
- Pull live usage every 30s using `setInterval`
- Show progress bar per app (used / limit)
- Color: green < 50%, yellow 50-90%, red ≥ 90%
- Show "🔴 Blocked" badge on apps over limit

**Files to modify:** `src/screens/DashboardScreen.tsx`

---

### 2.3 App Icon + Splash Screen (Priority: MEDIUM)
**Problem:** App uses blank default icon.  
**Fix:**
- Design and set a proper `ic_launcher` icon
- Add a splash screen that fades into the app
- Use `react-native-bootsplash` or static splash activity

**Files to modify:** `android/app/src/main/res/mipmap-*`

---

### 2.4 Midnight Auto-Reset (Priority: HIGH)
**Problem:** Blocked apps stay blocked forever unless manually reset.  
**Fix:**
- Register an `AlarmManager` alarm at midnight via a new Kotlin `ResetAlarmModule`
- On alarm trigger → `resetDailyBlocks()` from ruleEngine

**Files to create:**
- `android/app/.../ResetAlarmModule.kt`
- `android/app/.../ResetAlarmPackage.kt`

---

### 2.5 Notifications (Priority: MEDIUM)
**Problem:** User has no warning before getting blocked.  
**Fix:**
- At 80% of limit used → send a push notification: "Instagram: 16/20 min used"
- At 100% → "Instagram blocked until midnight"
- Use React Native's built-in `PushNotificationIOS` / `notifee` for Android

---

## 🎨 Sprint 3 — UX Upgrade

### 3.1 Focus Mode (Manual Override)
**Current:** Focus screen exists but may not do anything meaningful.  
**Upgrade:**
- "Start Focus Session" button → blocks ALL configured apps immediately
- Timer shows session length
- "End Session" → unblocks everything

**Files to modify:** `src/screens/FocusScreen.tsx`

---

### 3.2 App Picker (Real Installed Apps)
**Problem:** Apps screen only shows hardcoded list (15 apps).  
**Fix:** Query installed apps from device:
- Add `InstalledAppsModule.kt` Kotlin module
- `getInstalledApps()` → returns `[{packageName, appName, icon}]`
- Show real installed apps with icons in the picker
- Cross-reference with `DOMAIN_MAP`; only show apps that have domain mapping

---

### 3.3 Usage History Screen (New)
**Feature:** Show a weekly bar chart of usage per app.  
**Stack:** Use `react-native-gifted-charts` or simple custom bars  
**Data:** Store daily snapshots in MMKV on midnight reset

---

### 3.4 Widget (Home Screen)
**Feature:** Show today's blocked/allowed status without opening app.  
**Implementation:** Android App Widget (Kotlin) that reads from MMKV  
> ⚠️ Complex — do last

---

## 🔒 Sprint 4 — Anti-Bypass

### 4.1 Block Settings Access
**Problem:** User can go to phone Settings → change DNS → bypass FocusGate.  
**Fix (soft):** Detect if NextDNS is the active DNS resolver; warn user if not.  
- Check: `https://test.nextdns.io` — returns JSON `{status: "ok"}` if NextDNS is active

### 4.2 PIN Lock for Settings
**Problem:** User can open app and turn off rules.  
**Fix:** Add a 4-digit PIN requirement to access the Settings or edit a rule.  
**Files to create:** `src/screens/PinScreen.tsx`

### 4.3 Strict Mode
**Feature:** If enabled, rules can only be changed after a 24h cooldown.  
**Storage:** Track `ruleLastModified` timestamp per rule in MMKV.

---

## 🌐 Sprint 5 — Cloud Sync (Optional)

### 5.1 Supabase Integration
**Why:** Allow syncing rules across devices, or sharing a rule preset.  
**What:**
- Auth: email magic link
- Store rules in Supabase `rules` table
- Sync on open + every 5 mins

### 5.2 Rule Presets / Templates
- "Deep Work" preset: block social apps 9am–5pm
- "Sleep" preset: block everything 10pm–7am
- Shareable via a URL

---

## 🏪 Sprint 6 — Play Store Launch

### 6.1 Checklist
- [ ] `release` build configured with proper keystore
- [ ] App icon (all densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [ ] Privacy Policy page (required by Google)
- [ ] Store listing: screenshots, description, feature graphic
- [ ] Handle `PACKAGE_USAGE_STATS` permission justification in Play Store listing

### 6.2 Build Release APK
```bash
cd android && ./gradlew bundleRelease
```

### 6.3 Required Play Store Info
- App name: **FocusGate**
- Category: Productivity
- Content rating: Everyone
- Privacy Policy URL: Required (host a simple one on GitHub Pages)

---

## 📊 Priority Order

| Sprint | Feature                        | Effort | Impact |
|--------|-------------------------------|--------|--------|
| 2.1    | Onboarding                    | Low    | High   |
| 2.2    | Real-time Dashboard           | Medium | High   |
| 2.4    | Midnight Auto-Reset           | Medium | High   |
| 2.5    | Notifications                 | Medium | High   |
| 3.1    | Focus Mode                    | Low    | Medium |
| 3.2    | Real App Picker               | High   | High   |
| 4.2    | PIN Lock                      | Low    | High   |
| 4.1    | DNS Active Check              | Low    | Medium |
| 2.3    | Icon + Splash                 | Low    | Medium |
| 3.3    | Usage History                 | Medium | Medium |
| 4.3    | Strict Mode                   | Low    | Medium |
| 5.x    | Cloud Sync                    | High   | Low    |
| 6.x    | Play Store Launch             | Medium | High   |

---

## 🧭 Recommended Next Session

Start with **Sprint 2.1 (Onboarding)** + **Sprint 2.2 (Real-time Dashboard)**.  
These are the highest-impact, lowest-effort improvements that make the app feel like a real product instead of a prototype.
