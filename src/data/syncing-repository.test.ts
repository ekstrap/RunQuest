import type { ProgressionState, SessionRecord } from '@/src/domain/types';
import { InMemoryKeyValueStore } from './key-value-store';
import { LocalRepository } from './local-repository';
import { InMemoryRemoteStore, type RemoteStore } from './remote-store';
import { describeRepositoryContract } from './repository-contract';
import { SyncingRepository } from './syncing-repository';

const USER = 'user-1';

function makeSyncing(remote: RemoteStore = new InMemoryRemoteStore()) {
  const local = new LocalRepository(new InMemoryKeyValueStore());
  return { local, remote, repository: new SyncingRepository(local, remote, USER) };
}

const runA: SessionRecord = {
  mode: 'interval',
  startedAt: 1_700_000_000_000,
  durationSeconds: 600,
  distanceMeters: 1100,
};
const runB: SessionRecord = { ...runA, startedAt: runA.startedAt + 86_400_000 };

describeRepositoryContract('SyncingRepository', () => makeSyncing().repository);

describe('SyncingRepository', () => {
  describe('mirroring writes to the cloud', () => {
    it('sends saved progression, onboarding, calibration and sessions to the remote store', async () => {
      const { remote, repository } = makeSyncing();

      await repository.saveProgression({ xpTotal: 300, level: 4 });
      await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
      await repository.saveCalibration({ step: 3 });
      await repository.saveSession(runA);

      expect(await remote.fetchProfile(USER)).toEqual({
        progression: { xpTotal: 300, level: 4 },
        onboarding: { bracket: 'never-run', weeklyCommitment: 2 },
        calibration: { step: 3 },
      });
      expect(await remote.fetchSessions(USER)).toEqual([runA]);
    });

    it('keeps notification settings on the device — they never reach the cloud', async () => {
      const { local, remote, repository } = makeSyncing();
      const saveProfile = jest.spyOn(remote, 'saveProfile');

      await repository.saveNotificationSettings({
        prePrompt: 'accepted',
        osPermission: 'granted',
        categories: { reminder: true, celebration: true, 're-engagement': false },
      });

      expect(saveProfile).not.toHaveBeenCalled();
      expect(await local.getNotificationSettings()).not.toBeNull();
    });

    it('still saves locally when the cloud write fails, so a run is never lost', async () => {
      const offline = new InMemoryRemoteStore();
      jest.spyOn(offline, 'saveSessions').mockRejectedValue(new Error('network down'));
      jest.spyOn(offline, 'saveProfile').mockRejectedValue(new Error('network down'));
      const { local, repository } = makeSyncing(offline);

      await repository.saveSession(runA);
      await repository.saveProgression({ xpTotal: 100, level: 2 });

      expect(await local.getSessions()).toEqual([runA]);
      expect(await local.getProgressionState()).toEqual({ xpTotal: 100, level: 2 });
      expect(await repository.getSessions()).toEqual([runA]);
    });
  });

  describe('hydrate: reconciling local and cloud', () => {
    it('restores a reinstalled device from the cloud', async () => {
      const remote = new InMemoryRemoteStore();
      await remote.saveProfile(USER, {
        progression: { xpTotal: 900, level: 8 },
        onboarding: { bracket: 'getting-back', weeklyCommitment: 3 },
        calibration: { step: 5 },
      });
      await remote.saveSessions(USER, [runA, runB]);
      // A fresh install: empty local store, same account.
      const { repository } = makeSyncing(remote);

      await repository.hydrate();

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 900, level: 8 });
      expect(await repository.getOnboardingState()).toEqual({
        bracket: 'getting-back',
        weeklyCommitment: 3,
      });
      expect(await repository.getCalibrationState()).toEqual({ step: 5 });
      expect(await repository.getSessions()).toEqual([runA, runB]);
    });

    it('adopts the anonymous runs a user already did when they sign in', async () => {
      const remote = new InMemoryRemoteStore();
      const local = new LocalRepository(new InMemoryKeyValueStore());
      // What "Just run" then "Create account" looks like: local has everything.
      await local.saveSession(runA);
      await local.saveProgression({ xpTotal: 100, level: 2 });
      await local.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
      const repository = new SyncingRepository(local, remote, USER);

      await repository.hydrate();

      expect(await remote.fetchSessions(USER)).toEqual([runA]);
      expect(await remote.fetchProfile(USER)).toEqual({
        progression: { xpTotal: 100, level: 2 },
        onboarding: { bracket: 'never-run', weeklyCommitment: 2 },
        calibration: null,
      });
    });

    it('unions sessions from both sides without duplicating a run', async () => {
      const remote = new InMemoryRemoteStore();
      await remote.saveSessions(USER, [runA]);
      const local = new LocalRepository(new InMemoryKeyValueStore());
      await local.saveSession(runA); // the same run, already synced once
      await local.saveSession(runB); // ran offline since
      const repository = new SyncingRepository(local, remote, USER);

      await repository.hydrate();

      expect(await repository.getSessions()).toEqual([runA, runB]);
      expect(await remote.fetchSessions(USER)).toEqual([runA, runB]);
    });

    it.each<[string, ProgressionState, ProgressionState, ProgressionState]>([
      ['local is ahead', { xpTotal: 500, level: 6 }, { xpTotal: 200, level: 3 }, { xpTotal: 500, level: 6 }],
      ['cloud is ahead', { xpTotal: 200, level: 3 }, { xpTotal: 500, level: 6 }, { xpTotal: 500, level: 6 }],
    ])('keeps the further-along progression when %s', async (_case, localState, remoteState, expected) => {
      const remote = new InMemoryRemoteStore();
      await remote.saveProfile(USER, {
        progression: remoteState,
        onboarding: null,
        calibration: null,
      });
      const local = new LocalRepository(new InMemoryKeyValueStore());
      await local.saveProgression(localState);
      const repository = new SyncingRepository(local, remote, USER);

      await repository.hydrate();

      expect(await repository.getProgressionState()).toEqual(expected);
      expect((await remote.fetchProfile(USER))?.progression).toEqual(expected);
    });

    it('never merges another account’s leftover data into this one', async () => {
      const remote = new InMemoryRemoteStore();
      const local = new LocalRepository(new InMemoryKeyValueStore());
      // A previous user of this phone left their progress behind.
      await local.saveProgression({ xpTotal: 5_000, level: 20 });
      await local.saveSession(runA);
      await local.setDataOwner('someone-else');
      const repository = new SyncingRepository(local, remote, USER);

      await repository.hydrate();

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 0, level: 1 });
      expect(await repository.getSessions()).toEqual([]);
      expect(await remote.fetchSessions(USER)).toEqual([]);
      expect((await remote.fetchProfile(USER))?.progression).toEqual({ xpTotal: 0, level: 1 });
    });

    it('claims the device for the signed-in account', async () => {
      const { repository } = makeSyncing();

      await repository.hydrate();

      expect(await repository.getDataOwner()).toBe(USER);
    });

    it('keeps the same account’s own data across sign-ins', async () => {
      const remote = new InMemoryRemoteStore();
      const local = new LocalRepository(new InMemoryKeyValueStore());
      await local.saveProgression({ xpTotal: 700, level: 7 });
      await local.setDataOwner(USER);
      const repository = new SyncingRepository(local, remote, USER);

      await repository.hydrate();

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 700, level: 7 });
    });

    it('leaves local data untouched when the cloud is unreachable', async () => {
      const offline = new InMemoryRemoteStore();
      jest.spyOn(offline, 'fetchProfile').mockRejectedValue(new Error('network down'));
      const local = new LocalRepository(new InMemoryKeyValueStore());
      await local.saveProgression({ xpTotal: 100, level: 2 });
      await local.saveSession(runA);
      const repository = new SyncingRepository(local, offline, USER);

      await expect(repository.hydrate()).resolves.toBeUndefined();

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 100, level: 2 });
      expect(await repository.getSessions()).toEqual([runA]);
    });
  });
});
