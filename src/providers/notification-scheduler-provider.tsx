import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  unavailableNotificationScheduler,
  type NotificationScheduler,
} from '@/src/notifications/notification-scheduler';

const NotificationSchedulerContext = createContext<NotificationScheduler | null>(null);

interface NotificationSchedulerProviderProps {
  children: ReactNode;
  /**
   * The delivery boundary to inject. Tests pass a fake that records the plan;
   * production wires the expo-notifications-backed one. Defaults to the
   * unavailable boundary so the app runs — and simply never notifies — where
   * there is no native module (the web build).
   */
  scheduler?: NotificationScheduler;
}

/**
 * Injects the OS notification-delivery boundary into the tree, alongside
 * NotificationPermissionsProvider: permission is one half of the notification
 * boundary and scheduling is the other, and both are injected so the whole
 * feature is testable with no device.
 */
export function NotificationSchedulerProvider({
  children,
  scheduler,
}: NotificationSchedulerProviderProps) {
  const value = useMemo(() => scheduler ?? unavailableNotificationScheduler, [scheduler]);
  return (
    <NotificationSchedulerContext.Provider value={value}>
      {children}
    </NotificationSchedulerContext.Provider>
  );
}

/** Read the injected NotificationScheduler. Throws if used outside the provider. */
export function useNotificationScheduler(): NotificationScheduler {
  const scheduler = useContext(NotificationSchedulerContext);
  if (!scheduler) {
    throw new Error('useNotificationScheduler must be used within a NotificationSchedulerProvider');
  }
  return scheduler;
}
