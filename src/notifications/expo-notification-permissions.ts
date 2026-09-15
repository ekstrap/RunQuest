import * as Notifications from 'expo-notifications';

import type {
  NotificationPermissionStatus,
  NotificationPermissions,
} from './notification-permissions';

/** Map expo-notifications' answer onto the three states the domain knows. */
function toStatus(permissions: Notifications.NotificationPermissionsStatus) {
  if (permissions.granted) {
    return 'granted' as const;
  }
  // `canAskAgain` is the honest difference between "not asked yet" and "the OS
  // holds a no": only the latter is the irreversible state the settings screen
  // tells the user about instead of pretending it can re-prompt.
  return permissions.canAskAgain ? ('undetermined' as const) : ('denied' as const);
}

/**
 * The real OS permission boundary, backed by expo-notifications.
 *
 * `request()` fires the **irreversible** system prompt, so it is called from
 * exactly two places — the onboarding pre-prompt's "yes" and the settings
 * screen's "turn on" — and never from a background resync (§3.21.2).
 */
export const expoNotificationPermissions: NotificationPermissions = {
  async getStatus(): Promise<NotificationPermissionStatus> {
    return toStatus(await Notifications.getPermissionsAsync());
  },

  async request(): Promise<NotificationPermissionStatus> {
    // On Android 13+ this is the runtime POST_NOTIFICATIONS request; on older
    // Android it resolves as already-granted without showing anything.
    return toStatus(await Notifications.requestPermissionsAsync());
  },
};
