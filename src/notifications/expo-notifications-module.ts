import { Platform } from 'react-native';

/** The shape of the expo-notifications module, without importing it eagerly. */
type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * Load expo-notifications, or return null where it cannot be used.
 *
 * Loaded lazily and behind a try/catch **on purpose**, which is worth spelling
 * out because a plain top-level import is the obvious thing to write and it is
 * what broke the app:
 *
 * `expo-notifications`' entry point eagerly registers a device *push* token
 * listener as an import side effect. That reaches for the native
 * `ExpoPushTokenManager`, and in any binary built without the module — a dev
 * client compiled before it was added, which is every existing install the
 * moment it lands — the throw escapes the import itself. A module-scope import
 * therefore takes down whatever imports it, and since the root layout does, the
 * whole app goes: no default export, no providers, and every screen fails on
 * `useRepository` rather than merely losing notifications.
 *
 * Nothing in RunQuest uses push. Deferring the load to first use turns a fatal
 * import into a null, and the callers degrade to doing nothing — which is the
 * behaviour the unavailable* boundaries always promised.
 *
 * Web returns null without trying: notifications are not part of the web build,
 * and loading the module there only prints warnings about unsupported push.
 */
export function loadNotificationsModule(): NotificationsModule | null {
  if (cached !== undefined) {
    return cached;
  }
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    // No native module in this binary. The app runs; it just never notifies.
    cached = null;
  }
  return cached;
}
