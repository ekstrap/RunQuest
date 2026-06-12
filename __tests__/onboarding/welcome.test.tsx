import { fireEvent, render, screen } from '@testing-library/react-native';

import WelcomeScreen from '@/app/(onboarding)/welcome';

// Route-component tests live under __tests__/ (not in app/) so expo-router's
// file-based route scanner never treats them as screens during `expo export`.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('WelcomeScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the anti-elitist positioning line', () => {
    render(<WelcomeScreen />);

    expect(
      screen.getByText('Start running, one friendly session at a time.'),
    ).toBeTruthy();
  });

  it('advances to the bracket picker when "Get started" is tapped', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Get started'));

    expect(mockPush).toHaveBeenCalledWith('/bracket');
  });
});
