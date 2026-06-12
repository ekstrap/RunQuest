import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// Best-effort end-to-end proof of AC1: the four onboarding screens are navigable
// in order, one tap per choice. Drives the *real* route files through Expo
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

    expect(await screen.findByText('RunQuest')).toBeTruthy();
  });
});
