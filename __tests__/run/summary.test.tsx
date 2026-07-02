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
