import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SignInScreen from '@/app/sign-in';
import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { AuthProvider } from '@/src/providers/auth-provider';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

function renderScreen(client: FakeAuthClient) {
  render(
    <AuthProvider client={client}>
      <SignInScreen />
    </AuthProvider>,
  );
}

describe('SignInScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockBack.mockClear();
  });

  it('offers Apple and Google, and a way out that costs nothing', async () => {
    renderScreen(new FakeAuthClient());

    expect(await screen.findByText('Continue with Apple')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();
  });

  it('signs in and goes home when a provider is picked', async () => {
    const client = new FakeAuthClient();
    renderScreen(client);

    fireEvent.press(await screen.findByText('Continue with Apple'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
    expect(await client.getCurrentUser()).toMatchObject({ provider: 'apple' });
  });

  it('lets the user leave without an account', async () => {
    renderScreen(new FakeAuthClient());

    fireEvent.press(await screen.findByText('Not now'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('says so plainly when a provider is not available in this build', async () => {
    // No configured providers — today's shipped state.
    renderScreen(new FakeAuthClient([]));

    fireEvent.press(await screen.findByText('Continue with Apple'));

    expect(await screen.findByText(/available yet/i)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    // The way forward is still open — never a dead end.
    expect(screen.getByText('Not now')).toBeTruthy();
  });

  it('shows a calm message when sign-in fails, without blaming the user', async () => {
    const client = new FakeAuthClient();
    jest.spyOn(client, 'signIn').mockRejectedValue(new Error('network down'));
    renderScreen(client);

    fireEvent.press(await screen.findByText('Continue with Google'));

    expect(await screen.findByText(/couldn’t sign you in/i)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
