import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '@/src/domain/notification-schedule';
import type { NotificationCategory } from '@/src/domain/types';
import type { NotificationScheduler } from './notification-scheduler';

/**
 * Android notification channels, one per category (§3.21.2 per-category
 * toggles, in the place Android users actually look for them). Separate channels
 * mean someone can silence check-ins from the system settings without silencing
 * reminders — the same control the settings screen offers, honoured by the OS.
 *
 * DEFAULT importance, not HIGH: an invitation that takes over the screen is not
 * an invitation. Nothing here is urgent, and the channel is where that gets
 * said to the OS.
 */
const CHANNELS: Record<NotificationCategory, { id: string; name: string; description: string }> = {
  reminder: {
    id: 'reminders',
    name: 'Session reminders',
    description: 'A gentle nudge when a session is waiting for you.',
  },
  're-engagement': {
    id: 'check-ins',
    name: 'Check-ins',
    description: 'A warm hello if it has been a while.',
  },
};

let channelsReady: Promise<void> | null = null;

/** Create the Android channels once per app run. A no-op on other platforms. */
function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }
  channelsReady ??= Promise.all(
    Object.values(CHANNELS).map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  ).then(() => undefined);
  return channelsReady;
}

/**
 * The real OS delivery boundary, backed by expo-notifications' local scheduling.
 *
 * Everything is a **DATE trigger**: one notification, one fixed moment, computed
 * by the domain. No repeating triggers, which matters more than it looks — a
 * repeating trigger would keep firing after the user completed the week or ran
 * that day, and the app would be nagging someone it promised not to nag. The
 * plan's job is to be re-derived often; the OS's job is only to deliver what it
 * was last told.
 *
 * Cancel-then-schedule is safe to repeat: `cancelAllScheduledNotificationsAsync`
 * clears only *this app's* pending local notifications, and one already
 * delivered is untouched by it.
 */
export const expoNotificationScheduler: NotificationScheduler = {
  async replaceAll(plan: PlannedNotification[]): Promise<void> {
    await ensureChannels();
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const planned of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: planned.id,
        content: {
          title: planned.title,
          body: planned.body,
          // Carried so a tapped notification could route somewhere later, and
          // so a delivered notification is identifiable in QA.
          data: { kind: planned.kind, category: planned.category },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: planned.fireAt,
          channelId: CHANNELS[planned.category].id,
        },
      });
    }
  },
};

/**
 * Suppress presentation while the app is open — the §3.21.1 governing rule, in
 * the one place the OS can enforce it: *a notification exists only to reach the
 * user when they are not in the app*. If they are looking at RunQuest, the
 * screen already says everything a reminder would, and a banner on top of it is
 * noise. Delivery still happens; it just isn't shown.
 */
export function configureNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
