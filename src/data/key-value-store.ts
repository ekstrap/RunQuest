/**
 * KeyValueStore — the device-storage boundary (PRD §"mock only at system
 * boundaries"). A three-method, SDK-style interface over a string→string store,
 * deliberately narrower than AsyncStorage's full surface so tests can fake it
 * without simulating a device.
 *
 * `LocalRepository` is written against this, not against AsyncStorage directly,
 * which is what lets the repository's behaviour be tested in plain Jest.
 */
export interface KeyValueStore {
  /** Read a raw string value, or null when the key has never been written. */
  getItem(key: string): Promise<string | null>;

  /** Write a raw string value, overwriting any previous one. */
  setItem(key: string, value: string): Promise<void>;

  /** Remove a key. A no-op when the key is absent. */
  removeItem(key: string): Promise<void>;
}

/**
 * In-process KeyValueStore for tests. Behaves like device storage (values
 * survive across repository instances built on the same store) without one.
 */
export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly entries = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
