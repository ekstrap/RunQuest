import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/home';
import { InMemoryRepository } from '@/src/data/in-memory-repository';
import { RepositoryProvider } from '@/src/providers/repository-provider';

// Route-component tests live under __tests__/ (not in app/) so expo-router's
// file-based route scanner never treats them as screens during `expo export`.

function renderHome(repository: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repository}>
      <HomeScreen />
    </RepositoryProvider>,
  );
}

/** A repository with onboarding done: never-run bracket, 2 sessions/week. */
async function onboardedRepository() {
  const repository = new InMemoryRepository();
  await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });
  return repository;
}

describe('HomeScreen', () => {
  it('displays the level read through the repository interface', async () => {
    const repository = new InMemoryRepository({ xpTotal: 0, level: 1 });

    renderHome(repository);

    expect(await screen.findByText('Level 1')).toBeTruthy();
  });

  it('renders an XP bar reflecting progress within the level', async () => {
    // 175 XP → level 2, halfway to level 3 (150-wide band from 100 to 250).
    const repository = new InMemoryRepository({ xpTotal: 175, level: 2 });

    renderHome(repository);

    expect(await screen.findByText('Level 2')).toBeTruthy();
    const fill = screen.getByTestId('xp-bar-fill');
    expect(fill.props.style).toEqual(expect.arrayContaining([{ width: '50%' }]));
  });

  it('shows the next session from the prescription with a Start button', async () => {
    renderHome(await onboardedRepository());

    // never-run bracket → 10-minute walk/run prescription.
    expect(await screen.findByText('Walk/run for 10 minutes')).toBeTruthy();
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('shows week progress against the weekly commitment', async () => {
    renderHome(await onboardedRepository());

    expect(await screen.findByText('0 of 2 sessions this week')).toBeTruthy();
  });

  it('counts this week’s completed sessions in the progress line', async () => {
    const repository = await onboardedRepository();
    await repository.saveSession({
      mode: 'interval',
      startedAt: Date.now(),
      durationSeconds: 600,
      distanceMeters: null,
    });

    renderHome(repository);

    expect(await screen.findByText('1 of 2 sessions this week')).toBeTruthy();
  });
});

describe('HomeScreen calibration adjust control', () => {
  it('derives the displayed session from persisted calibration, not just the bracket', async () => {
    const repository = await onboardedRepository();
    await repository.saveCalibration({ step: 2 }); // advanced → 20-minute session

    renderHome(repository);

    expect(await screen.findByText('Walk/run for 20 minutes')).toBeTruthy();
  });

  it('raises the prescription immediately and persists it when "Too easy" is pressed', async () => {
    const repository = await onboardedRepository();

    renderHome(repository);
    // never-run starts at the 10-minute rung.
    expect(await screen.findByText('Walk/run for 10 minutes')).toBeTruthy();

    fireEvent.press(screen.getByTestId('calibration-too-easy'));

    expect(await screen.findByText('Walk/run for 15 minutes')).toBeTruthy();
    expect(await repository.getCalibrationState()).toEqual({ step: 1 });
  });

  it('lowers the prescription immediately and persists it when "Too hard" is pressed', async () => {
    const repository = await onboardedRepository();
    await repository.saveCalibration({ step: 2 }); // 20-minute session

    renderHome(repository);
    expect(await screen.findByText('Walk/run for 20 minutes')).toBeTruthy();

    fireEvent.press(screen.getByTestId('calibration-too-hard'));

    expect(await screen.findByText('Walk/run for 15 minutes')).toBeTruthy();
    expect(await repository.getCalibrationState()).toEqual({ step: 1 });
  });

  it('never shows a numeric ability or step score', async () => {
    const repository = await onboardedRepository();
    await repository.saveCalibration({ step: 3 });

    renderHome(repository);
    await screen.findByText(/Walk\/run for/);

    expect(screen.queryByText(/step 3|step: 3|ability|fitness/i)).toBeNull();
  });
});

describe('HomeScreen commitment control', () => {
  it('changes the weekly commitment when the week has not started', async () => {
    const repository = await onboardedRepository();

    renderHome(repository);
    fireEvent.press(await screen.findByTestId('commitment-3'));

    expect(await repository.getOnboardingState()).toEqual({
      bracket: 'never-run',
      weeklyCommitment: 3,
    });
    expect(await screen.findByText('0 of 3 sessions this week')).toBeTruthy();
  });

  it('locks the commitment mid-week with an explanatory note', async () => {
    const repository = await onboardedRepository();
    await repository.saveSession({
      mode: 'interval',
      startedAt: Date.now(),
      durationSeconds: 600,
      distanceMeters: null,
    });

    renderHome(repository);
    fireEvent.press(await screen.findByTestId('commitment-3'));

    // The press is ignored and the between-weeks note explains why.
    expect(await repository.getOnboardingState()).toEqual({
      bracket: 'never-run',
      weeklyCommitment: 2,
    });
    expect(screen.getByText('You can change this between weeks')).toBeTruthy();
  });
});
