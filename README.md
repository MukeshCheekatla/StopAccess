# FocusGate

> Reclaim your focus. FocusGate blocks distracting apps at the DNS level using NextDNS — making bypasses nearly impossible without your own cooperation.

---

## What It Does

| Feature                | Detail                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| **DNS-level blocking** | Blocks app domains via NextDNS — effective even in browsers      |
| **Usage limits**       | Automatically blocks an app once its daily time limit is reached |
| **Focus sessions**     | Pomodoro-style timer that enforces blocking for a set duration   |
| **Schedules**          | Block app groups on a recurring day/time schedule                |
| **Strict Mode**        | Requires a 60-second cooldown before any block can be downgraded |
| **Guardian PIN**       | Locks the app list and settings against impulsive changes        |
| **Sync health**        | Live status card showing NextDNS connection health               |
| **Weekly insights**    | 7-day screen-time bar chart, focus streak, and block count       |

---

## Requirements

- Android 7.0+ (API 24+)
- A [NextDNS](https://nextdns.io) account (free tier is sufficient)
- Usage Access permission (granted during onboarding)

---

## Developer Setup

This repository is organized as a lightweight monorepo:

- `.`: the active React Native mobile app
- `extension/`: browser extension workspace
- `packages/core`: shared business logic exports
- `packages/types`: shared TypeScript types
- `packages/ui`: shared UI export surface

### Prerequisites

```
Node.js 18+
JDK 17
Android SDK (API 34)
React Native CLI
```

### Install

```bash
git clone <repo-url>
cd gate
npm install
```

### Run (debug)

```bash
npx react-native run-android
```

### Lint & type-check

```bash
npm run lint
npx tsc --noEmit
```

---

## Environment

Copy `.env.example` to `.env` — no secrets are stored here; credentials are entered by the user at runtime and stored in MMKV.

---

## Release Build

### 1. Create a keystore (first time only)

```bash
keytool -genkeypair -v \
  -keystore focusgate-release.jks \
  -alias focusgate \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Store the keystore file outside the repository.

### 2. Add credentials to `android/local.properties`

```
RELEASE_STORE_FILE=/path/to/focusgate-release.jks
RELEASE_STORE_PASSWORD=yourpassword
RELEASE_KEY_ALIAS=focusgate
RELEASE_KEY_PASSWORD=yourkeypassword
```

> ⚠️ `local.properties` is git-ignored. Never commit it.

### 3. Build the release APK / AAB

```bash
# APK
cd android && ./gradlew assembleRelease

# AAB (required for Play Store)
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/`

---

## Architecture

```
src/
  api/         nextdns.ts         — NextDNS REST client with retry/backoff
  components/                    — Shared UI components
  engine/      ruleEngine.ts      — Rule evaluation loop (60s interval)
  modules/     usageStats.ts      — Android UsageStatsManager bridge
               installedApps.ts  — Installed app list bridge
  screens/                       — One file per tab screen
  services/    logger.ts          — Persistent in-app log store
               notifications.ts  — Local push notifications
  store/       rules.ts           — App rule CRUD (MMKV)
               schedules.ts       — Schedule CRUD (MMKV)
               syncState.ts       — Live sync health state
               strictMode.ts      — Strict mode + cooldown store
               insights.ts        — Daily snapshot store (30 days)
               storage.ts         — MMKV instance
  types/       index.ts           — Shared TypeScript interfaces
  utils/                         — time, text helpers
android/
  app/src/main/
    java/com/focusgate/
      BootReceiver.kt            — Sets reboot_recovery_pending flag on boot
    AndroidManifest.xml
```

### Key Design Decisions

- **Headless boot recovery** — `BootReceiver` stamps a flag; JS clears it on startup and calls `startRuleEngine()`. Avoids Android 10+ background launch restrictions.
- **Single sync source of truth** — All NextDNS operations update `syncState` in MMKV. Both the engine and UI react to the same state.
- **Strict Mode cooldown** — Timer is persisted as a millisecond timestamp so it survives app restarts.

---

## Permissions

| Permission               | Reason                                              |
| ------------------------ | --------------------------------------------------- |
| `PACKAGE_USAGE_STATS`    | Measure per-app screen time to enforce daily limits |
| `RECEIVE_BOOT_COMPLETED` | Restore protection after device restart             |
| `POST_NOTIFICATIONS`     | Warn user when approaching or reaching a limit      |
| `INTERNET`               | Sync block rules with NextDNS API                   |

---

## License

MIT
