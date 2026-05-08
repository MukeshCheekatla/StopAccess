/**
 * notifications.ts -- Handles push notifications for limit warnings and blocks.
 */
import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'StopAccess_alerts';

export async function setupNotifications() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'StopAccess Alerts',
    importance: AndroidImportance.HIGH,
  });
}

export async function notifyBlocked(appName: string) {
  await notifee.displayNotification({
    title: `🔴 ${appName} blocked`,
    body: 'You hit your daily limit. Unblocks at midnight.',
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });
}

export async function notifyReset() {
  await notifee.displayNotification({
    title: '🌅 Fresh start!',
    body: 'All daily limits have reset. Good morning.',
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });
}
