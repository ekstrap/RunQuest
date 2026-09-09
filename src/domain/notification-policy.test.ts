import {
  NOTIFICATION_CATALOGUE,
  NO_ACKNOWLEDGEMENTS,
  eligibleNotifications,
  type NotificationPolicyState,
} from './notification-policy';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationCategory,
  type SessionRecord,
} from './types';

/** Monday 2026-06-01 09:00 local — the anchor for every case below. */
const MONDAY_9AM = new Date(2026, 5, 1, 9, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function session(startedAt: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    mode: 'interval',
    startedAt,
    durationSeconds: 600,
    distanceMeters: null,
    ...overrides,
  };
}

/** An opted-in user with all categories on — the interesting starting point. */
function optedIn(overrides: Partial<NotificationPolicyState> = {}): NotificationPolicyState {
  return {
    settings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      prePrompt: 'accepted',
      osPermission: 'granted',
    },
    sessions: [],
    commitment: 2,
    progression: { xpTotal: 0, level: 1 },
    acknowledged: NO_ACKNOWLEDGEMENTS,
    ...overrides,
  };
}

function kinds(state: NotificationPolicyState, now: number): string[] {
  return eligibleNotifications(state, now).map((notification) => notification.kind);
}

describe('notification policy — permission and toggles gate everything', () => {
  it('yields nothing until the OS has granted permission', () => {
    const state = optedIn({
      settings: { ...DEFAULT_NOTIFICATION_SETTINGS, prePrompt: 'accepted', osPermission: 'denied' },
    });

    expect(eligibleNotifications(state, MONDAY_9AM)).toEqual([]);
  });

  it('yields nothing for a fresh user, whose OS permission is undetermined', () => {
    // The OS grant is the only gate: our own pre-prompt answer shields the user
    // from the irreversible system prompt, it is not itself permission to send.
    expect(
      eligibleNotifications(optedIn({ settings: DEFAULT_NOTIFICATION_SETTINGS }), MONDAY_9AM),
    ).toEqual([]);
  });

  it('drops a category the user switched off in settings', () => {
    const base = optedIn();
    const settingsWithout = (category: NotificationCategory) =>
      optedIn({
        settings: {
          ...base.settings,
          categories: { ...base.settings.categories, [category]: false },
        },
      });

    // Each category is checked against a state that *would* yield it.
    expect(kinds(base, MONDAY_9AM)).toContain('session-invitation');
    expect(kinds(settingsWithout('reminder'), MONDAY_9AM)).not.toContain('session-invitation');

    const celebrating = {
      sessions: [session(MONDAY_9AM), session(MONDAY_9AM + DAY_MS)],
      progression: { xpTotal: 250, level: 3 },
    };
    const wednesday = MONDAY_9AM + 2 * DAY_MS;
    expect(kinds(optedIn(celebrating), wednesday)).toEqual(
      expect.arrayContaining(['week-complete', 'level-up']),
    );
    expect(
      kinds({ ...settingsWithout('celebration'), ...celebrating }, wednesday),
    ).not.toEqual(expect.arrayContaining(['week-complete', 'level-up']));

    const quiet = { sessions: [session(MONDAY_9AM - 2 * WEEK_MS)] };
    expect(kinds(optedIn(quiet), MONDAY_9AM)).toContain('still-here');
    expect(kinds({ ...settingsWithout('re-engagement'), ...quiet }, MONDAY_9AM)).not.toContain(
      'still-here',
    );
  });
});

describe('notification policy — reminders are invitations', () => {
  it('invites a user whose week is still open', () => {
    expect(kinds(optedIn(), MONDAY_9AM)).toContain('session-invitation');
  });

  it('stops inviting once the week is complete', () => {
    // Monday + Tuesday sessions meet a 2-session commitment; now is Wednesday.
    const state = optedIn({ sessions: [session(MONDAY_9AM), session(MONDAY_9AM + DAY_MS)] });

    expect(kinds(state, MONDAY_9AM + 2 * DAY_MS)).not.toContain('session-invitation');
  });

  it('does not invite again on a day the user already ran', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM - 60 * 60 * 1000)] });

    expect(kinds(state, MONDAY_9AM)).not.toContain('session-invitation');
  });

  it('hands a quiet user warmth instead of an invitation', () => {
    // Last completed week is two weeks back: they are past reminders now.
    const lastWeek = MONDAY_9AM - 2 * WEEK_MS;
    const state = optedIn({ sessions: [session(lastWeek), session(lastWeek + DAY_MS)] });

    expect(kinds(state, MONDAY_9AM)).toEqual(['still-here']);
  });
});

describe('notification policy — celebrations follow the win', () => {
  it('celebrates a week the moment it is complete', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM), session(MONDAY_9AM + DAY_MS)] });

    expect(kinds(state, MONDAY_9AM + 2 * DAY_MS)).toContain('week-complete');
  });

  it('does not re-celebrate a week already acknowledged', () => {
    const state = optedIn({
      sessions: [session(MONDAY_9AM), session(MONDAY_9AM + DAY_MS)],
      acknowledged: { ...NO_ACKNOWLEDGEMENTS, celebratedWeekStart: new Date(2026, 5, 1).getTime() },
    });

    expect(kinds(state, MONDAY_9AM + 2 * DAY_MS)).not.toContain('week-complete');
  });

  it('celebrates a level the user has reached but not yet been told about', () => {
    const state = optedIn({ progression: { xpTotal: 250, level: 3 } });

    expect(kinds(state, MONDAY_9AM)).toContain('level-up');
  });

  it('says nothing about a level already celebrated', () => {
    const state = optedIn({
      progression: { xpTotal: 250, level: 3 },
      acknowledged: { ...NO_ACKNOWLEDGEMENTS, celebratedLevel: 3 },
    });

    expect(kinds(state, MONDAY_9AM)).not.toContain('level-up');
  });

  it('celebrates a lifetime-weeks milestone', () => {
    // Four completed weeks, two prescribed sessions each.
    const sessions: SessionRecord[] = [];
    for (let week = 1; week <= 4; week += 1) {
      const weekStart = MONDAY_9AM - week * WEEK_MS;
      sessions.push(session(weekStart), session(weekStart + DAY_MS));
    }
    const state = optedIn({ sessions });

    expect(kinds(state, MONDAY_9AM)).toContain('lifetime-milestone');
  });

  it('stays quiet on a week count that is not a milestone', () => {
    const weekStart = MONDAY_9AM - WEEK_MS;
    const state = optedIn({ sessions: [session(weekStart), session(weekStart + DAY_MS)] });

    expect(kinds(state, MONDAY_9AM)).not.toContain('lifetime-milestone');
  });
});

