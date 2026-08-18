import type { SessionRecord } from '@/src/domain/types';
import type { Repository } from './repository';

/**
 * Shared Repository contract suite (PRD §"Testing decisions": the Supabase
 * adapter is covered by "a contract test that it satisfies the same interface
 * as the in-memory fake"). Every implementation is held to exactly these
 * behaviours, so screens and engines can bind to the interface and never care
 * which one is underneath.
 *
 * `makeRepository` must return a *fresh, empty* repository each call — several
 * cases build a second instance over the same backing store to assert values
 * survive a restart.
 */
export function describeRepositoryContract(
  name: string,
  makeRepository: () => Promise<Repository> | Repository,
) {
  describe(`${name} (Repository contract)`, () => {
    const session: SessionRecord = {
      mode: 'interval',
      startedAt: 1_700_000_000_000,
      durationSeconds: 600,
      distanceMeters: 1200,
    };

    it('starts a brand-new user at level 1 with no XP', async () => {
      const repository = await makeRepository();

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 0, level: 1 });
    });

    it('reads back the progression state that was saved', async () => {
      const repository = await makeRepository();

      await repository.saveProgression({ xpTotal: 250, level: 3 });

      expect(await repository.getProgressionState()).toEqual({ xpTotal: 250, level: 3 });
    });

    it('has no onboarding state until onboarding is saved', async () => {
      const repository = await makeRepository();

      expect(await repository.getOnboardingState()).toBeNull();
    });

    it('reads back the onboarding selections that were saved', async () => {
      const repository = await makeRepository();

      await repository.saveOnboarding({ bracket: 'getting-back', weeklyCommitment: 3 });

      expect(await repository.getOnboardingState()).toEqual({
        bracket: 'getting-back',
        weeklyCommitment: 3,
      });
    });

    it('has no calibration state until one is saved', async () => {
      const repository = await makeRepository();

      expect(await repository.getCalibrationState()).toBeNull();
    });

    it('reads back the calibration step that was saved', async () => {
      const repository = await makeRepository();

      await repository.saveCalibration({ step: 4 });

      expect(await repository.getCalibrationState()).toEqual({ step: 4 });
    });

    it('has no sessions until one is saved', async () => {
      const repository = await makeRepository();

      expect(await repository.getSessions()).toEqual([]);
    });

    it('returns saved sessions oldest first', async () => {
      const repository = await makeRepository();
      const later: SessionRecord = { ...session, startedAt: session.startedAt + 86_400_000 };

      await repository.saveSession(session);
      await repository.saveSession(later);

      expect(await repository.getSessions()).toEqual([session, later]);
    });

    it('round-trips a session with no GPS distance and an off-plan flag', async () => {
      const repository = await makeRepository();
      const freeRun: SessionRecord = {
        mode: 'just-walk',
        startedAt: session.startedAt,
        durationSeconds: 900,
        distanceMeters: null,
        offPlan: true,
      };

      await repository.saveSession(freeRun);

      expect(await repository.getSessions()).toEqual([freeRun]);
    });

    it('replaces the whole session history with the given records', async () => {
      const repository = await makeRepository();
      await repository.saveSession(session);
      const replacement: SessionRecord[] = [
        { ...session, startedAt: session.startedAt - 86_400_000 },
        session,
      ];

      await repository.replaceSessions(replacement);

      expect(await repository.getSessions()).toEqual(replacement);
    });

    it('does not let a caller mutate stored sessions through the returned array', async () => {
      const repository = await makeRepository();
      await repository.saveSession(session);

      (await repository.getSessions()).push({ ...session, durationSeconds: 1 });

      expect(await repository.getSessions()).toHaveLength(1);
    });
  });
}
