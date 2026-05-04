import { StorageAdapter, NextDNSApiClient } from '@stopaccess/types';

export interface VMPlatformDependencies {
  storage: StorageAdapter;
  nextDNSApi: NextDNSApiClient;
  sendCommand(action: string, payload?: any): Promise<any>;
  getPlatformRules(): Promise<any[]>;
}
