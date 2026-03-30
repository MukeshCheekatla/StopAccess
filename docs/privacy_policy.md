# FocusGate Privacy Policy

*Last updated: March 2026*

---

## Overview

FocusGate is a productivity app designed to help you control your screen time by blocking distracting apps at the network (DNS) level. Your privacy is a core design requirement, not an afterthought.

**Summary: All your data stays on your device. FocusGate does not collect, transmit, or sell any personal information.**

---

## Data We Collect

### On-Device Only

FocusGate stores the following data **locally on your device**, using encrypted MMKV storage:

| Data | Purpose | Leaves Device? |
|---|---|---|
| App usage statistics (minutes per app per day) | Enforcing daily time limits | ❌ No |
| Daily usage snapshots (screen time, block count, focus sessions) | Weekly insights dashboard | ❌ No |
| App blocking rules and schedules | Enforcing your configured limits | ❌ No |
| NextDNS Profile ID and API Key | Authenticating with NextDNS API | ❌ No* |
| Guardian PIN (hashed) | Protecting settings from impulsive changes | ❌ No |
| System logs (sync events, engine actions) | In-app diagnostics | ❌ No |

*\* Your NextDNS API Key is sent **only** to `api.nextdns.io` (NextDNS's official API endpoint) to manage your block rules. It is never sent to us or any third party.*

### What We Do NOT Collect

- We do not collect names, email addresses, or account information
- We do not track app usage for advertising or analytics
- We do not use any third-party analytics SDK (no Firebase Analytics, no Mixpanel, etc.)
- We do not send crash reports automatically (crashes are only visible to you via `adb logcat`)

---

## Permissions Explained

| Permission | Why It's Needed |
|---|---|
| **Usage Access** (`PACKAGE_USAGE_STATS`) | Required to measure how long each app has been open today. This is the core mechanism for enforcing daily time limits. The system shows a prominent disclosure before you grant this. |
| **Receive Boot Completed** (`RECEIVE_BOOT_COMPLETED`) | Allows FocusGate to restore protection after your phone restarts, so blocks are not silently lifted by a reboot. |
| **Post Notifications** (`POST_NOTIFICATIONS`) | Sends a local notification when you are approaching or have hit a daily app limit. No notifications are sent to any server. |
| **Internet** (`INTERNET`) | Required to call the NextDNS API (`api.nextdns.io`) to add or remove domain blocks in real time. No other network requests are made. |

---

## NextDNS Integration

FocusGate uses [NextDNS](https://nextdns.io) as its blocking engine. When you use FocusGate:

- Your **Profile ID** and **API Key** are stored locally and used to call the NextDNS REST API
- The only data sent to NextDNS is: which domains to block or unblock on **your own profile**
- NextDNS is a separate service with its own [Privacy Policy](https://nextdns.io/privacy)
- FocusGate is not affiliated with NextDNS

---

## Data Retention and Deletion

- All data is stored on-device. Uninstalling FocusGate deletes all associated data.
- Daily snapshots are automatically pruned after 30 days.
- System logs are retained until you clear them manually via Settings → System Logs → Clear All.

---

## Children's Privacy

FocusGate is not directed at children under 13, and we do not knowingly collect any data from children.

---

## Changes to This Policy

If we update this policy, the new version will be published here with an updated date. Continued use of the app after changes constitutes acceptance.

---

## Contact

Questions about privacy? Open an issue on GitHub or email: **[your-support-email@domain.com]**
