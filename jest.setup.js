// AsyncStorage is a native module with no implementation under Jest; the
// library ships an in-memory mock for exactly this. Repository behaviour is
// tested against InMemoryKeyValueStore, so this only has to keep imports of the
// real store from throwing in screen tests that mount the root layout.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-notifications is a native module with no implementation under Jest, and
// importing the real one in Expo Go even warns about removed push support. The
// app's own notification logic is tested against the injected
// NotificationPermissions / NotificationScheduler fakes, so this mock only has
// to keep the root layout's imports of the expo-backed adapters from throwing.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
