import { fireEvent, render, screen } from '@testing-library/react-native';

import ScheduleScreen from '@/app/(onboarding)/schedule';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ bracket: 'never-run' }),
}));

describe('ScheduleScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('offers a 2- or 3-session weekly commitment', () => {
    render(<ScheduleScreen />);

    expect(screen.getByText('2 sessions')).toBeTruthy();
    expect(screen.getByText('3 sessions')).toBeTruthy();
  });

  it('carries bracket + chosen commitment to the first-session card', () => {
    render(<ScheduleScreen />);

    fireEvent.press(screen.getByText('2 sessions'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/first-session',
      params: { bracket: 'never-run', weeklyCommitment: '2' },
    });
  });
});
