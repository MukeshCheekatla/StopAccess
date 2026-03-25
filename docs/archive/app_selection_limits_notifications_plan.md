# FocusGate — App Selection, Smart Limits & Notifications Plan
> Written: 24 Mar 2026  
> Status: Production — not a prototype

---

## 🎯 Problems This Solves

| Problem | Current State | Target State |
|---------|--------------|--------------|
| Hardcoded app list | User can only pick from 15 apps we hardcoded | User sees ALL apps installed on their phone |
| Limit input | Slider in seconds/minutes (confusing) | Clean input: "2 hours 30 minutes" |
| No usage context | User sets limit blindly | Show current avg daily usage BEFORE setting limit |
| No notifications | User doesn't know they're close to limit | Push notification at 80%, 100% of limit |
| No domain mapping | Some apps won't block if not in our list | Gracefully handle unmapped apps |

---

## 📦 Part 1 — User-Selectable Apps (Any Installed App)

### How It Works

Instead of showing our hardcoded 15 apps, we:
1. Fetch ALL installed apps from Android via native module
2. Show them in a searchable list with real icons
3. User ADDS the apps they want to control
4. We only track + block what they added

### Flow

```
Apps Screen
  └── "+" button → App Picker modal
        └── Shows ALL installed apps (searchable)
              └── User taps app → Added to "My Apps"
                    └── User sets mode + limit
```

### Native Module — `InstalledAppsModule.kt`

```kotlin
@ReactModule(name = "InstalledApps")
class InstalledAppsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "InstalledApps"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val apps = pm.queryIntentActivities(intent, 0)
            .sortedBy { it.loadLabel(pm).toString() }

        val result = Arguments.createArray()
        for (app in apps) {
            val pkg = app.activityInfo.packageName
            // Skip system/FocusGate itself
            if (pkg == "com.focusgate") continue

            val label = app.loadLabel(pm).toString()
            val icon  = app.loadIcon(pm)
            val iconB64 = iconToBase64(icon)

            val map = Arguments.createMap().apply {
                putString("packageName", pkg)
                putString("appName", label)
                putString("iconBase64", iconB64)
            }
            result.pushMap(map)
        }
        promise.resolve(result)
    }

    private fun iconToBase64(drawable: Drawable): String {
        val bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, 96, 96)
        drawable.draw(canvas)
        val baos = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 85, baos)
        return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    }
}
```

### What Happens for Unmapped Apps (No Domain)

Some apps won't be in our `DOMAIN_MAP` (e.g. niche games).

**Strategy:**
- If the app is NOT in `DOMAIN_MAP`, show a warning:
  > "⚠️ FocusGate can block this app's internet, but blocking may be partial"
- Allow user to add a **custom domain** for the app manually
- Store custom domains in MMKV: `custom_domain_${packageName}`

---

## ⏱️ Part 2 — Smart Limit Setting

### Current Problem
- Limit is set with a slider, in minutes, with no context
- User doesn't know if "30 min" is too strict or too lenient

### New Limit Setup Flow

When user taps an app to set a limit:

**Step 1 — Show Current Usage**
```
┌─────────────────────────────────┐
│  📱 Instagram                   │
│  ━━━━━━━━━━━━━━━━━━━━━         │
│  Your avg daily usage: 1h 42m  │
│  Today: 38 min used             │
└─────────────────────────────────┘
```
Fetch from `UsageStatsManager` → last 7 days average → display in plain English.

**Step 2 — Set Limit**

NOT a slider. Use a time picker with two spinners (hours + minutes):
```
┌──────────────────────────┐
│   Limit Instagram to:    │
│                          │
│    [ 1 hr ] [ 30 min ]   │
│                          │
│   ← less      more →     │
│  Current avg: 1h 42m     │
│                          │
│  [  Set Limit  ]         │
└──────────────────────────┘
```

**Step 3 — Confirm**
Show what will happen:
> "When you use Instagram for 1h 30m today, it will be blocked until midnight."

**Key UI rules:**
- Always show in **hours + minutes** (never raw minutes or seconds)
- `formatDuration(90)` → `"1h 30m"` not `"90 min"`
- If user sets 0 → means "Always allow" (no limit)
- Min limit: 10 minutes (prevent accidental perma-block)

### Updated `formatDuration` utility

```typescript
// src/utils/time.ts
export function formatDuration(minutes: number): string {
  if (minutes <= 0)  return 'No limit';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatUsage(minutes: number): string {
  if (minutes < 1)   return 'Not used today';
  return formatDuration(minutes);
}
```

