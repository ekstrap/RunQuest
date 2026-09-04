import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './key-value-store';

/**
 * The production KeyValueStore: React Native's AsyncStorage (unencrypted,
 * device-local, survives app restarts and updates but not uninstall). A thin
 * pass-through adapter — all repository behaviour lives in LocalRepository,
 * tested against InMemoryKeyValueStore, so this file stays trivial by design
 * (PRD §"thin shells get thin coverage").
 *
 * Nothing secret goes through here: auth tokens are held by the Supabase
 * client's own session storage, never by the repository.
 */
export const asyncStorageStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
