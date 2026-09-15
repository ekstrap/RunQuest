import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';


import SettingsScreen from '@/app/settings';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { DEFAULT_REMINDER_TIME, type NotificationSettings } from '@/src/domain/types';
import { FakeNotificationPermissions } from '@/src/notifications/notification-permissions';
import { FakeNotificationScheduler } from '@/src/notifications/notification-scheduler';
import { NotificationPermissionsProvider } from '@/src/providers/notification-permissions-provider';
import { NotificationSchedulerProvider } from '@/src/providers/notification-scheduler-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const OPTED_IN: NotificationSettings = {
  prePrompt: 'accepted',
  osPermission: 'granted',
  categories: { reminder: true, 're-engagement': true },
  reminderTime: DEFAULT_REMINDER_TIME,
  reminderTimeChangedAt: null,
};

async function renderSettings(
  stored: NotificationSettings | null = OPTED_IN,
  permissions = new FakeNotificationPermissions('granted'),
) {
  const repository = new InMemoryRepository();
  await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
  if (stored) {
    await repository.saveNotificationSettings(stored);
  }
  const scheduler = new FakeNotificationScheduler();
  render(
    <RepositoryProvider repository={repository}>
      <NotificationPermissionsProvider permissions={permissions}>
        <NotificationSchedulerProvider scheduler={scheduler}>
          <SettingsScreen />
        </NotificationSchedulerProvider>
      </NotificationPermissionsProvider>
    </RepositoryProvider>,
  );
  // Let the initial read settle.
  await waitFor(() => expect(screen.getByText('Reminders')).toBeTruthy());
  return { repository, permissions, scheduler };
}

describe('Settings — per-category notification toggles (DESIGN.md §3.21.2)', () => {
  it('shows one toggle per v1 category', async () => {
    await renderSettings();

    expect(screen.getByTestId('toggle-reminder')).toBeTruthy();
    expect(screen.getByTestId('toggle-re-engagement')).toBeTruthy();
    // No celebration row: v1 sends no celebration push, and a toggle that
    // controls nothing is dishonest (DESIGN.md §3.21.1).
    expect(screen.queryByTestId('toggle-celebration')).toBeNull();
    expect(screen.queryByText(/celebration/i)).toBeNull();
  });

  it('reflects the stored value of each toggle', async () => {
    await renderSettings({
      ...OPTED_IN,
      categories: { reminder: true, 're-engagement': false },
    });

    expect(screen.getByTestId('toggle-reminder').props.value).toBe(true);
    expect(screen.getByTestId('toggle-re-engagement').props.value).toBe(false);
  });

  it('renders settings stored by an earlier build that still carry a celebration key', async () => {
    // Nothing shipped, so this is not a migration — but a phone that ran an
    // earlier build still holds the old key, and reading it must not explode.
    await renderSettings({
      ...OPTED_IN,
      categories: {
        reminder: true,
        're-engagement': true,
        celebration: true,
      } as NotificationSettings['categories'],
    });

    expect(screen.getByTestId('toggle-reminder').props.value).toBe(true);
    expect(screen.queryByTestId('toggle-celebration')).toBeNull();
  });

  it('persists a category the user switches off', async () => {
    const { repository } = await renderSettings();

    await act(async () => {
      fireEvent(screen.getByTestId('toggle-re-engagement'), 'valueChange', false);
    });

    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.categories).toEqual({
        reminder: true,
        're-engagement': false,
      }),
    );
  });

  it('switches a category back on', async () => {
    const { repository } = await renderSettings({
      ...OPTED_IN,
      categories: { reminder: false, 're-engagement': true },
    });

    await act(async () => {
      fireEvent(screen.getByTestId('toggle-reminder'), 'valueChange', true);
    });

    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.categories.reminder).toBe(true),
    );
  });
});

