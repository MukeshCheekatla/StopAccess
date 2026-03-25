/**
 * notifications.ts -- Handles push notifications for limit warnings and blocks.
 */
import notifee, { AndroidImportance } from '@notifee/react-native';
import { formatDuration } from '../utils/time';

const CHANNEL_ID = 'focusgate_alerts';

export async function setupNotifications() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'FocusGate Alerts',
    importance: AndroidImportance.HIGH,
  });
}

export async function notifyWarning(
  appName: string,
  used: number,
  limit: number,
) {
  await notifee.displayNotification({
    title: `⚠️ ${appName}`,
    body: `${formatDuration(used)} / ${formatDuration(
      limit,
    )} used — limit approaching`,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification', // Needs to be added to Android resources later
      pressAction: { id: 'default' },
    },
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
