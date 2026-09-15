import type { PlannedNotification } from '@/src/domain/notification-schedule';

/**
 * The OS notification *delivery* boundary (PRD §"mock only at system
 * boundaries"), the sibling of {@link NotificationPermissions}. Deliberately one
 * method, and deliberately not "send": nothing in this app ever fires a
 * notification at the user in the moment. Everything is pre-scheduled from a
 * plan the domain computed, which is what makes the §3.18 hard rule auditable —
 * there is no code path where a runtime condition ("they haven't run and it's
 * Sunday night") could produce a message.
 *
 * `replaceAll` is a *set* operation rather than add/remove for the same reason:
 * the plan is the whole truth about what should be pending, so an implementation
 * that clears and rewrites can never drift into holding a stale reminder for a
 * session the user has already done.
 */
export interface NotificationScheduler {
  /**
   * Make the OS's pending set of RunQuest notifications exactly `plan`.
   * Idempotent: replacing a plan with an equal plan is a no-op the user cannot
   * observe. An empty plan means "cancel everything".
   */
  replaceAll(plan: PlannedNotification[]): Promise<void>;
}

/**
 * Default boundary for a build with no notification module available — the web
 * build, and any test that doesn't care. Accepts a plan and drops it: the app
 * runs and simply never notifies, which is the safe direction to fail in.
 */
export const unavailableNotificationScheduler: NotificationScheduler = {
  async replaceAll() {
    // Intentionally nothing: no native module, no notifications.
  },
};

/** Test double: remembers the last plan it was handed, and how often. */
export class FakeNotificationScheduler implements NotificationScheduler {
  scheduled: PlannedNotification[] = [];
  replaceCount = 0;

  async replaceAll(plan: PlannedNotification[]): Promise<void> {
    this.scheduled = plan;
    this.replaceCount += 1;
  }
}
