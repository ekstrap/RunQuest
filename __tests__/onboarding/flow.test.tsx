import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// Best-effort end-to-end proof of AC1: the four onboarding screens are navigable
// in order, one tap per choice, ending in the notification pre-prompt and the
// deferred account prompt. Drives the *real* route files through Expo
// Router (the root _layout supplies the repository), rather than mocking the
// router as the per-screen tests do. If this wiring ever proves flaky under
// jest-expo, the per-screen router.push assertions already establish the order.
describe('onboarding flow', () => {
  it('walks welcome → bracket → schedule → first-session → home in one tap each', async () => {
    renderRouter(
      {
        _layout: require('@/app/_layout').default,
        index: require('@/app/index').default,
        '(onboarding)/_layout': require('@/app/(onboarding)/_layout').default,
        '(onboarding)/welcome': require('@/app/(onboarding)/welcome').default,
        '(onboarding)/bracket': require('@/app/(onboarding)/bracket').default,
        '(onboarding)/schedule': require('@/app/(onboarding)/schedule').default,
        '(onboarding)/first-session': require('@/app/(onboarding)/first-session').default,
        home: require('@/app/home').default,
        // Registered so the real root _layout's <Stack.Screen name="run" /> has a
        // matching route here; the onboarding flow itself never navigates into it.
        'run/_layout': require('@/app/run/_layout').default,
        'run/setup': require('@/app/run/setup').default,
        'run/active': require('@/app/run/active').default,
        // Likewise for the sign-in route the deferred account prompt can reach.
        'sign-in': require('@/app/sign-in').default,
      },
      { initialUrl: '/welcome' },
    );

    fireEvent.press(await screen.findByText('Get started'));
    fireEvent.press(await screen.findByText('Never run before'));
    fireEvent.press(await screen.findByText('2 sessions'));

    expect(await screen.findByText('Walk/run for 10 minutes')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Start'));
    });

    // Start raises the notification pre-prompt first (§3.21.2) — our own,
    // re-askable ask, which must come before the irreversible OS prompt and
    // before the account offer.
    await act(async () => {
      fireEvent.press(screen.getByText('Not now'));
    });

    // Then the deferred account prompt (DESIGN.md §3.12). "Just run" is the
    // no-account path — it must reach home like any other.
    await act(async () => {
      fireEvent.press(screen.getByText('Just run'));
    });

    expect(await screen.findByText('RunQuest')).toBeTruthy();
  });
});
