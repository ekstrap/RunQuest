import { prescriptionForCalibration } from './calibration';
import { STILL_HERE_COPY } from './notification-copy';
import {
  ANCHOR_DAYS,
  planNotifications,
  type NotificationPlanState,
} from './notification-schedule';
import { DEFAULT_NOTIFICATION_SETTINGS, type SessionRecord } from './types';
import { startOfDay } from './week';

/** Monday 2026-06-01 09:00 local. */
const MONDAY_9AM = new Date(2026, 5, 1, 9, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function session(startedAt: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return { mode: 'interval', startedAt, durationSeconds: 600, distanceMeters: null, ...overrides };
}

function optedIn(overrides: Partial<NotificationPlanState> = {}): NotificationPlanState {
  return {
    settings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      prePrompt: 'accepted',
      osPermission: 'granted',
    },
    sessions: [],
    commitment: 2,
    prescription: prescriptionForCalibration({ step: 0 }),
    ...overrides,
  };
}

/**
 * The local weekday (0=Sun…6=Sat) and clock time of each planned *invitation* —
 * the anchor-day assertions are about reminders, and a state with sessions in it
 * also plans the quiet period's check-ins, which the re-engagement block covers.
 */
function firings(state: NotificationPlanState, now: number) {
  return planNotifications(state, now)
    .filter((planned) => planned.kind === 'session-invitation')
    .map((planned) => {
      const at = new Date(planned.fireAt);
      return {
        kind: planned.kind,
        day: at.getDay(),
        time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
      };
    });
}

describe('notification schedule — anchor days (§3.21.1b)', () => {
  it('fires on Tuesday and Saturday for a 2-session commitment', () => {
    expect(firings(optedIn({ commitment: 2 }), MONDAY_9AM)).toEqual([
      { kind: 'session-invitation', day: 2, time: '18:00' },
      { kind: 'session-invitation', day: 6, time: '18:00' },
    ]);
  });

  it('fires on Monday, Wednesday and Saturday for a 3-session commitment', () => {
    expect(firings(optedIn({ commitment: 3 }), MONDAY_9AM)).toEqual([
      { kind: 'session-invitation', day: 1, time: '18:00' },
      { kind: 'session-invitation', day: 3, time: '18:00' },
      { kind: 'session-invitation', day: 6, time: '18:00' },
    ]);
  });

  it('always includes a weekend day, where a beginner has unhurried time', () => {
    for (const anchors of Object.values(ANCHOR_DAYS)) {
      expect(anchors).toContain(6);
    }
  });

  it('honours the reminder time the user chose in settings', () => {
    const base = optedIn();
    const state = optedIn({
      settings: { ...base.settings, reminderTime: { hour: 7, minute: 30 } },
    });

    expect(firings(state, MONDAY_9AM).every((f) => f.time === '07:30')).toBe(true);
  });

  it('never plans more invitations than the weekly commitment, nor two in a day', () => {
    for (const commitment of [2, 3] as const) {
      const planned = planNotifications(optedIn({ commitment }), MONDAY_9AM);
      const days = planned.map((p) => new Date(p.fireAt).getDay());

      expect(planned).toHaveLength(commitment);
      expect(new Set(days).size).toBe(days.length);
    }
  });
});

describe('notification schedule — an anchor is an opportunity that only ever shrinks', () => {
  it('drops every invitation once the week is complete', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM), session(MONDAY_9AM + DAY_MS)] });

    expect(firings(state, MONDAY_9AM + DAY_MS + 60 * 60 * 1000)).toEqual([]);
  });

  it('skips the anchor on a day the user has already run', () => {
    // Tuesday morning run: Tuesday's 18:00 anchor is silently removed.
    const tuesday9am = MONDAY_9AM + DAY_MS;
    const state = optedIn({ sessions: [session(tuesday9am)] });

    expect(firings(state, tuesday9am + 60 * 60 * 1000)).toEqual([
      { kind: 'session-invitation', day: 6, time: '18:00' },
    ]);
  });

  it('never plans a firing in the past', () => {
    const wednesday = MONDAY_9AM + 2 * DAY_MS;

    // Monday's anchor is gone; Wednesday's 18:00 is still ahead of 09:00.
    expect(firings(optedIn({ commitment: 3 }), wednesday)).toEqual([
      { kind: 'session-invitation', day: 3, time: '18:00' },
      { kind: 'session-invitation', day: 6, time: '18:00' },
    ]);
  });

  it('running early in the week removes later anchors and adds nothing', () => {
    const invitations = (state: NotificationPlanState) =>
      planNotifications(state, MONDAY_9AM).filter((p) => p.kind === 'session-invitation');
    const before = invitations(optedIn({ commitment: 3 }));
    const after = invitations(optedIn({ commitment: 3, sessions: [session(MONDAY_9AM)] }));

    expect(after.length).toBeLessThan(before.length);
    for (const planned of after) {
      expect(before.map((b) => b.fireAt)).toContain(planned.fireAt);
    }
  });
});

