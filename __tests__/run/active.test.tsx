import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { LocationProvider } from '@/src/providers/location-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';
import type { LocationReading, LocationSource } from '@/src/run/location-source';

import RunActiveScreen from '@/app/run/active';

const mockReplace = jest.fn();
let mockMode = 'just-run';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ mode: mockMode }),
}));

/** A fake location source that emits a single fixed reading on subscribe. */
function fakeLocationSource(reading: LocationReading): LocationSource {
  return {
    subscribe(listener) {
      listener(reading);
      return () => {};
    },
  };
}

function renderWithProviders(
  ui: ReactElement,
  { repository, source }: { repository: InMemoryRepository; source?: LocationSource },
) {
  return render(
    <RepositoryProvider repository={repository}>
      <LocationProvider source={source}>{ui}</LocationProvider>
    </RepositoryProvider>,
  );
}

describe('RunActiveScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-16T08:00:00Z'));
    mockReplace.mockClear();
    mockMode = 'just-run';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the elapsed timer counting up', () => {
    const repository = new InMemoryRepository();
    renderWithProviders(<RunActiveScreen />, { repository });

    expect(screen.getByTestId('elapsed')).toHaveTextContent('00:00');

    act(() => {
      jest.advanceTimersByTime(65_000);
    });

    expect(screen.getByTestId('elapsed')).toHaveTextContent('01:05');
  });

  it('renders the map and subscribes to the location source', () => {
    const repository = new InMemoryRepository();
    const source = fakeLocationSource({
      coordinate: { latitude: 55.6761, longitude: 12.5683 },
      distanceMeters: 250,
    });

    renderWithProviders(<RunActiveScreen />, { repository, source });

    // The map renders; live location is shown as a blue dot by MapView, not text.
    expect(screen.getByTestId('run-map')).toBeTruthy();
  });

  it('shows no XP, level, or achievement UI during the run', () => {
    const repository = new InMemoryRepository();
    renderWithProviders(<RunActiveScreen />, { repository });

    expect(screen.queryByText(/level/i)).toBeNull();
    expect(screen.queryByText(/\bxp\b/i)).toBeNull();
    expect(screen.queryByText(/achievement/i)).toBeNull();
  });

  it('ending the run saves a retrievable session record with the chosen mode', async () => {
    const repository = new InMemoryRepository();
    const source = fakeLocationSource({
      coordinate: { latitude: 1, longitude: 2 },
      distanceMeters: 800,
    });
    renderWithProviders(<RunActiveScreen />, { repository, source });

    act(() => {
      jest.advanceTimersByTime(600_000); // 10 minutes
    });
    await act(async () => {
      fireEvent.press(screen.getByText('End run'));
    });

    const sessions = await repository.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      mode: 'just-run',
      durationSeconds: 600,
      distanceMeters: 800,
    });
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('completes without GPS — the saved record has null distance', async () => {
    const repository = new InMemoryRepository();
    // No source provided → the default unavailable (no-GPS) source.
    renderWithProviders(<RunActiveScreen />, { repository });

    await act(async () => {
      fireEvent.press(screen.getByText('End run'));
    });

    const [session] = await repository.getSessions();
    expect(session.distanceMeters).toBeNull();
  });
});
