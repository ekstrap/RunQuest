import type { NotificationSettings } from '@/src/domain/types';

/** The OS's answer about notification permission, mirrored in NotificationSettings. */
export type NotificationPermissionStatus = NotificationSettings['osPermission'];

/**
 * The OS notification-permission boundary (PRD §"mock only at system
 * boundaries": OS notification delivery is a boundary to inject). Two methods,
 * SDK-style, so tests can drive the permission flow without a device.
 *
 * Deliberately *only* permission — scheduling and delivery live behind their own
 * adapter ({@link NotificationScheduler}), which is why nothing here can send
 * anything.
 *
 * `request()` fires the **irreversible** OS prompt: on both platforms a user
 * who declines it cannot be asked again from inside the app. That is exactly why
 * our own in-app pre-prompt is mandatory and must come first (DESIGN.md §3.21.2)
 * — a hesitant user declines *ours*, which stays re-askable.
 */
export interface NotificationPermissions {
  /** The current permission status, without prompting. */
  getStatus(): Promise<NotificationPermissionStatus>;

  /** Fire the OS permission prompt and return the answer. */
  request(): Promise<NotificationPermissionStatus>;
}

/**
 * Default boundary for a build where the native module is unavailable (the web
 * build; the expo-notifications-backed one needs a dev build to run at all).
 * Reports "undetermined" and never claims a grant, so the policy engine — which
 * requires a real grant — yields nothing and the app simply doesn't notify.
 * Every screen still works.
 */
export const unavailableNotificationPermissions: NotificationPermissions = {
  async getStatus() {
    return 'undetermined';
  },
  async request() {
    return 'undetermined';
  },
};

/**
 * Test double: answers with a scripted status and records how often the OS
 * prompt was fired — which is what "the pre-prompt must come first" is asserted
 * against.
 */
export class FakeNotificationPermissions implements NotificationPermissions {
  requestCount = 0;

  constructor(
    private status: NotificationPermissionStatus = 'undetermined',
    private readonly answer: NotificationPermissionStatus = 'granted',
  ) {}

  async getStatus(): Promise<NotificationPermissionStatus> {
    return this.status;
  }

  async request(): Promise<NotificationPermissionStatus> {
    this.requestCount += 1;
    this.status = this.answer;
    return this.status;
  }
}
