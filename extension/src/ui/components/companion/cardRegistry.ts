import { type CompanionMood } from './types';

export interface ByteSituation {
  id: string;
  tab?: string; // Optional: Only triggers on this tab
  condition: (data: any) => boolean;
  message: string | string[] | ((data: any) => string);
  mood: CompanionMood;
  priority: number; // Higher number = more important
}

/**
 * Byte's Situation Registry
 *
 * RESTORE CORE IDEA: Byte is a Silent Guardian, not a flooder.
 * He should only speak during high-impact moments.
 */
export const SITUATIONS: ByteSituation[] = [
  {
    id: 'strict_mode_active',
    condition: (data) => data.strictMode === true,
    message: 'Strict Mode: ACTIVE. I have locked the gates. No turning back.',
    mood: 'aiming',
    priority: 950,
  },
  {
    id: 'tracker_massacre',
    condition: (data) => (data.guardian?.totalDenials || 0) > 1000,
    message: (data) =>
      `I've neutralized ${data.guardian.totalDenials} threats today. I'm your digital bodyguard.`,
    mood: 'aiming',
    priority: 850,
  },
  {
    id: 'streak_7day',
    condition: (data) =>
      (data.rules || []).some((r: any) => (r.streakDays || 0) >= 7),
    message: "7+ days of discipline. You're becoming unstoppable.",
    mood: 'victory',
    priority: 510,
  },
  {
    id: 'marathon_focus',
    condition: (data) => (data.focusSession?.elapsedTime || 0) > 7200, // 2 hours
    message: 'Two hours of pure focus. Your brain must be glowing right now.',
    mood: 'surprised',
    priority: 450,
  },
  {
    id: 'apps_empty',
    condition: (data) => (data.rules?.length || 0) === 0,
    message: "Your shield is empty! Add some 'enemies' to start blocking.",
    mood: 'thinking',
    priority: 300,
  },
];

export function evaluateSituations(
  data: any,
  activeTab: string,
): ByteSituation | null {
  const active = SITUATIONS.filter((s) => {
    // Must match tab if tab is specified
    if (s.tab && s.tab !== activeTab) {
      return false;
    }
    return s.condition(data);
  }).sort((a, b) => b.priority - a.priority);

  return active[0] || null;
}
