import type { NotificationPermissionsStatus } from 'expo-notifications';

import { loadNotificationsModule } from './expo-notifications-module';
import type {
  NotificationPermissionStatus,
  NotificationPermissions,
} from './notification-permissions';

/** Map expo-notifications' answer onto the three states the domain knows. */
function toStatus(permissions: NotificationPermissionsStatus): NotificationPermissionStatus {
  if (permissions.granted) {
    return 'granted';
  }
  // `canAskAgain` is the honest difference between "not asked yet" and "the OS
  // holds a no": only the latter is the irreversible state the settings screen
  // tells the user about instead of pretending it can re-prompt.
  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * The real OS permission boundary, backed by expo-notifications.
 *
 * `request()` fires the **irreversible** system prompt, so it is called from
 * exactly two places — the onboarding pre-prompt's "yes" and the settings
 * screen's "turn on" — and never from a background resync (§3.21.2).
 *
 * Where the native module is missing, both methods answer "undetermined": we
 * have no grant and cannot obtain one, so the policy engine yields nothing and
 * the rest of the app is untouched.
 */
export const expoNotificationPermissions: NotificationPermissions = {
  async getStatus(): Promise<NotificationPermissionStatus> {
    const Notifications = loadNotificationsModule();
    if (!Notifications) {
      return 'undetermined';
    }
    return toStatus(await Notifications.getPermissionsAsync());
  },

  async request(): Promise<NotificationPermissionStatus> {
    const Notifications = loadNotificationsModule();
    if (!Notifications) {
      return 'undetermined';
    }
    // On Android 13+ this is the runtime POST_NOTIFICATIONS request; on older
    // Android it resolves as already-granted without showing anything.
    return toStatus(await Notifications.requestPermissionsAsync());
  },
};
