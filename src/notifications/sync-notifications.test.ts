import { InMemoryRepository } from '@/src/data/in-memory-repository';
import type { Repository } from '@/src/data/repository';
import { prescriptionForCalibration } from '@/src/domain/calibration';
import { DEFAULT_NOTIFICATION_SETTINGS, type SessionRecord } from '@/src/domain/types';
import {
  FakeNotificationPermissions,
  type NotificationPermissions,
} from './notification-permissions';
import { FakeNotificationScheduler } from './notification-scheduler';
import { syncNotifications } from './sync-notifications';

/** Monday 2026-06-01 09:00 local. */
const MONDAY_9AM = new Date(2026, 5, 1, 9, 0).getTime();

function session(startedAt: number): SessionRecord {
  return { mode: 'interval', startedAt, durationSeconds: 600, distanceMeters: null };
}

async function optedInRepository(): Promise<Repository> {
  const repository = new InMemoryRepository();
  await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
  await repository.saveNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    prePrompt: 'accepted',
    osPermission: 'granted',
  });
  return repository;
}

function sync(
  repository: Repository,
  scheduler: FakeNotificationScheduler,
  permissions: NotificationPermissions,
  now = MONDAY_9AM,
) {
  return syncNotifications({ repository, scheduler, permissions }, now);
}

describe('syncNotifications', () => {
  it('hands the scheduler the plan for the current state', async () => {
    const repository = await optedInRepository();
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));

    expect(plan.map((p) => p.kind)).toEqual(['session-invitation', 'session-invitation']);
    expect(scheduler.scheduled).toEqual(plan);
  });

  it('states the duration the user is actually prescribed', async () => {
    const repository = await optedInRepository();
    await repository.saveCalibration({ step: 4 });
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));
    const { durationMinutes } = prescriptionForCalibration({ step: 4 });

    expect(plan).not.toHaveLength(0);
    for (const planned of plan) {
      expect(`${planned.title} ${planned.body}`).toContain(`${durationMinutes} minutes`);
    }
  });

  it('falls back to the bracket rung when calibration has never been written', async () => {
    const repository = new InMemoryRepository();
    await repository.saveOnboarding({ bracket: 'getting-back', weeklyCommitment: 3 });
    await repository.saveNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      prePrompt: 'accepted',
      osPermission: 'granted',
    });
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));

    expect(plan[0].title + plan[0].body).toContain('25 minutes');
  });

  it('cancels everything when the user has never opted in', async () => {
    const repository = new InMemoryRepository();
    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions());

    expect(plan).toEqual([]);
    expect(scheduler.replaceCount).toBe(1);
  });

  it('repairs a stored grant the user revoked in the system settings', async () => {
    // The policy gate reads the *stored* permission, so a stale grant would keep
    // the app planning notifications it can no longer deliver.
    const repository = await optedInRepository();
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions('denied'));

    expect(plan).toEqual([]);
    expect((await repository.getNotificationSettings())?.osPermission).toBe('denied');
  });

  it('never fires the irreversible OS prompt', async () => {
    const repository = await optedInRepository();
    const permissions = new FakeNotificationPermissions('granted');

    await sync(repository, new FakeNotificationScheduler(), permissions);

    expect(permissions.requestCount).toBe(0);
  });

  it('drops the day’s reminder once the user has run', async () => {
    const repository = await optedInRepository();
    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 3 });
    const scheduler = new FakeNotificationScheduler();

    const before = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));
    await repository.saveSession(session(MONDAY_9AM));
    const after = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));

    const invitations = (plan: typeof before) =>
      plan.filter((p) => p.kind === 'session-invitation').length;
    expect(invitations(before)).toBe(3);
    expect(invitations(after)).toBe(2);
  });

  it('defaults a phone with no stored weekly commitment to two sessions', async () => {
    const repository = new InMemoryRepository();
    await repository.saveNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      prePrompt: 'accepted',
      osPermission: 'granted',
    });
    const scheduler = new FakeNotificationScheduler();

    const plan = await sync(repository, scheduler, new FakeNotificationPermissions('granted'));

    expect(plan).toHaveLength(2);
  });
});