describe('notification policy — re-engagement is warmth, tightly capped', () => {
  const quietFortnight = () => {
    const weekStart = MONDAY_9AM - 2 * WEEK_MS;
    return [session(weekStart), session(weekStart + DAY_MS)];
  };

  it('reaches out once to a user who has gone quiet', () => {
    expect(kinds(optedIn({ sessions: quietFortnight() }), MONDAY_9AM)).toContain('still-here');
  });

  it('does not reach out twice in the same week', () => {
    const state = optedIn({
      sessions: quietFortnight(),
      acknowledged: { ...NO_ACKNOWLEDGEMENTS, lastReEngagementAt: MONDAY_9AM - 60 * 60 * 1000 },
    });

    expect(kinds(state, MONDAY_9AM)).not.toContain('still-here');
  });

  it('may reach out again in a later week', () => {
    const state = optedIn({
      sessions: quietFortnight(),
      acknowledged: { ...NO_ACKNOWLEDGEMENTS, lastReEngagementAt: MONDAY_9AM - WEEK_MS },
    });

    expect(kinds(state, MONDAY_9AM)).toContain('still-here');
  });

  it('reaches out to someone who went quiet without ever completing a week', () => {
    // A newcomer who ran twice, three weeks apart, and then stopped: no week was
    // ever completed, so a streak-based rule would never notice they went quiet.
    const state = optedIn({
      sessions: [session(MONDAY_9AM - 5 * WEEK_MS), session(MONDAY_9AM - 3 * WEEK_MS)],
      commitment: 3,
    });

    expect(kinds(state, MONDAY_9AM)).toEqual(['still-here']);
  });

  it('treats a user who has never run as new, not quiet', () => {
    expect(kinds(optedIn(), MONDAY_9AM)).toEqual(['session-invitation']);
  });

  it('stops chasing entirely once they have been quiet a long time', () => {
    const weekStart = MONDAY_9AM - 6 * WEEK_MS;
    const state = optedIn({ sessions: [session(weekStart), session(weekStart + DAY_MS)] });

    expect(eligibleNotifications(state, MONDAY_9AM)).toEqual([]);
  });
});

describe('notification policy — the no-predatory hard rule (§3.18)', () => {
  /** Every state worth sweeping: engagement level × week progress × time of week. */
  function sweep(): { state: NotificationPolicyState; now: number }[] {
    const cases: { state: NotificationPolicyState; now: number }[] = [];
    for (const weeksQuiet of [0, 1, 2, 3, 4, 6]) {
      for (const sessionsThisWeek of [0, 1, 2, 3]) {
        for (const commitment of [2, 3] as const) {
          for (const hoursIntoWeek of [0, 24, 6 * 24, 6 * 24 + 23]) {
            const now = MONDAY_9AM + hoursIntoWeek * 60 * 60 * 1000;
            const sessions: SessionRecord[] = [];
            if (weeksQuiet > 0) {
              const past = MONDAY_9AM - weeksQuiet * WEEK_MS;
              for (let i = 0; i < commitment; i += 1) sessions.push(session(past + i * DAY_MS));
            }
            for (let i = 0; i < sessionsThisWeek; i += 1) {
              sessions.push(session(MONDAY_9AM + i * DAY_MS));
            }
            cases.push({
              state: optedIn({
                sessions,
                commitment,
                progression: { xpTotal: 500, level: 3 },
              }),
              now,
            });
          }
        }
      }
    }
    return cases;
  }

  it('only ever yields invitations, shared wins, and warmth', () => {
    for (const { state, now } of sweep()) {
      for (const notification of eligibleNotifications(state, now)) {
        expect(['invitation', 'shared-win', 'warmth']).toContain(notification.framing);
        expect(NOTIFICATION_CATALOGUE[notification.kind].framing).toBe(notification.framing);
      }
    }
  });

  it('never escalates as the week runs out — the last hours look like the first', () => {
    // An active streak and an unfinished week: the exact state a loss-aversion
    // notification would exploit ("your streak ends in 4 hours").
    const lastWeek = MONDAY_9AM - WEEK_MS;
    const state = optedIn({
      sessions: [session(lastWeek), session(lastWeek + DAY_MS)],
    });

    const mondayMorning = eligibleNotifications(state, MONDAY_9AM);
    const sundayNight = eligibleNotifications(state, MONDAY_9AM + 6 * DAY_MS + 14 * 60 * 60 * 1000);

    expect(sundayNight).toEqual(mondayMorning);
  });

  it('carries no deadline, expiry, or countdown on any notification', () => {
    for (const { state, now } of sweep()) {
      for (const notification of eligibleNotifications(state, now)) {
        expect(Object.keys(notification).sort()).toEqual(['category', 'framing', 'kind']);
      }
    }
  });
});
