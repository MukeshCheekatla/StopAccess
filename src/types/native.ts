import { AppRule, ScheduleRule } from '@focusgate/types';

/**
 * React Native specific navigation types.
 */
export type RootTabParamList = {
  Dashboard: undefined;
  Apps: undefined;
  Focus: undefined;
  Schedule: undefined;
  Insights: undefined;
  Settings: undefined;
};

/**
 * Native Module bridging types.
 */
export interface RuleEngineModule {
  getProtectionLevel: () => Promise<'STRONG' | 'STANDARD' | 'NONE'>;
  getProtectionWarning: () => Promise<string | null>;
  isDnsEnabled: () => Promise<boolean>;
  isAccessibilityEnabled: () => Promise<boolean>;
  setDnsEnabled: (enabled: boolean) => Promise<void>;
  setBlockedPackages: (packages: string[]) => Promise<void>;
  openAccessibilitySettings: () => void;
}

export * from '@focusgate/types';
