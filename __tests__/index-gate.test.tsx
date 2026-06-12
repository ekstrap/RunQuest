import { render, waitFor } from '@testing-library/react-native';

import IndexGate from '@/app/index';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { RepositoryProvider } from '@/src/providers/repository-provider';

// Capture where the entry gate redirects, without a real navigator.
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

function renderGate(repository: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repository}>
      <IndexGate />
    </RepositoryProvider>,
  );
}

describe('IndexGate', () => {
  beforeEach(() => mockRedirect.mockClear());

  it('sends a not-yet-onboarded user into the welcome flow', async () => {
    renderGate(new InMemoryRepository());

    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/welcome'));
  });

  it('sends an onboarded user straight to home', async () => {
    const repository = new InMemoryRepository();
    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });

    renderGate(repository);

    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/home'));
  });
});
