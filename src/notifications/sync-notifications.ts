import type { Repository } from '@/src/data/repository';
import { initialCalibration, prescriptionForCalibration } from '@/src/domain/calibration';
import {
  planNotifications,
  type PlannedNotification,
} from '@/src/domain/notification-schedule';
import { withNotificationDefaults } from '@/src/domain/types';
import type { NotificationPermissions } from './notification-permissions';
import type { NotificationScheduler } from './notification-scheduler';

/** The two OS boundaries plus storage — everything a resync needs. */
export interface NotificationSyncDeps {
  repository: Repository;
  permissions: NotificationPermissions;
  scheduler: NotificationScheduler;
}

/**
 * Recompute the whole notification plan from stored state and hand it to the OS.
 *
 * This is the only place the domain meets the device, and it is deliberately a
 * *full* recompute rather than an incremental update: the plan is cheap, and
 * "cancel everything, then schedule exactly what is currently true" is the one
 * shape that cannot leave a stale reminder behind for a session the user has
 * already done. Call it whenever the answer might have changed — the app coming
 * to the foreground (which is also what carries the schedule over a week
 * rollover), a finished run, a settings change.
 *
 * It **never** fires the OS permission prompt. That prompt is irreversible and
 * belongs to the two places the user is actually being asked (the onboarding
 * pre-prompt and the settings screen); a background resync that could burn it is
 * exactly the bug §3.21.2 is written to prevent. It only *reads* the status —
 * and repairs the stored copy when it disagrees, because a permission the user
 * revoked in the system settings has to land.
 *
 * Returns the plan it scheduled, which is what tests and the QA build assert on.
 */
export async function syncNotifications(
  { repository, permissions, scheduler }: NotificationSyncDeps,
  now: number = Date.now(),
): Promise<PlannedNotification[]> {
  const [stored, osPermission, onboarding, sessions, calibration] = await Promise.all([
    repository.getNotificationSettings(),
    permissions.getStatus(),
    repository.getOnboardingState(),
    repository.getSessions(),
    repository.getCalibrationState(),
  ]);

  const settings = { ...withNotificationDefaults(stored), osPermission };
  if (stored !== null && stored.osPermission !== osPermission) {
    await repository.saveNotificationSettings(settings);
  }

  // The prescription the reminder copy quotes: the persisted rung, falling back
  // to the bracket's starting rung when calibration has never been written —
  // the same fallback the run screen uses, so the number in the notification is
  // the number the user will be asked for.
  const prescription = prescriptionForCalibration(
    calibration ?? initialCalibration(onboarding?.bracket ?? 'never-run'),
  );

  const plan = planNotifications(
    {
      settings,
      sessions,
      commitment: onboarding?.weeklyCommitment ?? 2,
      prescription,
    },
    now,
  );

  await scheduler.replaceAll(plan);
  return plan;
}