describe('notification schedule — copy (§3.21.1d)', () => {
  it('states the prescribed duration in every invitation', () => {
    const prescription = prescriptionForCalibration({ step: 2 });
    const planned = planNotifications(optedIn({ prescription }), MONDAY_9AM);

    expect(planned).not.toHaveLength(0);
    for (const { title, body } of planned) {
      expect(`${title} ${body}`).toContain(`${prescription.durationMinutes} minutes`);
    }
  });

  it('rotates the invitation variants across a week rather than repeating one', () => {
    const planned = planNotifications(optedIn({ commitment: 3 }), MONDAY_9AM);

    expect(new Set(planned.map((p) => p.title)).size).toBe(3);
  });

  it('is deterministic — replanning the same state renders identical text', () => {
    const state = optedIn({ commitment: 3 });

    expect(planNotifications(state, MONDAY_9AM)).toEqual(planNotifications(state, MONDAY_9AM));
  });

  it('uses the one fixed string for a warm check-in', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM - 30 * 60 * 1000)] });
    const checkIns = planNotifications(state, MONDAY_9AM).filter((p) => p.kind === 'still-here');

    expect(checkIns).toHaveLength(2);
    for (const checkIn of checkIns) {
      expect({ title: checkIn.title, body: checkIn.body }).toEqual(STILL_HERE_COPY);
    }
  });

  it('never names what the user missed', () => {
    const forbidden = /haven'?t|missed|catch up|still no|last time|streak|don'?t lose|expires?/i;
    for (const weeksQuiet of [0, 1, 2, 3, 4, 5]) {
      const state = optedIn({ sessions: [session(MONDAY_9AM - weeksQuiet * WEEK_MS)] });
      for (const planned of planNotifications(state, MONDAY_9AM)) {
        expect(`${planned.title} ${planned.body}`).not.toMatch(forbidden);
      }
    }
  });

  it('uses no emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    const state = optedIn({ sessions: [session(MONDAY_9AM - 30 * 60 * 1000)] });
    for (const planned of planNotifications(state, MONDAY_9AM)) {
      expect(`${planned.title} ${planned.body}`).not.toMatch(emoji);
    }
  });
});

describe('notification schedule — re-engagement is two messages, then silence', () => {
  it('plans the two check-ins at 2 and 4 quiet weeks from the last session', () => {
    const lastRun = MONDAY_9AM - 30 * 60 * 1000;
    const checkIns = planNotifications(optedIn({ sessions: [session(lastRun)] }), MONDAY_9AM)
      .filter((p) => p.kind === 'still-here')
      .map((p) => p.fireAt);

    const mondayAt6 = new Date(2026, 5, 1, 18, 0).getTime();
    expect(checkIns).toEqual([mondayAt6 + 2 * WEEK_MS, mondayAt6 + 4 * WEEK_MS]);
  });

  it('plans no more than two check-ins in any state', () => {
    for (const weeksQuiet of [0, 1, 2, 3, 4, 5, 8]) {
      const state = optedIn({ sessions: [session(MONDAY_9AM - weeksQuiet * WEEK_MS)] });
      const checkIns = planNotifications(state, MONDAY_9AM).filter((p) => p.kind === 'still-here');

      expect(checkIns.length).toBeLessThanOrEqual(2);
    }
  });

  it('falls silent once both check-ins are behind them', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM - 5 * WEEK_MS)] });

    expect(planNotifications(state, MONDAY_9AM)).toEqual([]);
  });

  it('offers no check-in to someone who has never run — they are new, not quiet', () => {
    expect(planNotifications(optedIn(), MONDAY_9AM).every((p) => p.kind !== 'still-here')).toBe(
      true,
    );
  });

  it('hands a quiet user warmth instead of invitations', () => {
    const state = optedIn({ sessions: [session(MONDAY_9AM - 2 * WEEK_MS)] });

    expect(planNotifications(state, MONDAY_9AM).every((p) => p.kind === 'still-here')).toBe(true);
  });
});

