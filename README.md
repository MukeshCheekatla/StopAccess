# StopAccess

StopAccess is a cross-device blocking and protection tool for people who want their limits to actually hold. It combines Android app enforcement, browser website blocking, NextDNS profile-wide rules, schedules, focus sessions, privacy/security controls, and diagnostics in one product.

---

## What It Does

| Area | What StopAccess does |
| --- | --- |
| **Android app blocking** | Tracks foreground app usage, applies daily limits, and uses accessibility plus overlay protection to stop blocked apps from being used. |
| **Browser website blocking** | Blocks selected domains and services inside the extension, with quick controls for common distractions. |
| **NextDNS enforcement** | Syncs services, denylist entries, security settings, privacy blocklists, TLD rules, and profile-wide controls through the NextDNS API. |
| **Focus sessions** | Starts timed sessions that temporarily enforce selected app and site rules. |
| **Schedules** | Runs recurring rules for work, school, sleep, or custom time windows. |
| **Strict Mode and Guardian PIN** | Adds friction before sensitive settings, blocks, or active sessions can be weakened. |
| **Security and privacy controls** | Exposes NextDNS security toggles, tracker blocking, native tracking protections, blocklists, and domain coverage checks. |
| **Diagnostics and sync health** | Shows connection state, recent actions, logs, rule coverage, and protection health so failures are visible. |
| **Insights** | Summarizes usage, blocks, focus streaks, and weekly activity to show whether the system is helping. |

StopAccess has two enforcement scopes:

- **Local protection**: Android accessibility/overlay blocking and browser extension rules on the current device.
- **Profile-wide protection**: NextDNS settings that can affect every device using the same NextDNS profile.

The product should always make that scope clear before changing profile-wide settings.

---

## Requirements

- Android 7.0+ (API 24+)
- A [NextDNS](https://nextdns.io) account for cloud/profile-wide enforcement
- Usage Access permission for Android usage limits
- Accessibility and overlay permissions for stronger Android blocking

---

## Developer Setup

This repository is organized as a lightweight monorepo:

- `.`: the active React Native mobile app
- `extension/`: browser extension workspace
- `packages/core`: shared API/domain logic
- `packages/state`: shared state and persistence helpers
- `packages/sync`: sync orchestration
- `packages/types`: shared TypeScript contracts
- `packages/viewmodels`: shared screen behavior for app and extension surfaces

### Prerequisites

```text
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

### Run

```bash
npx react-native run-android
```

### Lint, Type-Check, And Extension Verification

```bash
npm run lint
npm run typecheck
npm run verify:extension
```

---

## Environment

Copy `.env.example` to `.env`. No secrets are stored here; credentials are entered by the user at runtime and stored locally.

---

## Release Build

### 1. Create a keystore

```bash
keytool -genkeypair -v \
  -keystore StopAccess-release.jks \
  -alias StopAccess \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Store the keystore file outside the repository.

### 2. Add credentials to `android/local.properties`

```text
RELEASE_STORE_FILE=/path/to/StopAccess-release.jks
RELEASE_STORE_PASSWORD=yourpassword
RELEASE_KEY_ALIAS=StopAccess
RELEASE_KEY_PASSWORD=yourkeypassword
```

`local.properties` is git-ignored. Never commit it.

### 3. Build the release APK / AAB

```bash
# APK
cd android && ./gradlew assembleRelease

# AAB
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/`

---

## Architecture

```text
src/
  api/         nextdns.ts         - NextDNS REST client with retry/backoff
  components/                    - Shared UI components
  engine/      nativeEngine.ts    - Rule evaluation and native bridge coordination
  modules/     usageStats.ts      - Android UsageStatsManager bridge
               installedApps.ts  - Installed app list bridge
  screens/                       - Android tab and settings screens
  services/    logger.ts          - Persistent in-app log store
               notifications.ts  - Local notifications
  store/       storageAdapter.ts  - App storage adapter
  types/       native.ts          - Native navigation and bridge types
  utils/                         - Time and text helpers
android/
  app/src/main/
    java/com/stopaccess/          - Native Android modules and services
extension/
  src/background/                 - Browser runtime, DNR, sync, and session guard
  src/screens/                    - Extension dashboard, apps, focus, privacy, security, settings
packages/
  core/                           - NextDNS API, domain mapping, rules, insights
  state/                          - Local state helpers
  sync/                           - Sync orchestration
  types/                          - Shared contracts
  viewmodels/                     - Shared UI behavior
```

### Key Design Decisions

- **Layered enforcement** - Android local blocking, browser local blocking, and NextDNS profile-wide blocking work together but are different scopes.
- **Visible health** - The UI should show whether protection, accessibility, cloud sync, and recent rule changes are working.
- **Friction for weakening rules** - Strict Mode and Guardian PIN make sensitive changes harder to do impulsively.
- **Shared logic** - Core rule, NextDNS, state, and view model code lives in packages so the Android app and extension stay aligned.

---

## Permissions

| Permission | Reason |
| --- | --- |
| `PACKAGE_USAGE_STATS` | Measure per-app screen time to enforce daily limits. |
| Accessibility service | Detect foreground app changes and trigger blocking. |
| Overlay permission | Show the block screen over blocked apps. |
| `RECEIVE_BOOT_COMPLETED` | Restore protection after device restart. |
| Notifications | Warn when rules, limits, or protection states need attention. |
| `INTERNET` | Sync block rules and settings with NextDNS. |

---

## License

MIT
