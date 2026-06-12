import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FirstSessionScreen from '@/app/(onboarding)/first-session';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { RepositoryProvider } from '@/src/providers/repository-provider';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ bracket: 'never-run', weeklyCommitment: '2' }),
}));

function renderWithRepository(repository: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repository}>
      <FirstSessionScreen />
    </RepositoryProvider>,
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
    const saveOnboarding = jest.spyOn(repository, 'saveOnboarding');
    renderWithRepository(repository);

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
