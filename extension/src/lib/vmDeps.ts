import { VMPlatformDependencies } from '@stopaccess/viewmodels/types';
import { extensionAdapter, nextDNSApi } from '@/background/platformAdapter';

declare var chrome: any;

export const extensionVMDeps: VMPlatformDependencies = {
  storage: extensionAdapter,
  nextDNSApi: nextDNSApi as any,
  sendCommand: (action: string, payload?: any) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, ...payload }, (res: any) => {
        resolve(res);
      });
    });
  },
  getPlatformRules: () => {
    return new Promise((resolve) => {
      if (chrome?.declarativeNetRequest?.getDynamicRules) {
        chrome.declarativeNetRequest.getDynamicRules(resolve);
      } else {
        resolve([]);
      }
    });
  },
};
