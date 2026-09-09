import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FirstSessionScreen from '@/app/(onboarding)/first-session';
import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { AuthProvider } from '@/src/providers/auth-provider';
import { NotificationPermissionsProvider } from '@/src/providers/notification-permissions-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useLocalSearchParams: () => ({ bracket: 'never-run', weeklyCommitment: '2' }),
}));

/**
 * Renders as an already-signed-in user, so Start goes straight to the run. The
 * anonymous path — where Start raises the deferred account prompt instead — is
 * covered in account-prompt.test.tsx.
 */
function renderWithRepository(repository: InMemoryRepository) {
  return render(
    <AuthProvider client={new FakeAuthClient(['apple'], { id: 'user-1', provider: 'apple' })}>
      <RepositoryProvider repository={repository}>
        <NotificationPermissionsProvider>
          <FirstSessionScreen />
        </NotificationPermissionsProvider>
      </RepositoryProvider>
    </AuthProvider>,
  );
}

describe('FirstSessionScreen', () => {
  beforeEach(() => mockReplace.mockClear());

  it('shows the prescription derived from the chosen bracket', () => {
    renderWithRepository(new InMemoryRepository());

    // never-run → 10 minutes (prescriptionForBracket placeholder, DESIGN.md §3.14)
    expect(screen.getByText('Walk/run for 10 minutes')).toBeTruthy();
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('persists the typed onboarding selections, then goes home, on Start', async () => {
    const repository = new InMemoryRepository();
    // The notification pre-prompt (§3.21.2) is already answered, so Start heads
    // straight home; that ask has its own test file.
    await repository.saveNotificationSettings({
      prePrompt: 'not-now',
      osPermission: 'undetermined',
      categories: { reminder: true, celebration: true, 're-engagement': true },
    });
    const saveOnboarding = jest.spyOn(repository, 'saveOnboarding');
    renderWithRepository(repository);
    // Let the provider settle on the restored session before pressing Start.
    await waitFor(() => expect(screen.getByText('Start')).toBeTruthy());

    fireEvent.press(screen.getByText('Start'));

    await waitFor(() =>
      expect(saveOnboarding).toHaveBeenCalledWith({
        bracket: 'never-run',
        weeklyCommitment: 2,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });
});
