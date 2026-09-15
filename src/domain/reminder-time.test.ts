import {
  REMINDER_TIME_STEP_MINUTES,
  formatReminderTime,
  isEarliestReminderTime,
  isLatestReminderTime,
  shiftReminderTime,
} from './reminder-time';

describe('reminder time control', () => {
  it('steps by half an hour in both directions', () => {
    expect(shiftReminderTime({ hour: 18, minute: 0 }, REMINDER_TIME_STEP_MINUTES)).toEqual({
      hour: 18,
      minute: 30,
    });
    expect(shiftReminderTime({ hour: 18, minute: 0 }, -REMINDER_TIME_STEP_MINUTES)).toEqual({
      hour: 17,
      minute: 30,
    });
  });

  it('never lands on a time nobody could act on', () => {
    expect(shiftReminderTime({ hour: 5, minute: 0 }, -REMINDER_TIME_STEP_MINUTES)).toEqual({
      hour: 5,
      minute: 0,
    });
    expect(shiftReminderTime({ hour: 22, minute: 0 }, REMINDER_TIME_STEP_MINUTES)).toEqual({
      hour: 22,
      minute: 0,
    });
    expect(isEarliestReminderTime({ hour: 5, minute: 0 })).toBe(true);
    expect(isLatestReminderTime({ hour: 22, minute: 0 })).toBe(true);
    expect(isEarliestReminderTime({ hour: 18, minute: 0 })).toBe(false);
    expect(isLatestReminderTime({ hour: 18, minute: 0 })).toBe(false);
  });

  it('shows a 24-hour clock', () => {
    expect(formatReminderTime({ hour: 7, minute: 30 })).toBe('07:30');
    expect(formatReminderTime({ hour: 18, minute: 0 })).toBe('18:00');
  });
});
