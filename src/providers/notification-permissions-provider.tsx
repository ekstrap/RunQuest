import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  unavailableNotificationPermissions,
  type NotificationPermissions,
} from '@/src/notifications/notification-permissions';

const NotificationPermissionsContext = createContext<NotificationPermissions | null>(null);

interface NotificationPermissionsProviderProps {
  children: ReactNode;
  /**
   * The permission boundary to inject. Tests pass a fake that records whether
   * the OS prompt fired; production wires the expo-notifications-backed one
   * (issue #13). Defaults to the unavailable boundary so the app runs — and
   * simply never notifies — with no native module.
   */
  permissions?: NotificationPermissions;
}

/**
 * Injects the OS notification-permission boundary into the tree, mirroring
 * LocationProvider and CuePlayerProvider.
 */
export function NotificationPermissionsProvider({
  children,
  permissions,
}: NotificationPermissionsProviderProps) {
  const value = useMemo(() => permissions ?? unavailableNotificationPermissions, [permissions]);
  return (
    <NotificationPermissionsContext.Provider value={value}>
      {children}
    </NotificationPermissionsContext.Provider>
  );
}

/** Read the injected NotificationPermissions. Throws if used outside the provider. */
export function useNotificationPermissions(): NotificationPermissions {
  const permissions = useContext(NotificationPermissionsContext);
  if (!permissions) {
    throw new Error(
      'useNotificationPermissions must be used within a NotificationPermissionsProvider',
    );
  }
  return permissions;
}
