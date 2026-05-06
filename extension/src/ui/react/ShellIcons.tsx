import React from 'react';
import { UI_ICONS } from '../theme/uiTokens';

// ── Theme toggle icons ─────────────────────────────────────────

export const SunIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: UI_ICONS.SUN }}
  />
);

export const MonitorIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: UI_ICONS.MONITOR }}
  />
);

export const MoonIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: UI_ICONS.MOON }}
  />
);

export const SignOutIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: UI_ICONS.SIGN_OUT }}
  />
);
