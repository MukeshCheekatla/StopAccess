# StopAccess Extension Privacy Notes

StopAccess needs broad browser permissions so it can provide user-facing blocking, focus, diagnostics, and protection features.

## Data Used

- **Browsing activity**: the extension can read the active tab, visited domains, and browser history when needed to detect current sites, enforce rules, show recent activity, and explain whether a domain is covered.
- **NextDNS profile data**: when a user connects a NextDNS profile, StopAccess sends the user's configured rules and settings to the NextDNS API so profile-wide service, domain, privacy, and security controls can work.
- **Local rule data**: blocked sites, services, schedules, focus sessions, Guardian PIN state, strict mode state, logs, and sync status are stored locally in extension storage.

## Analytics

StopAccess does not include third-party analytics SDKs such as Google Analytics, Segment, Mixpanel, Amplitude, PostHog, Plausible, Sentry, Hotjar, or Datadog browser intake. Product analytics shown inside the extension are derived from local rule history and NextDNS data for the user's own profile.

## Third Parties

StopAccess talks to NextDNS for profile sync when the user connects credentials. It may load public service icons or favicons from configured icon providers to make blocked services recognizable. It does not sell browsing activity, use browsing activity for ads, or transfer browsing activity to analytics companies.

## Security

Remote API calls use HTTPS. Sensitive credentials are stored by the browser extension storage layer and are used only for the user's requested NextDNS sync features.
