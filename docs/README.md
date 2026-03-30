# FocusGate Documentation Hub
> Updated: 30 Mar 2026
> Audience: product, engineering, and release work inside this repo

## What This Folder Is For

This folder is the operating manual for the repo.

It should answer four questions:

1. what FocusGate is trying to become
2. what we should build next
3. how the current repo is structured and recovered
4. which old docs are still useful only as history

## Folder Structure

### Active planning docs

These are the files we should actively use when deciding what to build:

- `product_roadmap_2026.md`
  Strategic product direction across Android, extension, trust, retention, and launch.
- `execution_plan_q2_2026.md`
  Near-term build order for the next major implementation window.
- `future_screens_plan.md`
  Detailed screen-by-screen roadmap for Android and extension.
- `future_ui_system_plan.md`
  Shared design language, content rules, component patterns, and polish work.
- `future_api_platform_plan.md`
  Shared package, sync, NextDNS, and telemetry direction.
- `future_extension_platform_plan.md`
  Extension-specific engineering direction beyond the current baseline.
- `future_launch_growth_plan.md`
  Launch preparation, retention, support, and monetization framing.
- `extension_product_plan.md`
  Why the extension matters in the product and how it should be positioned.
- `extension_execution_backlog.md`
  Practical extension work in Now / Next / Later form.
- `extension_ui_plan.md`
  Screen-by-screen UI direction for the extension popup, services list, focus, insights, and settings.
- `extension_usage_plan.md`
  Detailed usage flows for the popup and page responsibilities.
- `future_plans_index.md`
  Map that ties these planning docs together.

### Reference docs

These explain the current repo or current operating procedures:

- `android_recovery_plan.md`
  Android build, Metro, Gradle, and emulator recovery path.
- `extension_recovery_plan.md`
  Extension structure/build/manual verification steps.
- `release_checklist.md`
  Shared release checklist for Android and extension.
- `privacy_policy.md`
  Product privacy stance and user-facing policy summary.
- `imp/reference/PROJECT_STRUCTURE.md`
  Generated filesystem view of the repo.
- `imp/reference/SYSTEM_MATURITY.md`
  Honest architectural maturity assessment.
- `imp/reference/dns_api.md`
  Safe internal summary of the NextDNS API usage relevant to FocusGate.

### Archive

`docs/archive` is for historical planning docs that are no longer the source of truth.

Important:

- archive does not mean “fully shipped”
- some files are archived because they were superseded
- some files are archived because the repo architecture changed

Read `docs/archive/README.md` before using any archived file.

## How To Use These Docs

### If you are making product decisions

Start with:

1. `product_roadmap_2026.md`
2. `future_plans_index.md`
3. the specific area doc:
   screens, UI, API/platform, extension, or launch

### If you are implementing features

Start with:

1. `execution_plan_q2_2026.md`
2. `extension_execution_backlog.md` if the work is browser-related
3. the detailed area docs for the files you are touching

### If you are fixing something broken

Start with:

1. `android_recovery_plan.md`
2. `extension_recovery_plan.md`
3. `imp/reference/dns_api.md`
4. `imp/reference/PROJECT_STRUCTURE.md`

## Documentation Standards

A doc should clearly state:

- purpose
- current status
- scope
- what files or modules it relates to
- what is active vs historical

Avoid:

- vague “someday” lists with no context
- stale file paths
- repeating the same roadmap in five files
- mixing historical notes with current plan without labeling the difference

## Current Documentation Reality

The docs folder used to contain a mix of:

- prototype-era plans
- partially completed upgrade notes
- superseded UI docs
- new extension-first planning

This rewrite separates those concerns so the docs are easier to trust.
