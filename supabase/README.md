# StopAccess Supabase Sync

Supabase stores the backup needed to recover a user's data after uninstall,
reinstall, or a second-device login.

## What syncs

| Data | Synced | Notes |
|---|---|---|
| Block rules | Yes | Daily counters are stripped before upload. |
| Schedules | Yes | Last write wins. |
| Focus session | Yes | Restored after login/startup. |
| Usage history | Yes | Last 30 days are restored from `usage_snapshots`. |
| NextDNS profile ID | Yes | Restores NextDNS config after reinstall. |
| NextDNS API key | Yes | Stored in the user's RLS-protected row. Treat Supabase as sensitive. |

## Files

- `supabase.sql`: the only Supabase SQL file to run. It drops old
  StopAccess sync tables and recreates the current normalized schema.
  The logging triggers now use built-in `md5(...)`, so no extra Postgres
  extension is required.

## Setup

Run `supabase.sql` in Supabase SQL Editor after approving deletion of
old StopAccess sync data. This avoids stale trigger/table definitions and keeps
extension writes aligned with the actual tables.
