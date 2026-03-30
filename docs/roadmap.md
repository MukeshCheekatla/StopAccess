# FocusGate — Feature Roadmap

## v1.0 (In Progress)

| # | Feature | Status |
|---|---------|--------|
| 1 | Core rule engine (daily limits, block schedules) | ✅ Done |
| 2 | NextDNS integration (sync, block/unblock via API) | ✅ Done |
| 3 | Magic Setup (auto-extract credentials via WebView) | ✅ Done |
| 4 | 3-tier domain resolution (custom → bundled → heuristic) | ✅ Done |
| 5 | Limit approach notifications (≤10 min warning) | 🔄 In Progress |
| 6 | Insights screen (weekly usage charts, time-saved) | 🔄 In Progress |
| 7 | UI polish (icons in rule list, empty states) | 🔄 In Progress |
| 8 | Fix automated tests | 🔄 In Progress |
| 9 | Release build (signed .aab for Play Store) | ⏳ Pending |

---

## v1.1 (Planned)

- **Strict Session Mode**: Lock the phone completely for a user-defined duration (no exits allowed).
- **Whitelist Contacts**: Allow calls/messages from specific contacts even during a Focus Session.
- **Shared Accountability**: Share your weekly stats with a friend or parent.
- **Widgets**: Home-screen widget showing today's remaining focus budget.

---

## Architecture Notes

- **No Server**: All blocking logic runs on-device; NextDNS is the enforcement layer.
- **BYOK (Bring Your Own Key)**: Every user connects their own free NextDNS account.
- **Storage**: MMKV for low-latency persistent storage of rules, logs, and credentials.
- **Domain Resolution**: 3-tier fallback — custom override, bundled JSON map, package-name heuristic.
