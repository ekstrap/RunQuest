/**
 * The failure this file exists to prevent: `expo-notifications` registers a
 * device *push* token listener as an import side effect, which throws in any
 * binary built without the native module. Imported at module scope that throw
 * escapes into whatever imported it — and the root layout does, so the whole app
 * dies rather than merely losing notifications.
 */

const MISSING_MODULE = "Cannot find native module 'ExpoPushTokenManager'";

describe('the expo notification adapters when the native module is missing', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('expo-notifications', () => {
      throw new Error(MISSING_MODULE);
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('can be imported at all — the import must not throw', () => {
    expect(() => {
      require('./expo-notification-permissions');
      require('./expo-notification-scheduler');
    }).not.toThrow();
  });

  it('claims no permission, so the policy engine yields nothing', async () => {
    const { expoNotificationPermissions } = require('./expo-notification-permissions');

    expect(await expoNotificationPermissions.getStatus()).toBe('undetermined');
    expect(await expoNotificationPermissions.request()).toBe('undetermined');
  });

  it('accepts a plan and quietly schedules nothing', async () => {
    const { expoNotificationScheduler } = require('./expo-notification-scheduler');

    await expect(
      expoNotificationScheduler.replaceAll([
        {
          id: 'session-invitation:1',
          kind: 'session-invitation',
          category: 'reminder',
          framing: 'invitation',
          fireAt: Date.now() + 60_000,
          title: 'Ready when you are',
          body: "Today's session is 10 minutes.",
        },
      ]),
    ).resolves.toBeUndefined();
  });

  it('suppressing in-app presentation is a no-op rather than a crash', () => {
    const { configureNotificationPresentation } = require('./expo-notification-scheduler');

    expect(() => configureNotificationPresentation()).not.toThrow();
  });
});

describe('the expo notification adapters when the native module is present', () => {
  it('maps the OS answer onto the three states the domain knows', async () => {
    const getPermissionsAsync = jest.fn();
    jest.resetModules();
    // Mocked locally rather than leaning on jest.setup.js, so this test owns the
    // answers it is asserting against.
    jest.doMock('expo-notifications', () => ({ getPermissionsAsync }));
    const { expoNotificationPermissions } = require('./expo-notification-permissions');

    getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: false });
    expect(await expoNotificationPermissions.getStatus()).toBe('granted');

    // Not granted but still askable = never asked yet.
    getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    expect(await expoNotificationPermissions.getStatus()).toBe('undetermined');

    // Not granted and not askable = the OS itself is holding the "no".
    getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false });
    expect(await expoNotificationPermissions.getStatus()).toBe('denied');
  });
});
