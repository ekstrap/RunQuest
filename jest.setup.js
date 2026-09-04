// AsyncStorage is a native module with no implementation under Jest; the
// library ships an in-memory mock for exactly this. Repository behaviour is
// tested against InMemoryKeyValueStore, so this only has to keep imports of the
// real store from throwing in screen tests that mount the root layout.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
