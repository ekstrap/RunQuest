import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import StatsScreen from '@/app/stats';
import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { AuthProvider } from '@/src/providers/auth-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';
import type { SessionRecord } from '@/src/domain/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Route-component tests live under __tests__/ (not in app/) so expo-router's
// file-based route scanner never treats them as screens during `expo export`.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function renderStats(repository: InMemoryRepository, client = new FakeAuthClient()) {
  return render(
    <AuthProvider client={client}>
      <RepositoryProvider repository={repository}>
        <StatsScreen />
      </RepositoryProvider>
    </AuthProvider>,
  );
}

function sessionAt(startedAt: number, distanceMeters: number | null = null): SessionRecord {
  return { mode: 'interval', startedAt, durationSeconds: 600, distanceMeters };
}

/** A repository with onboarding done: never-run bracket, 2 sessions/week. */
async function onboardedRepository() {
  const repository = new InMemoryRepository();
  await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
  return repository;
}

/** Save two sessions in the week containing `weekAnchor` — completes a 2-commitment week. */
async function completeWeek(repository: InMemoryRepository, weekAnchor: number) {
  await repository.saveSession(sessionAt(weekAnchor));
  await repository.saveSession(sessionAt(weekAnchor + 60_000));
}

describe('StatsScreen', () => {
  it('renders all four sections through the repository interface', async () => {
    const repository = await onboardedRepository();
    await completeWeek(repository, Date.now() - WEEK_MS);

    renderStats(repository);

    expect(await screen.findByTestId('lifetime-weeks')).toBeTruthy();
    expect(screen.getByTestId('streak')).toBeTruthy();
    expect(screen.getByTestId('run-history')).toBeTruthy();
    expect(screen.getByTestId('ability-narrative')).toBeTruthy();
  });

  it('shows lifetime weeks completed from the session history', async () => {
    const repository = await onboardedRepository();
    await completeWeek(repository, Date.now() - 2 * WEEK_MS);
    await completeWeek(repository, Date.now() - WEEK_MS);

    renderStats(repository);

    expect(await screen.findByText('2 weeks completed')).toBeTruthy();
  });

  it('shows the streak count with plain framing while active', async () => {
    const repository = await onboardedRepository();
    await completeWeek(repository, Date.now() - WEEK_MS);
    await completeWeek(repository, Date.now());

    renderStats(repository);

    expect(await screen.findByText('2-week streak')).toBeTruthy();
  });

  it('shows warm miss-you copy after 2 missed weeks, with no failure wording', async () => {
    const repository = await onboardedRepository();
    await completeWeek(repository, Date.now() - 3 * WEEK_MS);

    renderStats(repository);

    expect(await screen.findByText('Your runs are here whenever you are.')).toBeTruthy();
    expect(screen.queryByText(/fail|lost|broken|don’t lose|don't lose/i)).toBeNull();
  });

  it('archives the streak warmly after 4+ missed weeks', async () => {
    const repository = await onboardedRepository();
    await completeWeek(repository, Date.now() - 5 * WEEK_MS);

    renderStats(repository);

    expect(await screen.findByText('Look how far you got — ready to start fresh?')).toBeTruthy();
    expect(screen.queryByText(/fail|lost|broken|don’t lose|don't lose/i)).toBeNull();
  });

  it('lists run history newest first with time and distance', async () => {
    const repository = await onboardedRepository();
    const older = new Date(2026, 5, 1, 8, 0).getTime();
    const newer = new Date(2026, 5, 3, 8, 0).getTime();
    await repository.saveSession(sessionAt(older, 1600));
    await repository.saveSession(sessionAt(newer));

    renderStats(repository);

    const history = await screen.findByTestId('run-history');
    expect(history).toBeTruthy();
    // Both rows render: elapsed for each, distance only where GPS gave one.
    expect(screen.getAllByText('10:00')).toHaveLength(1); // no-distance row
    expect(screen.getByText('10:00 · 1.6 km')).toBeTruthy();
    // Newest first: the newer date's row precedes the older one.
    const dates = [new Date(newer).toLocaleDateString(), new Date(older).toLocaleDateString()];
    const rendered = screen.getAllByText(new RegExp(dates.join('|')));
    expect(rendered[0].props.children).toBe(dates[0]);
  });

  it('shows a gentle empty state before any runs', async () => {
    renderStats(await onboardedRepository());

    expect(await screen.findByText('Your runs will show up here.')).toBeTruthy();
  });

  it('renders the ability narrative as a story, never a numeric score', async () => {
    const repository = await onboardedRepository();
    await repository.saveCalibration({ step: 3 }); // advanced past the never-run start

    renderStats(repository);

    expect(
      await screen.findByText(
        'Started at 10 minutes, mostly walking — now 25 minutes, mostly running.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/step 3|step: 3|ability score|fitness/i)).toBeNull();
  });
});

describe('StatsScreen notification settings', () => {
  beforeEach(() => mockPush.mockClear());

  it('routes to the per-category notification toggles (§3.21.2)', async () => {
    renderStats(new InMemoryRepository());

    fireEvent.press(await screen.findByText('Notification settings'));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});

describe('StatsScreen account section', () => {
  beforeEach(() => mockPush.mockClear());

  it('offers an account to an anonymous user, describing the real difference', async () => {
    renderStats(new InMemoryRepository());

    expect(await screen.findByText(/saved on this phone/i)).toBeTruthy();
    expect(screen.getByText('Create account')).toBeTruthy();
  });

  it('routes an anonymous user to sign-in when they ask for an account', async () => {
    renderStats(new InMemoryRepository());

    fireEvent.press(await screen.findByText('Create account'));

    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('confirms the backup and offers sign-out to a signed-in user', async () => {
    const client = new FakeAuthClient(['apple'], { id: 'user-1', provider: 'apple' });
    renderStats(new InMemoryRepository(), client);

    expect(await screen.findByText(/Signed in with Apple/)).toBeTruthy();
    fireEvent.press(screen.getByText('Sign out'));

    await waitFor(async () => expect(await client.getCurrentUser()).toBeNull());
  });
});