---

## 🔔 Part 3 — Notifications

### Notification Types

| Trigger | Message | Action |
|---------|---------|--------|
| 80% of limit reached | "Instagram: 1h 12m / 1h 30m used" | Tap → opens app |
| 100% — just blocked | "Instagram is now blocked for today" | Tap → opens FocusGate |
| Focus session started | "Focus session active — apps blocked" | Tap → opens Focus screen |
| Midnight reset | "Daily limits reset. Fresh start! 🎉" | Tap → opens Dashboard |

### Implementation

**Package:** `@notifee/react-native` (best Android notification library)

```bash
npm install @notifee/react-native
```

**Notification Service (`src/services/notifications.ts`)**

```typescript
import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'focusgate_alerts';

export async function setupNotifications() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'FocusGate Alerts',
    importance: AndroidImportance.HIGH,
  });
}

export async function notifyWarning(appName: string, used: number, limit: number) {
  await notifee.displayNotification({
    title: `⚠️ ${appName}`,
    body: `${formatDuration(used)} / ${formatDuration(limit)} used — limit approaching`,
    android: { channelId: CHANNEL_ID, smallIcon: 'ic_notification' },
  });
}

export async function notifyBlocked(appName: string) {
  await notifee.displayNotification({
    title: `🔴 ${appName} blocked`,
    body: `You hit your daily limit. Unblocks at midnight.`,
    android: { channelId: CHANNEL_ID, smallIcon: 'ic_notification' },
  });
}

export async function notifyReset() {
  await notifee.displayNotification({
    title: '🌅 Fresh start!',
    body: 'All daily limits have reset. Good morning.',
    android: { channelId: CHANNEL_ID, smallIcon: 'ic_notification' },
  });
}
```

**Wire into ruleEngine.ts:**
```typescript
// In runChecks(), after blocking:
if (usedMinutes >= rule.dailyLimitMinutes && !rule.blockedToday) {
  await nextDNS.blockApp(rule.appName);
  await notifyBlocked(rule.appName);         // ← NEW
  updated.blockedToday = true;
}

// Warning at 80%:
const pct = usedMinutes / rule.dailyLimitMinutes;
if (pct >= 0.8 && pct < 1.0 && !rule.warningSent) {
  await notifyWarning(rule.appName, usedMinutes, rule.dailyLimitMinutes);
  updated.warningSent = true;                // ← needs new field in AppRule type
}
```

### Notification Permission (Android 13+)

Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

Request at runtime on first launch (onboarding step).

---

## 🗂️ Data Model Changes

### Updated `AppRule` type

```typescript
// src/types.ts
export interface AppRule {
  appName:          string;
  packageName:      string;
  mode:             'allow' | 'limit' | 'block';
  dailyLimitMinutes: number;   // 0 = no limit
  blockedToday:     boolean;
  usedMinutesToday: number;
  warningSent:      boolean;   // NEW — prevent duplicate warnings
  customDomain?:    string;    // NEW — user-provided domain for unmapped apps
  iconBase64?:      string;    // NEW — cached icon
  addedByUser:      boolean;   // NEW — false = was default, true = user added
}
```

---

## 🧩 New Files to Create

| File | Purpose |
|------|---------|
| `android/.../InstalledAppsModule.kt` | Fetch all installed apps + icons |
| `android/.../InstalledAppsPackage.kt` | Register module |
| `src/modules/installedApps.ts` | JS bridge |
| `src/services/notifications.ts` | All notification logic |
| `src/utils/time.ts` | `formatDuration`, `formatUsage` |
| `src/screens/AppPickerModal.tsx` | Full-screen app picker |
| `src/components/LimitPicker.tsx` | Hour + minute spinner |
| `src/components/AppIconImage.tsx` | Renders base64 icon |

---

## 🏗️ Build Order

```
1. InstalledAppsModule.kt + package registration
2. JS bridge + icon caching
3. AppIconImage component
4. AppPickerModal (search + tap to add)
5. LimitPicker component (hr + min spinners)
6. Show current avg usage in limit setup
7. Update AppRule type (warningSent, addedByUser, iconBase64)
8. Install @notifee/react-native
9. notifications.ts service
10. Wire notifications into ruleEngine.ts
11. Request POST_NOTIFICATIONS permission in onboarding
```

**Estimated time: 1–2 days of focused coding.**
