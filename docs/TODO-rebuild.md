# TODO — rebuild the dev client (stale native binary)

**Status:** open
**Raised:** 2026-08-18, on branch `feat/accounts-cloud-sync`

## The problem

Launching the app produces three errors:

```
WARN  Route "./_layout.tsx" is missing the required default export.
ERROR [Error: [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
ERROR [Error: useRepository must be used within a RepositoryProvider]
```

All three are **one root cause**, and none of them is a code bug.

| | |
|---|---|
| `android/` last prebuilt | 2026-06-24 22:01 |
| `@react-native-async-storage/async-storage` added | 2026-08-18 (commit `f400790`) |

Native modules are linked in at **native build time**, not bundle time. The dev client
installed on the device was built two months before async-storage entered `package.json`,
so that binary has no AsyncStorage native module. Metro ships the new JS happily; the
native side isn't there to receive it.

The cascade, in order:

1. `src/data/async-storage-store.ts:1` imports AsyncStorage. In 2.x the null-check is a
   **top-level `throw`** (`AsyncStorage.native.js:17`), so it fires during module
   evaluation, not on first method call.
2. `app/_layout.tsx:5` imports that module at the top of the file. The throw aborts
   evaluation before `export default RootLayout` is assigned — hence "missing the
   required default export".
3. With no layout, expo-router still renders `app/index.tsx`, but now with no
   `AppRepositoryProvider` above it — hence the `useRepository` throw.

Fix the first and all three go away.

## Steps

- [ ] **1. Connect an Android device or start an emulator.** The build needs a target to
      install onto.

- [ ] **2. (Optional, saves a second build later) Align the drifted Expo packages.**

      npx expo install --fix

      Brings `expo` -> `~54.0.37`, `expo-constants` -> `~18.0.14`, `jest-expo` -> `~54.0.18`.
      Unrelated to the bug, but free if folded into the same rebuild.

- [ ] **3. Rebuild and reinstall the dev client.** This is the actual fix.

      npx expo run:android

      Autolinking re-runs at gradle configure time and picks up async-storage from
      `node_modules`. Expect a slow first build (several minutes, full gradle configure).

- [ ] **4. Verify.** Launch and confirm all three errors are gone:
      - no `NativeModule: AsyncStorage is null`
      - no `Route "./_layout.tsx" is missing the required default export`
      - no `useRepository must be used within a RepositoryProvider`

      You should land on either the welcome flow or home, depending on stored onboarding
      state. Getting that far means the whole cascade is resolved.

- [ ] **5. Only if step 3 didn't take** — force a full native regen:

      npx expo prebuild --clean && npx expo run:android

      Verified safe: `android/` is gitignored and has no hand-edits (every file still
      carries its original prebuild mtime). The Google Maps key in `AndroidManifest.xml`
      is injected by `app.config.js` from `GOOGLE_MAPS_API_KEY`, which the Expo CLI loads
      from `.env.local` — so it is regenerated, not lost. Confirm `.env.local` is present
      before running this.

## Don't bother with

`--reset-cache`, `npm install`, or deleting `node_modules`. The AsyncStorage error message
suggests these, but they all target the JS side. The missing piece is native.

## Separate, not blocking

- [ ] Restrict the Google Maps key `AIzaSyAZ4...` to the Android package + SHA-1 in the
      Google Cloud console. It ships inside the APK.
- [ ] If iOS is ever run: there is no `ios/` directory yet, so `npx expo prebuild -p ios`
      is needed first. The same root cause will apply there on first run.
