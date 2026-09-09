import type { NotificationSettings } from '@/src/domain/types';

/** The OS's answer about notification permission, mirrored in NotificationSettings. */
export type NotificationPermissionStatus = NotificationSettings['osPermission'];

/**
 * The OS notification-permission boundary (PRD §"mock only at system
 * boundaries": OS notification delivery is a boundary to inject). Two methods,
 * SDK-style, so tests can drive the permission flow without a device.
 *
 * Deliberately *only* permission — actual scheduling and delivery land with
 * issue #13 behind their own adapter, which is why nothing here can send
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
 * Default boundary for a build with no notification module wired up yet (the
 * expo-notifications integration is issue #13, and needs a dev build to test).
 * Reports "undetermined" and never claims a grant, so the policy engine — which
 * requires a real grant — yields nothing and the app simply doesn't notify.
 * Every screen in this slice still works.
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
