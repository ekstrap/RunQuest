import { render, screen, fireEvent } from '@testing-library/react-native';

import RunSummaryScreen from '@/app/run/summary';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

describe('RunSummaryScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockParams = {
      durationSeconds: '600',
      distanceMeters: '1600',
      xpAwarded: '100',
      leveledUp: '0',
      level: '2',
    };
  });

  it('shows distance, time, and XP from the params', () => {
    render(<RunSummaryScreen />);

    expect(screen.getByText(/1\.6 km/)).toBeTruthy();
    expect(screen.getByTestId('summary-time')).toHaveTextContent('10:00');
    expect(screen.getByTestId('summary-xp')).toHaveTextContent('+100 XP');
  });

  it('omits the distance line when no distance param is present', () => {
    delete mockParams.distanceMeters;
    render(<RunSummaryScreen />);

    expect(screen.queryByText(/km/)).toBeNull();
    // Time + XP still carry the summary.
    expect(screen.getByTestId('summary-time')).toHaveTextContent('10:00');
    expect(screen.getByTestId('summary-xp')).toHaveTextContent('+100 XP');
  });

  it('shows the level-up only when a level was crossed', () => {
    mockParams.leveledUp = '1';
    render(<RunSummaryScreen />);

    expect(screen.getByTestId('level-up')).toHaveTextContent(/Level up!.*Level 2/);
  });

  it('hides the level-up when no level was crossed', () => {
    mockParams.leveledUp = '0';
    render(<RunSummaryScreen />);

    expect(screen.queryByTestId('level-up')).toBeNull();
  });

  it('celebrates the week-completion bonus when one was awarded', () => {
    mockParams.weekBonusAwarded = '200';
    render(<RunSummaryScreen />);

    expect(screen.getByTestId('week-bonus')).toHaveTextContent('Week complete! +200 bonus XP');
  });

  it('shows no week-bonus line when no bonus was awarded', () => {
    render(<RunSummaryScreen />);

    expect(screen.queryByTestId('week-bonus')).toBeNull();
  });

  it('announces a gentle calibration step-up when one happened this week', () => {
    mockParams.calibrationSteppedToMinutes = '15';
    render(<RunSummaryScreen />);

    const line = screen.getByTestId('calibration-step-up');
    expect(line).toHaveTextContent(/15 minutes/);
    // Encouraging, never a fitness score or step number (§3.20.4).
    expect(line).not.toHaveTextContent(/step|level|fitness/i);
  });

  it('shows no step-up line when calibration held steady', () => {
    render(<RunSummaryScreen />);

    expect(screen.queryByTestId('calibration-step-up')).toBeNull();
  });

  it('shows no week, streak, or lifetime text', () => {
    render(<RunSummaryScreen />);

    expect(screen.queryByText(/week|streak|lifetime/i)).toBeNull();
  });

  it('returns home when Done is pressed', () => {
    render(<RunSummaryScreen />);

    fireEvent.press(screen.getByText('Done'));

    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});
