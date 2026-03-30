# FocusGate Release Checklist

> Run through this list for every release before uploading to the Play Store.

---

## 1. Code Quality

- [ ] `npm run lint` — zero errors, zero warnings
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] All new screens/components reviewed for inline styles (eslint `no-inline-styles`)

---

## 2. Version Bump

- [ ] `android/app/build.gradle` — increment `versionCode` (integer, always increases)
- [ ] `android/app/build.gradle` — update `versionName` (semver, e.g. `1.1.0`)
- [ ] `package.json` — update `version` to match `versionName`
- [ ] Commit the version bump: `git commit -m "chore: bump version to 1.x.x (build N)"`
- [ ] Tag the commit: `git tag v1.x.x`

---

## 3. Release Build

```bash
# Clean previous outputs
cd android && ./gradlew clean

# Build AAB (required for Play Store)
./gradlew bundleRelease

# Optionally also build APK for sideload testing
./gradlew assembleRelease
```

Output paths:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 4. Signing Verification

```bash
# Verify AAB is signed with the release key (not the debug key)
jarsigner -verify -verbose -certs \
  android/app/build/outputs/bundle/release/app-release.aab
```

Confirm the certificate CN matches your keystore alias.

---

## 5. Manual Smoke Test (release APK)

Install the release APK on a clean device or emulator:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Test flow:

- [ ] Fresh install → Onboarding completes without crash
- [ ] Enter valid NextDNS credentials → "Connected!" confirmation
- [ ] Add an app → it appears in Controlled Apps
- [ ] Set a 1-minute limit → limit badge shows correctly
- [ ] Block an app manually → block confirmed in NextDNS dashboard
- [ ] Force-stop and reopen → engine still running (check System Logs)
- [ ] Reboot device → `reboot_recovery_pending` flag set (verify via logs on next open)
- [ ] Settings → Protection Health → all 4 checks green
- [ ] Settings → Test DNS Block → "Protected" result
- [ ] Focus session → completes → Weekly Insights shows session count

---

## 6. Play Store Listing

### Required Assets

| Asset | Size |
|---|---|
| App icon (PNG, no alpha) | 512 × 512 px |
| Feature graphic | 1024 × 500 px |
| Phone screenshots (2–8) | 1080 × 1920 px min |

### Store Listing Copy

**Title** (≤30 chars): `FocusGate — App Blocker`

**Short description** (≤80 chars):
> Block distracting apps at DNS level. Set limits, enforce focus, break habits.

**Full description** (≤4000 chars): *(see `docs/store_description.md` — create before submission)*

**Category**: `Productivity`

**Content rating**: Complete the IARC questionnaire — expected rating: **Everyone**

---

## 7. Privacy & Compliance

- [ ] Privacy Policy URL set in Play Console (use `docs/privacy_policy.md` hosted on GitHub Pages or similar)
- [ ] Permissions declaration in Play Console matches `AndroidManifest.xml`
- [ ] `PACKAGE_USAGE_STATS` — explain use case in "Prominent disclosure" screen or Play Console declaration
- [ ] No user data leaves the device (all storage in MMKV, NextDNS credentials sent only to `api.nextdns.io`)

---

## 8. Play Console Upload

- [ ] Create new release in Play Console → Internal Testing track first
- [ ] Upload `app-release.aab`
- [ ] Fill in "What's new in this release" release notes
- [ ] Submit for review (Internal Testing does not require review)
- [ ] Promote to Closed Testing → Open Testing → Production after validation

---

## 9. Post-Release

- [ ] Monitor Play Console → Android vitals for crash rate (target: <1%)
- [ ] Monitor Play Console → Ratings & Reviews for first-day feedback
- [ ] Check NextDNS API rate-limit errors in user reports (sync backoff is already implemented)
- [ ] If crash rate spikes: use `adb logcat` or Crashlytics (integrate before production rollout)

---

## Rollback

If a critical bug is found after production rollout:

1. Play Console → Release → Halt rollout
2. Fix and re-test locally
3. Bump `versionCode` (never reuse a code)
4. Upload new AAB and resume rollout at a lower % (e.g. 10%)
