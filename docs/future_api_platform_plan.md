# Future API And Platform Plan
> Scope: NextDNS integration, sync model, contracts, diagnostics, and reliability

## Goal

Make FocusGate’s platform layer resilient enough that users trust enforcement, understand failures, and can recover without guessing.

## NextDNS Roadmap

### Connection Layer

- Add a single typed API client contract for:
  test connection, denylist, services, categories, logs, analytics
- Normalize responses and errors
- Distinguish:
  auth error, rate limit, validation error, network failure, profile mismatch

### Sync Layer

- Make sync intent explicit:
  browser-only, hybrid, profile-wide
- Track local desired state separately from remote observed state
- Add reconciliation jobs instead of only immediate fire-and-forget sync

### Diagnostics

- Persist:
  last success, last failure, last push, last pull, changed items count
- Add structured sync events for every operation
- Add a user-facing explanation for partial success

## Contract Work

### Shared Types

- tighten `AppRule`, `ScheduleRule`, sync-state, diagnostics-state, and remote-toggle types
- add explicit types for NextDNS services/categories/logs rows

### Package Boundaries

- keep `packages/core` pure business logic
- keep `packages/state` focused on persistence helpers
- keep `packages/sync` focused on orchestration and reconciliation
- avoid UI-specific assumptions in shared packages

## Android Platform Work

- boot recovery hardening
- background reliability validation
- usage access verification flow
- notification reliability for warnings and hard blocks

## Extension Platform Work

- better service-worker lifecycle recovery
- persistent sync queue for extension-side state changes
- stronger DNR rule management and audit
- optional streaming/log-based verification if NextDNS usage supports it

## Suggested Build Order

1. Typed NextDNS entities
2. Unified error model
3. Sync telemetry state
4. Reconciliation engine
5. Better diagnostics UI
6. Optional streaming/log enhancements