describe('Settings — re-asking after a soft decline (§3.21.2)', () => {
  const softlyDeclined: NotificationSettings = {
    prePrompt: 'not-now',
    osPermission: 'undetermined',
    categories: { reminder: true, 're-engagement': true },
    reminderTime: DEFAULT_REMINDER_TIME,
    reminderTimeChangedAt: null,
  };

  it('offers to turn notifications on for a user who said "not now"', async () => {
    await renderSettings(softlyDeclined, new FakeNotificationPermissions('undetermined'));

    expect(screen.getByText('Turn on notifications')).toBeTruthy();
  });

  it('fires the OS prompt from settings and stores the grant', async () => {
    const permissions = new FakeNotificationPermissions('undetermined', 'granted');
    const { repository } = await renderSettings(softlyDeclined, permissions);

    await act(async () => {
      fireEvent.press(screen.getByText('Turn on notifications'));
    });

    expect(permissions.requestCount).toBe(1);
    await waitFor(async () => {
      const settings = await repository.getNotificationSettings();
      expect(settings?.prePrompt).toBe('accepted');
      expect(settings?.osPermission).toBe('granted');
    });
    await waitFor(() => expect(screen.queryByText('Turn on notifications')).toBeNull());
  });

  it('explains where to go when the OS itself is holding the "no"', async () => {
    await renderSettings(
      { ...softlyDeclined, prePrompt: 'accepted', osPermission: 'denied' },
      new FakeNotificationPermissions('denied'),
    );

    // The OS prompt is one-shot: from here only the system settings can undo it,
    // and the copy has to say so instead of re-prompting into a no-op.
    expect(screen.getByText(/system settings/i)).toBeTruthy();
    expect(screen.queryByText('Turn on notifications')).toBeNull();
  });

  it('repairs a stored grant the user has since revoked in system settings', async () => {
    const { repository } = await renderSettings(OPTED_IN, new FakeNotificationPermissions('denied'));

    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.osPermission).toBe('denied'),
    );
    // And the screen tells the truth about where the "no" now lives.
    expect(screen.getByText(/system settings/i)).toBeTruthy();
  });

  it('starts a never-asked user from the defaults without crashing', async () => {
    await renderSettings(null, new FakeNotificationPermissions('undetermined'));

    expect(screen.getByText('Turn on notifications')).toBeTruthy();
    expect(screen.getByTestId('toggle-reminder').props.value).toBe(true);
  });
});

describe('Settings — reminder time (DESIGN.md §3.21.1b)', () => {
  it('starts at 18:00, the time a newcomer can act on', async () => {
    await renderSettings();

    expect(screen.getByTestId('reminder-time')).toHaveTextContent('18:00');
  });

  it('steps the time and reschedules against it', async () => {
    const { repository, scheduler } = await renderSettings();

    await act(async () => {
      fireEvent.press(screen.getByTestId('reminder-later'));
    });

    expect(screen.getByTestId('reminder-time')).toHaveTextContent('18:30');
    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.reminderTime).toEqual({
        hour: 18,
        minute: 30,
      }),
    );
    await waitFor(() => {
      expect(scheduler.scheduled).not.toHaveLength(0);
      for (const planned of scheduler.scheduled) {
        expect(new Date(planned.fireAt).getMinutes()).toBe(30);
      }
    });
  });

  it('offers no day-picker — which days is not the user’s to choose (§3.21.1b)', async () => {
    await renderSettings();

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
      expect(screen.queryByText(new RegExp(`^${day}$`))).toBeNull();
    }
  });

  it('hides the time control when reminders are switched off', async () => {
    await renderSettings({ ...OPTED_IN, categories: { reminder: false, 're-engagement': true } });

    expect(screen.queryByTestId('reminder-time-section')).toBeNull();
  });

  it('hides the time control until the OS has actually granted permission', async () => {
    await renderSettings(
      { ...OPTED_IN, osPermission: 'denied' },
      new FakeNotificationPermissions('denied'),
    );

    expect(screen.queryByTestId('reminder-time-section')).toBeNull();
  });

  it('cancels every pending notification when a category is switched off', async () => {
    const { scheduler } = await renderSettings();

    await act(async () => {
      fireEvent.press(screen.getByTestId('toggle-reminder'));
    });

    await waitFor(() =>
      expect(scheduler.scheduled.filter((p) => p.kind === 'session-invitation')).toEqual([]),
    );
  });
});
