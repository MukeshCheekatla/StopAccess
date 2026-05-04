import { VMPlatformDependencies } from '@stopaccess/viewmodels/types';
import { storageAdapter } from '../store/storageAdapter';
import * as nextDNSApi from '../api/nextdns';

export const mobileVMDeps: VMPlatformDependencies = {
  storage: storageAdapter,
  nextDNSApi: nextDNSApi as any,
  sendCommand: async (action: string, _payload?: any) => {
    // Mobile implementation of commands
    if (action === 'manualSync') {
      // Logic for manual sync on mobile
      return;
    }
    if (action === 'startFocus') {
      // Logic to start focus via RuleEngine or other native modules
      return;
    }
    // ... other commands
    return;
  },
  getPlatformRules: async () => {
    // Mobile doesn't use DNR rules
    return [];
  },
};
