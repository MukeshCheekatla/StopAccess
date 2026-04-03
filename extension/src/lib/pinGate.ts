import { toast } from './toast';
import { extensionAdapter as storage } from '../background/platformAdapter';

export interface PinGateResult {
  allowed: boolean;
  reason?: string;
}

export const pinGate = {
  async checkPin(actionName: string): Promise<PinGateResult> {
    const currentPin = await storage.getString('guardian_pin');
    if (!currentPin) {
      return { allowed: true };
    }

    const challenge = prompt(
      `Authorize Action: ${actionName}\nEnter Guardian PIN:`,
    );
    if (challenge === currentPin) {
      return { allowed: true };
    }

    toast.error('UNAUTHORIZED: Shield remains active.');
    return { allowed: false, reason: 'INVALID_PIN' };
  },

  async setPin(newPin: string): Promise<boolean> {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be 4 digits.');
      return false;
    }
    await storage.set('guardian_pin', newPin);
    toast.success('Security layer active.');
    return true;
  },

  async clearPin(): Promise<boolean> {
    const currentPin = await storage.getString('guardian_pin');
    if (!currentPin) {
      return true;
    }

    const challenge = prompt('Enter 4-digit PIN to deactivate security:');
    if (challenge === currentPin) {
      await storage.delete('guardian_pin');
      toast.info('Security layer offline.');
      return true;
    }

    if (challenge !== null) {
      toast.error('Access Denied');
    }
    return false;
  },
};
