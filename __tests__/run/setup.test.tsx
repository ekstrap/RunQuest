import { fireEvent, render, screen } from '@testing-library/react-native';

import RunSetupScreen from '@/app/run/setup';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('RunSetupScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('offers all three run types', () => {
    render(<RunSetupScreen />);

    expect(screen.getByText('Walk/run intervals')).toBeTruthy();
    expect(screen.getByText('Just run')).toBeTruthy();
    expect(screen.getByText('Just walk')).toBeTruthy();
  });

  it('selects walk/run intervals by default', () => {
    render(<RunSetupScreen />);

    const interval = screen.getByRole('radio', { name: /Walk\/run intervals/i });
    expect(interval.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('starts the chosen run type, carrying the mode to the in-run screen', () => {
    render(<RunSetupScreen />);

    fireEvent.press(screen.getByText('Just run'));
    fireEvent.press(screen.getByText('Start'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/run/active',
      params: { mode: 'just-run' },
    });
  });

  it('starts with the interval default when nothing is changed', () => {
    render(<RunSetupScreen />);

    fireEvent.press(screen.getByText('Start'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/run/active',
      params: { mode: 'interval' },
    });
  });
});
