import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FirstSessionScreen from '@/app/(onboarding)/first-session';
import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { DEFAULT_REMINDER_TIME } from '@/src/domain/types';
import { FakeNotificationPermissions } from '@/src/notifications/notification-permissions';
import { FakeNotificationScheduler } from '@/src/notifications/notification-scheduler';
import { AuthProvider } from '@/src/providers/auth-provider';
import { NotificationPermissionsProvider } from '@/src/providers/notification-permissions-provider';
import { NotificationSchedulerProvider } from '@/src/providers/notification-scheduler-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ bracket: 'never-run', weeklyCommitment: '2' }),
}));

const PRE_PROMPT_YES = 'Sounds good';
const PRE_PROMPT_NO = 'Not now';

/** Signed in by default, so the account prompt doesn't crowd the assertions. */
function renderScreen({
  repository = new InMemoryRepository(),
  permissions = new FakeNotificationPermissions(),
  scheduler = new FakeNotificationScheduler(),
  client = new FakeAuthClient(['apple'], { id: 'user-1', provider: 'apple' }),
} = {}) {
  render(
    <AuthProvider client={client}>
      <RepositoryProvider repository={repository}>
        <NotificationPermissionsProvider permissions={permissions}>
          <NotificationSchedulerProvider scheduler={scheduler}>
            <FirstSessionScreen />
          </NotificationSchedulerProvider>
        </NotificationPermissionsProvider>
      </RepositoryProvider>
    </AuthProvider>,
  );
  return { repository, permissions, scheduler };
}

async function pressStart() {
  await waitFor(() => expect(screen.getByText('Start')).toBeTruthy());
  await act(async () => {
    fireEvent.press(screen.getByText('Start'));
  });
}

describe('Notification pre-prompt (DESIGN.md §3.21.2)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it('shows our own friendly ask before the OS prompt ever fires', async () => {
    const { permissions } = renderScreen();

    await pressStart();

    expect(await screen.findByText(PRE_PROMPT_YES)).toBeTruthy();
    expect(screen.getByText(PRE_PROMPT_NO)).toBeTruthy();
    // An invitation and an explicit promise of control — and no promise of a
    // celebration, which v1 does not deliver by push (DESIGN.md §3.21.2).
    expect(screen.getByText(/gentle reminders/i)).toBeTruthy();
    expect(screen.getByText(/in control/i)).toBeTruthy();
    expect(screen.queryByText(/celebration/i)).toBeNull();
    // The irreversible OS prompt has not been burned yet.
    expect(permissions.requestCount).toBe(0);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('asks the OS only after the user says yes, and stores the grant', async () => {
    const { repository, permissions } = renderScreen({
      permissions: new FakeNotificationPermissions('undetermined', 'granted'),
    });
    await pressStart();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_YES));
    });

    expect(permissions.requestCount).toBe(1);
    await waitFor(async () =>
      expect(await repository.getNotificationSettings()).toEqual({
        prePrompt: 'accepted',
        osPermission: 'granted',
        // A single ask turns all three categories on; settings tunes them later.
        categories: { reminder: true, 're-engagement': true },
        reminderTime: DEFAULT_REMINDER_TIME,
        reminderTimeChangedAt: null,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('schedules the first week of invitations as soon as the grant lands', async () => {
    // The week the user is about to start is the one that matters most, so
    // opting in schedules straight away rather than waiting for a foreground.
    const repository = new InMemoryRepository();
    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
    const { scheduler } = renderScreen({
      repository,
      permissions: new FakeNotificationPermissions('undetermined', 'granted'),
    });
    await pressStart();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_YES));
    });

    await waitFor(() =>
      expect(scheduler.scheduled.map((planned) => planned.kind)).toContain('session-invitation'),
    );
  });

  it('schedules nothing when the user declines our own pre-prompt', async () => {
    const repository = new InMemoryRepository();
    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
    const { scheduler } = renderScreen({ repository });
    await pressStart();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_NO));
    });

    expect(scheduler.scheduled).toEqual([]);
  });

  it('leaves the OS prompt unburned on "Not now", and stays re-askable', async () => {
    const { repository, permissions } = renderScreen();
    await pressStart();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_NO));
    });

    expect(permissions.requestCount).toBe(0);
    await waitFor(async () => {
      const settings = await repository.getNotificationSettings();
      expect(settings?.prePrompt).toBe('not-now');
      expect(settings?.osPermission).toBe('undetermined');
    });
    // A soft decline is not a permanent one — settings can ask again later.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('records the OS answer honestly when the user declines the system prompt', async () => {
    const { repository } = renderScreen({
      permissions: new FakeNotificationPermissions('undetermined', 'denied'),
    });
    await pressStart();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_YES));
    });

    await waitFor(async () =>
      expect((await repository.getNotificationSettings())?.osPermission).toBe('denied'),
    );
  });

  it('asks only once — a user who has answered is not asked again', async () => {
    const repository = new InMemoryRepository();
    await repository.saveNotificationSettings({
      prePrompt: 'not-now',
      osPermission: 'undetermined',
      categories: { reminder: true, 're-engagement': true },
      reminderTime: DEFAULT_REMINDER_TIME,
      reminderTimeChangedAt: null,
    });
    renderScreen({ repository });

    await pressStart();

    expect(screen.queryByText(PRE_PROMPT_YES)).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('comes before the deferred account prompt for an anonymous user', async () => {
    renderScreen({ client: new FakeAuthClient() });
    await pressStart();

    expect(await screen.findByText(PRE_PROMPT_YES)).toBeTruthy();
    expect(screen.queryByText('Create account')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByText(PRE_PROMPT_NO));
    });

    expect(await screen.findByText('Create account')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