describe('notification schedule — gates and the hard rule', () => {
  it('plans nothing without an OS grant', () => {
    expect(planNotifications(optedIn({ settings: DEFAULT_NOTIFICATION_SETTINGS }), MONDAY_9AM))
      .toEqual([]);
  });

  it('plans nothing for a category the user switched off', () => {
    const base = optedIn();
    const remindersOff = optedIn({
      settings: { ...base.settings, categories: { reminder: false, 're-engagement': true } },
    });
    const checkInsOff = optedIn({
      settings: { ...base.settings, categories: { reminder: true, 're-engagement': false } },
      sessions: [session(MONDAY_9AM - 30 * 60 * 1000)],
    });

    expect(planNotifications(remindersOff, MONDAY_9AM)).toEqual([]);
    expect(planNotifications(checkInsOff, MONDAY_9AM).every((p) => p.kind !== 'still-here')).toBe(
      true,
    );
  });

  it('never gets denser as the week runs out (§3.21.1b hard rule)', () => {
    // Walk the same unfinished week hour by hour. The plan may only shrink: if
    // the remaining count ever rose, reminders would be tracking days-remaining.
    const state = optedIn({ commitment: 3 });
    let previous = Number.POSITIVE_INFINITY;
    // Monday 09:00 → Sunday 23:00; past that we are in the next week, which is
    // replanned from scratch.
    for (let hour = 0; hour <= 158; hour += 1) {
      const count = planNotifications(state, MONDAY_9AM + hour * 60 * 60 * 1000).length;
      expect(count).toBeLessThanOrEqual(previous);
      previous = count;
    }
  });

  it('carries only invitations and warmth, with no urgency field to render', () => {
    for (const weeksQuiet of [0, 1, 2, 3, 4]) {
      for (const commitment of [2, 3] as const) {
        const sessions =
          weeksQuiet === 0 ? [] : [session(MONDAY_9AM - weeksQuiet * WEEK_MS)];
        for (const planned of planNotifications(optedIn({ sessions, commitment }), MONDAY_9AM)) {
          expect(['invitation', 'warmth']).toContain(planned.framing);
          expect(Object.keys(planned).sort()).toEqual([
            'body',
            'category',
            'fireAt',
            'framing',
            'id',
            'kind',
            'title',
          ]);
        }
      }
    }
  });

  it('gives every planned notification a distinct id', () => {
    const state = optedIn({ commitment: 3, sessions: [session(MONDAY_9AM - 30 * 60 * 1000)] });
    const ids = planNotifications(state, MONDAY_9AM).map((p) => p.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('notification schedule — changing the reminder time cannot re-arm a day', () => {
  /** Tuesday 18:15 — a 2-session week's anchor has just fired at 18:00. */
  const TUESDAY_AFTER_THE_REMINDER = MONDAY_9AM + DAY_MS + 9 * 60 * 60 * 1000 + 15 * 60 * 1000;

  function movedLater(changedAt: number | null): NotificationPlanState {
    const base = optedIn();
    return optedIn({
      settings: {
        ...base.settings,
        reminderTime: { hour: 18, minute: 30 },
        reminderTimeChangedAt: changedAt,
      },
    });
  }

  it('drops today’s firing when the time was moved later today', () => {
    // Without the stamp the 18:30 slot is still in the future, so it would be
    // scheduled and the user would be reminded twice in one day.
    const unstamped = planNotifications(movedLater(null), TUESDAY_AFTER_THE_REMINDER);
    expect(unstamped.map((p) => new Date(p.fireAt).getDay())).toContain(2);

    const stamped = planNotifications(
      movedLater(TUESDAY_AFTER_THE_REMINDER),
      TUESDAY_AFTER_THE_REMINDER,
    );
    expect(stamped.map((p) => new Date(p.fireAt).getDay())).not.toContain(2);
  });

  it('applies the new time from the next anchor day onward', () => {
    const plan = planNotifications(
      movedLater(TUESDAY_AFTER_THE_REMINDER),
      TUESDAY_AFTER_THE_REMINDER,
    );

    expect(plan).toHaveLength(1);
    expect(new Date(plan[0].fireAt).getDay()).toBe(6); // Saturday
    expect(new Date(plan[0].fireAt).getMinutes()).toBe(30);
  });

  it('never lets a quiet period exceed its two check-ins', () => {
    // The milestone fired this morning; moving the time later must not add a
    // third message to a period §3.21.1c caps at two.
    const lastRun = MONDAY_9AM - 2 * WEEK_MS;
    const milestoneDay = MONDAY_9AM + 10 * 60 * 60 * 1000; // Monday 19:00
    const base = optedIn();
    const state = optedIn({
      sessions: [session(lastRun)],
      settings: {
        ...base.settings,
        reminderTime: { hour: 19, minute: 30 },
        reminderTimeChangedAt: milestoneDay,
      },
    });

    const checkIns = planNotifications(state, milestoneDay).filter((p) => p.kind === 'still-here');

    expect(checkIns.map((p) => startOfDay(p.fireAt))).not.toContain(startOfDay(milestoneDay));
  });
});

describe('notification schedule — wording is fixed for the week', () => {
  it('does not reword a later anchor as earlier ones pass', () => {
    const state = optedIn({ commitment: 3 });
    const saturdayOn = (now: number) =>
      planNotifications(state, now).find((p) => new Date(p.fireAt).getDay() === 6);

    const fromMonday = saturdayOn(MONDAY_9AM);
    const fromThursday = saturdayOn(MONDAY_9AM + 3 * DAY_MS);

    expect(fromMonday).toBeDefined();
    expect(fromThursday).toEqual(fromMonday);
  });
});
