import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';


import SettingsScreen from '@/app/settings';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import type { NotificationSettings } from '@/src/domain/types';
import { FakeNotificationPermissions } from '@/src/notifications/notification-permissions';
import { NotificationPermissionsProvider } from '@/src/providers/notification-permissions-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const OPTED_IN: NotificationSettings = {
  prePrompt: 'accepted',
  osPermission: 'granted',
  categories: { reminder: true, celebration: true, 're-engagement': true },
};

async function renderSettings(
  stored: NotificationSettings | null = OPTED_IN,
  permissions = new FakeNotificationPermissions('granted'),
) {
  const repository = new InMemoryRepository();
  if (stored) {
    await repository.saveNotificationSettings(stored);
  }
  render(
    <RepositoryProvider repository={repository}>
      <NotificationPermissionsProvider permissions={permissions}>
        <SettingsScreen />
      </NotificationPermissionsProvider>
    </RepositoryProvider>,
  );
  // Let the initial read settle.
  await waitFor(() => expect(screen.getByText('Reminders')).toBeTruthy());
  return { repository, permissions };
}

describe('Settings — per-category notification toggles (DESIGN.md §3.21.2)', () => {
  it('shows one toggle per v1 category', async () => {
    await renderSettings();

    expect(screen.getByTestId('toggle-reminder')).toBeTruthy();
    expect(screen.getByTestId('toggle-celebration')).toBeTruthy();
    expect(screen.getByTestId('toggle-re-engagement')).toBeTruthy();
  });

  it('reflects the stored value of each toggle', async () => {
    await renderSettings({
      ...OPTED_IN,
      categories: { reminder: true, celebration: false, 're-engagement': false },
    });

    expect(screen.getByTestId('toggle-reminder').props.value).toBe(true);
    expect(screen.getByTestId('toggle-celebration').props.value).toBe(false);
  });

  it('persists a category the user switches off', async () => {
    const { repository } = await renderSettings();

    await act(async () => {
      fireEvent(screen.getByTestId('toggle-re-engagement'), 'valueChange', false);
    });

    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.categories).toEqual({
        reminder: true,
        celebration: true,
        're-engagement': false,
      }),
    );
  });

  it('switches a category back on', async () => {
    const { repository } = await renderSettings({
      ...OPTED_IN,
      categories: { reminder: false, celebration: true, 're-engagement': true },
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
    categories: { reminder: true, celebration: true, 're-engagement': true },
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
