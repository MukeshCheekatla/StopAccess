/**
 * Lifecycle status of a focus session
 */
export type SessionStatus =
  | 'idle'
  | 'focusing'
  | 'paused'
  | 'break'
  | 'completed'
  | 'cancelled';

/**
 * Initial configuration for a session
 */
export interface FocusSessionConfig {
  duration: number; // minutes
  breakDuration?: number; // minutes
  blockedDomains: string[];
}

/**
 * Persistence record of a single focus session
 */
export interface FocusSessionRecord {
  id: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  duration: number; // total focus minutes
  actualMinutes?: number;
  breakDuration: number;
  blockedDomains: string[];
  elapsed: number; // total seconds focusing before current segment
  lastActivatedAt?: number; // timestamp when current focusing segment started
  blockedAtStart?: {
    denylist: string[];
    services: string[];
    categories: string[];
  };
  blockBypassEnabled?: boolean;
}
