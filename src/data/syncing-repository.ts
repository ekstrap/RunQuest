import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
} from '@/src/domain/types';
import { EMPTY_PROFILE, type ProfileSnapshot, type RemoteStore } from './remote-store';
import type { Repository } from './repository';

/**
 * SyncingRepository — the Repository a *signed-in* user gets: local-first, with
 * the cloud mirrored behind it.
 *
 * Every read is answered from device storage and every write lands there first,
 * so running works identically with no signal — the cloud is a backup, never a
 * dependency of the run. Cloud writes are best-effort: a failed mirror is
 * swallowed rather than thrown, because losing a completed run to a network
 * blip would break the one promise the app makes (§Pillar 1, consistency).
 * `hydrate()` is the repair mechanism that reconciles whatever the mirror
 * missed, and is also what restores a reinstalled phone.
 */
export class SyncingRepository implements Repository {
  constructor(
    private readonly local: Repository,
    private readonly remote: RemoteStore,
    private readonly userId: string,
  ) {}

  // ---- reads: local only -------------------------------------------------

  getProgressionState(): Promise<ProgressionState> {
    return this.local.getProgressionState();
  }

  getOnboardingState(): Promise<OnboardingState | null> {
    return this.local.getOnboardingState();
  }

  getCalibrationState(): Promise<CalibrationState | null> {
    return this.local.getCalibrationState();
  }

  getSessions(): Promise<SessionRecord[]> {
    return this.local.getSessions();
  }

  getDataOwner(): Promise<string | null> {
    return this.local.getDataOwner();
  }

  // ---- writes: local first, cloud best-effort ----------------------------

  async saveProgression(state: ProgressionState): Promise<void> {
    await this.local.saveProgression(state);
    await this.mirrorProfile();
  }

  async saveOnboarding(state: OnboardingState): Promise<void> {
    await this.local.saveOnboarding(state);
    await this.mirrorProfile();
  }

  async saveCalibration(state: CalibrationState): Promise<void> {
    await this.local.saveCalibration(state);
    await this.mirrorProfile();
  }

  setDataOwner(userId: string | null): Promise<void> {
    return this.local.setDataOwner(userId);
  }

  async clear(): Promise<void> {
    // Only the device copy is discarded. Wiping someone's cloud account is
    // never something local housekeeping should be able to do.
    await this.local.clear();
  }

  async replaceSessions(records: SessionRecord[]): Promise<void> {
    await this.local.replaceSessions(records);
    await this.attempt(() => this.remote.saveSessions(this.userId, records));
  }

  async saveSession(record: SessionRecord): Promise<void> {
    await this.local.saveSession(record);
    await this.attempt(() => this.remote.saveSessions(this.userId, [record]));
  }

  /**
   * Reconcile device and cloud, in both directions. Called on launch while
   * signed in and immediately after signing in — the latter is what carries an
   * anonymous user's existing runs up into their new account, so choosing
   * "Just run" first never costs them their history.
   *
   * The merge is deliberately non-destructive and deterministic:
   *  - sessions: the union of both sides, keyed by start time (a run is one run,
   *    however many times it was sent);
   *  - progression: whichever side has more lifetime XP — XP only ever grows, so
   *    the larger number is the one that saw more completed sessions;
   *  - onboarding / calibration: the cloud's answer when it has one, since it
   *    outlives any single device; otherwise the device's, pushed up.
   * Nothing here can lower a user's XP or delete a run.
   */
  async hydrate(): Promise<void> {
    await this.discardAnotherAccountsData();

    const remoteProfile = await this.attempt(() => this.remote.fetchProfile(this.userId));
    const remoteSessions = await this.attempt(() => this.remote.fetchSessions(this.userId));
    if (remoteProfile === FAILED || remoteSessions === FAILED) {
      // Offline: the device keeps its data as-is and we try again next launch.
      return;
    }

    const localProfile = await this.readLocalProfile();
    const merged = mergeProfiles(localProfile, remoteProfile ?? EMPTY_PROFILE);
    const mergedSessions = mergeSessions(await this.local.getSessions(), remoteSessions ?? []);

    await this.writeLocalProfile(merged);
    await this.local.replaceSessions(mergedSessions);

    await this.attempt(() => this.remote.saveProfile(this.userId, merged));
    await this.attempt(() => this.remote.saveSessions(this.userId, mergedSessions));
  }

  /**
   * Phones get shared, handed down, and sold. If the data sitting on this device
   * belongs to a *different* account, it must not be merged into this one — that
   * would hand a stranger's XP and run history to whoever signs in next, and
   * (since the merge keeps the larger XP) there would be no way back.
   *
   * Data with no owner is anonymous "Just run" data, which *is* adopted: that's
   * the same person choosing to make an account, and keeping their runs is the
   * whole point.
   */
  private async discardAnotherAccountsData(): Promise<void> {
    const owner = await this.local.getDataOwner();
    if (owner !== null && owner !== this.userId) {
      await this.local.clear();
    }
    await this.local.setDataOwner(this.userId);
  }

  // ---- internals ---------------------------------------------------------

  private async readLocalProfile(): Promise<ProfileSnapshot> {
    return {
      progression: await this.local.getProgressionState(),
      onboarding: await this.local.getOnboardingState(),
      calibration: await this.local.getCalibrationState(),
    };
  }

  private async writeLocalProfile(profile: ProfileSnapshot): Promise<void> {
    await this.local.saveProgression(profile.progression);
    if (profile.onboarding) {
      await this.local.saveOnboarding(profile.onboarding);
    }
    if (profile.calibration) {
      await this.local.saveCalibration(profile.calibration);
    }
  }

  private async mirrorProfile(): Promise<void> {
    const profile = await this.readLocalProfile();
    await this.attempt(() => this.remote.saveProfile(this.userId, profile));
  }

  /**
   * Run a cloud call, returning FAILED instead of throwing. The app must stay
   * usable when the network is down, so no caller of this class ever has to
   * handle a connectivity error.
   */
  private async attempt<T>(call: () => Promise<T>): Promise<T | typeof FAILED> {
    try {
      return await call();
    } catch {
      return FAILED;
    }
  }
}

/** Sentinel for a cloud call that didn't get through. */
const FAILED = Symbol('remote call failed');

/** Merge two profiles, favouring the side that is further along. */
function mergeProfiles(local: ProfileSnapshot, remote: ProfileSnapshot): ProfileSnapshot {
  return {
    progression:
      remote.progression.xpTotal > local.progression.xpTotal
        ? remote.progression
        : local.progression,
    onboarding: remote.onboarding ?? local.onboarding,
    calibration: remote.calibration ?? local.calibration,
  };
}

/** Union two session lists by start time, oldest first. */
function mergeSessions(local: SessionRecord[], remote: SessionRecord[]): SessionRecord[] {
  const byStart = new Map<number, SessionRecord>();
  for (const record of [...remote, ...local]) {
    byStart.set(record.startedAt, record);
  }
  return [...byStart.values()].sort((a, b) => a.startedAt - b.startedAt);
}
