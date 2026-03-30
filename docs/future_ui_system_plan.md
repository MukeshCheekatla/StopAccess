# Future UI System Plan
> Scope: design language, UI consistency, content style, and interaction polish

## Goal

Create a visual system that feels serious, premium, and trustworthy without looking like another generic productivity app.

## Design Direction

- Keep the product dark and focused, but reduce the current “prototype glass” feel
- Use one strong accent for action, one warning color, one block color, and one success color
- Prioritize clarity over decorative motion

## UI System Work

### Tokens

- Define shared tokens for:
  color, spacing, radius, elevation, icon size, typography scale
- Mirror the same token logic across Android and extension where practical

### Components

- Standardize cards, list rows, toggles, empty states, banners, badges, and section headers
- Build one “protection status” component that exists in both app and extension
- Build one “rule row” pattern with icon, label, scope, state, and action

### Motion

- Add intentional transitions:
  add rule, remove rule, block state change, focus start, sync success, sync fail
- Keep motion short and meaningful

### Empty States

- Replace passive placeholders with guided actions
- Every empty screen should answer:
  what this area does, why it matters, what to do next

### Copy System

- Replace technical phrases with product language where possible
- Use “Blocked on this browser” vs “Profile-wide block” explicitly
- Use “Login to NextDNS” and “Connected to NextDNS” consistently

## Visual Debt To Address

- too many inline layout decisions
- extension popup has strong styling but weak component reuse
- status language is inconsistent across app and extension
- some diagnostics still feel developer-facing instead of user-facing

## Deliverables

1. Shared token reference
2. Shared component inventory
3. Revised status/copy guide
4. Screen-by-screen design cleanup pass

## Success Criteria

- A new feature can be styled from the system instead of one-off CSS or inline styles
- Android and extension feel related, not like two different products
- Error and success states are understandable at a glance
