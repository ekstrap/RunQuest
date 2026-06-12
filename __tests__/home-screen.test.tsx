import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { RepositoryProvider } from '@/src/providers/repository-provider';

// Route-component tests live under __tests__/ (not in app/) so expo-router's
// file-based route scanner never treats them as screens during `expo export`.
describe('HomeScreen', () => {
  it('displays the level read through the repository interface', async () => {
    const repository = new InMemoryRepository({ xpTotal: 0, level: 1 });

    render(
      <RepositoryProvider repository={repository}>
        <HomeScreen />
      </RepositoryProvider>,
    );

    expect(await screen.findByText('Level 1')).toBeTruthy();
  });
});
