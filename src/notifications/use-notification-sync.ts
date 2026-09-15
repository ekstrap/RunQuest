import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useNotificationPermissions } from '@/src/providers/notification-permissions-provider';
import { useNotificationScheduler } from '@/src/providers/notification-scheduler-provider';
import { useRepository } from '@/src/providers/repository-provider';
import { syncNotifications } from './sync-notifications';

/**
 * Returns a `resync` that recomputes the whole notification plan and hands it to
 * the OS. Call it from anywhere the answer may have changed — after a run, after
 * a settings change, after the user grants permission.
 *
 * Failures are swallowed on purpose: a notification that could not be scheduled
 * must never break the screen the user is actually on. Silence is the safe
 * direction to fail in.
 */
export function useNotificationResync(): () => Promise<void> {
  const repository = useRepository();
  const permissions = useNotificationPermissions();
  const scheduler = useNotificationScheduler();

  return useCallback(async () => {
    try {
      await syncNotifications({ repository, permissions, scheduler });
    } catch {
      // Nothing scheduled is better than a crashed screen.
    }
  }, [repository, permissions, scheduler]);
}

/**
 * Keeps the OS's pending notifications in step with reality, by resyncing on
 * mount and every time the app returns to the foreground.
 *
 * Foreground is the right trigger for two reasons. It is when the plan can have
 * gone stale — a run recorded on another device, a permission revoked in the
 * system settings, a commitment changed — and it is also what carries the
 * schedule across a **week rollover**: the plan only ever covers the current
 * week (a reminder quotes the prescribed duration, which is only stable within
 * a week), so each new week's anchors are scheduled the first time the user
 * opens the app in it.
 */
export function useNotificationSync(): void {
  const resync = useNotificationResync();

  useEffect(() => {
    void resync();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void resync();
      }
    });
    return () => subscription.remove();
  }, [resync]);
}
