import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FirstSessionScreen from '@/app/(onboarding)/first-session';
import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { AuthProvider } from '@/src/providers/auth-provider';
import { NotificationPermissionsProvider } from '@/src/providers/notification-permissions-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ bracket: 'never-run', weeklyCommitment: '2' }),
}));

/**
 * A repository whose notification pre-prompt (§3.21.2) has already been answered,
 * so Start goes straight to the account offer these cases are about. The
 * pre-prompt's own behaviour — including that it comes *first* — is covered in
 * notification-pre-prompt.test.tsx.
 */
async function pastNotificationPrompt(): Promise<InMemoryRepository> {
  const repository = new InMemoryRepository();
  await repository.saveNotificationSettings({
    prePrompt: 'not-now',
    osPermission: 'undetermined',
    categories: { reminder: true, celebration: true, 're-engagement': true },
  });
  return repository;
}

function renderScreen(client: FakeAuthClient, repository: InMemoryRepository) {
  render(
    <AuthProvider client={client}>
      <RepositoryProvider repository={repository}>
        <NotificationPermissionsProvider>
          <FirstSessionScreen />
        </NotificationPermissionsProvider>
      </RepositoryProvider>
    </AuthProvider>,
  );
  return repository;
}

describe('Deferred account prompt (DESIGN.md §3.12)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it('offers "Create account" and "Just run" when Start is pressed without an account', async () => {
    renderScreen(new FakeAuthClient(), await pastNotificationPrompt());

    fireEvent.press(screen.getByText('Start'));

    expect(await screen.findByText('Create account')).toBeTruthy();
    expect(screen.getByText('Just run')).toBeTruthy();
    // The offer must be honest about what an account is for, and never a gate.
    expect(screen.getByText(/only on this phone/i)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('saves the onboarding selections before asking, so nothing is lost either way', async () => {
    const repository = await pastNotificationPrompt();
    renderScreen(new FakeAuthClient(), repository);
    const saveOnboarding = jest.spyOn(repository, 'saveOnboarding');

    fireEvent.press(screen.getByText('Start'));

    await waitFor(() =>
      expect(saveOnboarding).toHaveBeenCalledWith({ bracket: 'never-run', weeklyCommitment: 2 }),
    );
  });

  it('goes straight to the run when the user picks "Just run"', async () => {
    renderScreen(new FakeAuthClient(), await pastNotificationPrompt());
    fireEvent.press(screen.getByText('Start'));

    fireEvent.press(await screen.findByText('Just run'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('routes to sign-in when the user picks "Create account"', async () => {
    renderScreen(new FakeAuthClient(), await pastNotificationPrompt());
    fireEvent.press(screen.getByText('Start'));

    fireEvent.press(await screen.findByText('Create account'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/sign-in'));
  });

  it('does not ask a signed-in user again — Start just goes home', async () => {
    renderScreen(
      new FakeAuthClient(['apple'], { id: 'user-1', provider: 'apple' }),
      await pastNotificationPrompt(),
    );
    // Wait for the session to be restored before pressing Start.
    await waitFor(() => expect(screen.getByText('Start')).toBeTruthy());

    fireEvent.press(screen.getByText('Start'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('Create account')).toBeNull();
  });
});
