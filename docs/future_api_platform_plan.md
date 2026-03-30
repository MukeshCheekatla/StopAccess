# Future API And Platform Plan
> Updated: 30 Mar 2026
> Scope: shared packages, NextDNS integration, sync architecture, diagnostics, and recovery

## Purpose

This document explains the platform layer we want, not just the features we want.

The main objective is to make Android and extension rely on the same trustworthy contracts instead of growing separate logic.

## Shared Package Responsibilities

### `packages/core`

Should contain:
- pure business logic
- NextDNS client and helpers
- domain/service/category mapping logic
- insights logic
- rule evaluation

Should not contain:
- React Native UI assumptions
- Chrome-specific UI assumptions

### `packages/state`

Should contain:
- persistence helpers
- rule/schedule/sync-state storage adapters
- merge-safe local data helpers

### `packages/sync`

Should contain:
- orchestration
- push/pull and reconciliation flows
- sync-state updates
- retry-safe sequencing

### `packages/types`

Should contain:
- rule contracts
- sync contracts
- NextDNS entity types
- diagnostics types

## NextDNS Client Direction

The shared NextDNS layer should:

- expose typed success/error results
- handle empty-body success responses safely
- distinguish:
  auth error, validation error, rate limit, server error, network failure, profile mismatch
- keep low-level HTTP separate from higher-level product helpers

## Sync Model Direction

The sync model should track:

- local desired state
- remote observed state
- last successful sync
- last failed sync
- last push
- last pull
- changed item count
- recent errors

This should be visible in both Android and extension.

## Diagnostics Direction

We should be able to answer:

- what the user asked the product to do
- what was sent to NextDNS
- what NextDNS returned
- what the current enforced state is
- why the UI thinks protection is active or broken

## High-Priority Work

1. settle exports used by Android and extension
2. settle sync-state contract and persistence
3. settle diagnostics presentation
4. settle manual sync and reconciliation behavior

## High-Risk Areas

- silent export drift between package APIs and consumers
- extension background logic calling missing shared methods
- Android and extension modeling sync differently
- stale docs referencing deleted pre-package files
