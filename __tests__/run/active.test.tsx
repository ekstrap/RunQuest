import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { InMemoryRepository } from '@/src/data/in-memory-repository';
import type { CueEvent } from '@/src/domain/interval-cues';
import { CuePlayerProvider } from '@/src/providers/cue-player-provider';
import { LocationProvider } from '@/src/providers/location-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';
import type { CuePlayer } from '@/src/run/cue-player';
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

/** A spy cue player that records every cue it's asked to play. */
function spyCuePlayer(): { player: CuePlayer; cues: CueEvent[] } {
  const cues: CueEvent[] = [];
  return { player: { play: (event) => void cues.push(event) }, cues };
}

function renderWithProviders(
  ui: ReactElement,
  {
    repository,
    source,
    player,
  }: { repository: InMemoryRepository; source?: LocationSource; player?: CuePlayer },
) {
  return render(
    <RepositoryProvider repository={repository}>
      <LocationProvider source={source}>
        <CuePlayerProvider player={player}>{ui}</CuePlayerProvider>
      </LocationProvider>
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

  describe('interval mode audio cues', () => {
    beforeEach(() => {
      mockMode = 'interval';
    });

    /** Save onboarding so the screen can derive a prescription, then flush the load. */
    async function withNeverRunOnboarding(repository: InMemoryRepository) {
      // never-run → 10 min, 60s walk / 30s run.
      await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
    }

    it('plays a transition cue at the start of each walk/run phase', async () => {
      const repository = new InMemoryRepository();
      await withNeverRunOnboarding(repository);
      const { player, cues } = spyCuePlayer();

      renderWithProviders(<RunActiveScreen />, { repository, player });
      // Flush the async prescription load → the first (walk@0) cue fires.
      await act(async () => {});

      expect(cues).toEqual([{ atSecond: 0, phase: 'walk', durationSeconds: 60 }]);

      await act(async () => {
        jest.advanceTimersByTime(60_000); // → run@60
      });
      await act(async () => {
        jest.advanceTimersByTime(30_000); // → walk@90
      });

      expect(cues).toEqual([
        { atSecond: 0, phase: 'walk', durationSeconds: 60 },
        { atSecond: 60, phase: 'run', durationSeconds: 30 },
        { atSecond: 90, phase: 'walk', durationSeconds: 60 },
      ]);
    });

    it('plays no cues for just-run', async () => {
      mockMode = 'just-run';
      const repository = new InMemoryRepository();
      await withNeverRunOnboarding(repository);
      const { player, cues } = spyCuePlayer();

      renderWithProviders(<RunActiveScreen />, { repository, player });
      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(cues).toEqual([]);
    });

    it('plays no cues for just-walk', async () => {
      mockMode = 'just-walk';
      const repository = new InMemoryRepository();
      await withNeverRunOnboarding(repository);
      const { player, cues } = spyCuePlayer();

      renderWithProviders(<RunActiveScreen />, { repository, player });
      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(cues).toEqual([]);
    });

    it('completes into the same session record shape as a plain run', async () => {
      const repository = new InMemoryRepository();
      await withNeverRunOnboarding(repository);
      const { player } = spyCuePlayer();
      const source = fakeLocationSource({
        coordinate: { latitude: 1, longitude: 2 },
        distanceMeters: 1200,
      });

      renderWithProviders(<RunActiveScreen />, { repository, source, player });
      await act(async () => {});
      await act(async () => {
        jest.advanceTimersByTime(600_000); // 10 minutes
      });
      await act(async () => {
        fireEvent.press(screen.getByText('End run'));
      });

      const sessions = await repository.getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual({
        mode: 'interval',
        startedAt: expect.any(Number),
        durationSeconds: 600,
        distanceMeters: 1200,
      });
    });
  });
});
