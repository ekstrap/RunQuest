import { fireEvent, render, screen } from '@testing-library/react-native';

import BracketScreen from '@/app/(onboarding)/bracket';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('BracketScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('offers all three activity brackets as one-tap choices', () => {
    render(<BracketScreen />);

    expect(screen.getByText('Never run before')).toBeTruthy();
    expect(screen.getByText('Run occasionally')).toBeTruthy();
    expect(screen.getByText('Getting back into it')).toBeTruthy();
  });

  it('carries the chosen bracket forward to the schedule picker in one tap', () => {
    render(<BracketScreen />);

    fireEvent.press(screen.getByText('Never run before'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/schedule',
      params: { bracket: 'never-run' },
    });
  });
});
