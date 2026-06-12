# to-do.md — Human runbooks (HITL steps)

This file holds the **human-in-the-loop (HITL)** steps for RunQuest. An AFK
("away from keyboard") agent can write all the code for these issues, but each
one has a *gate*: one or more actions only a human can take — creating an
account on an external service, generating a secret key, making a product
decision, or holding a real phone to confirm something works.

For each issue below, the agent does everything up to the gate and leaves
labelled placeholders. **Your job is the numbered steps here.** When you finish
a step that produces an artifact (a key, a decision, a test result), you hand it
back — paste a secret into the secret store, write a decision into
`docs/DESIGN.md`, or report the test result — and the agent closes the issue.

**Tip: do these *before* you start the AFK loop.** Clearing every gate up front
means the loop never stalls waiting on you.

A few terms used below, explained once:
- **EAS** = Expo Application Services — Expo's cloud service that builds the app
  and stores secret keys so they're injected at build time and never saved into
  the code/git.
- **Dev build** = a custom build of the app that includes native features (GPS,
  audio, notifications). The generic "Expo Go" sandbox app can't test these
  reliably — you need a dev build on a real phone.
- **OAuth** = the standard "Sign in with Apple / Google" mechanism. It needs
  credentials (an ID + secret) generated in each provider's console.

---

## Issue #4 — Run a plain session (map + timer + completion)

**Gate type:** ① external credential (Google Maps key) + ③ physical-device test (GPS).

The agent writes the map screen, timer, and session record. You need to (a)
give it a Google Maps key so the map can render, and (b) confirm on a real phone
that live location and distance actually work — GPS does not work in a simulator.

### Part A — Get a Google Maps API key
1. Go to **https://console.cloud.google.com** and sign in with your Google
   account.
2. At the top, click the project dropdown → **New Project**. Name it
   `RunQuest` and click **Create**. Wait a few seconds, then make sure the new
   project is selected in the dropdown.
3. In the search bar at the top, type **"Maps SDK for Android"**, open it, and
   click **Enable**.
4. Search **"Maps SDK for iOS"**, open it, and click **Enable** too.
5. In the left menu go to **APIs & Services → Credentials**.
6. Click **+ Create Credentials → API key**. A key string appears (looks like
   `AIza...`). Copy it.
7. *(Recommended)* Click the new key to edit it, and under **API restrictions**
   limit it to the two Maps SDKs you enabled. Save. This stops the key being
   abused if it leaks.

### Part B — Hand the key back
8. Store the key as an EAS secret rather than pasting it into code. From the
   project folder, the command is:
   ```
   npx eas secret:create --name GOOGLE_MAPS_API_KEY --value "AIza...your-key..."
   ```
   If you'd rather not run this yourself, paste the key into the chat and the
   agent will wire it in.

### Part C — Test on a real phone
9. Install the dev build on your phone (the agent will give you a link or QR
   code once it's built).
10. Walk outside, start a **"just run"** session, and confirm:
    - the map shows your location (a blue dot),
    - the elapsed timer counts up,
    - after walking ~100m and ending the run, a **distance** shows on the
      summary.
11. Also confirm completion still works with **location off** (turn off location
    permission): the run should still end, just with no distance. This is a hard
    requirement — GPS must never block finishing a run.
12. Report back: "map + GPS + distance OK on [your phone model]", plus anything
    that looked wrong.

---

## Issue #5 — Walk/run interval audio cues

**Gate type:** ③ physical-device test (audio behaviour). No credentials needed.

The agent writes the interval state machine and the audio cues, and tests the
*timing* automatically with a fake clock (no real waiting). What a machine can't
confirm is how the **audio actually behaves on a phone** — especially that cues
play *over* music and through the lock screen.

### Test on a real phone
1. Install the dev build on your phone.
2. Start playing music (Spotify, Apple Music, anything).
3. Start a **walk/run interval** session.
4. Confirm each of these:
   - At each walk↔run switch you hear a short cue ("start running…" / "start
     walking…").
   - The cue **ducks or plays over your music** — your music does *not* stop
     permanently.
   - Only transition cues play — **no** encouragement, no chatter, no coach
     voice.
   - Lock the phone mid-session: cues still fire with the screen off.
5. Test on **both** an iPhone and an Android phone if you have access — audio
   "play over other apps" behaviour differs between the two operating systems
   and is the most common place this breaks.
6. Report back: "interval cues fire correctly over music, screen-locked, on
   iOS and Android" — or list what misbehaved.

---

## Issue #11 — Accounts + cloud sync (Apple/Google sign-in, Supabase)

**Gate type:** ① external credentials — the biggest gate. Budget an afternoon.

The agent writes all the sign-in and sync code against placeholder secrets. You
create three things — a Supabase project, Apple sign-in credentials, Google
sign-in credentials — and hand back the keys. Anonymous "Just run" users need
none of this; it only powers signed-in cloud sync.

> **Heads-up on cost:** Apple Sign-In requires a paid **Apple Developer
> account (~US$99/year)**. Supabase and Google sign-in have free tiers that are
> plenty for development. If you don't have the Apple account yet, you can do
> the Supabase + Google parts now and come back to Apple later.

### Part A — Supabase project (the backend database)
1. Go to **https://supabase.com**, sign in, click **New project**.
2. Name it `RunQuest`, set a strong database password (save it in your password
   manager), pick the region closest to you, click **Create new project**. Wait
   ~2 minutes for it to provision.
3. In the project, go to **Project Settings → API**. Copy these two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public key** (a long string — this is the *public* key, safe to ship
     in the app; do **not** copy the `service_role` key, that one is secret).

### Part B — Google Sign-In credentials
4. Back in **https://console.cloud.google.com**, select your `RunQuest` project
   (the same one from Issue #4, if you did it).
5. Left menu → **APIs & Services → OAuth consent screen**. Choose **External**,
   fill in the app name `RunQuest` and your email where required, and save
   through the steps. (You can leave it in "Testing" mode for now.)
6. Left menu → **Credentials → + Create Credentials → OAuth client ID**.
7. Create the client IDs the agent asks for — typically one **iOS**, one
   **Android**, and one **Web**. The agent will tell you the exact "bundle ID"
   / "package name" values to paste in (these identify your app); ask it for
   them before this step.
8. Copy each generated **client ID** (and the **client secret** for the Web
   one). Keep them labelled (iOS / Android / Web).

### Part C — Apple Sign-In credentials *(needs the paid Apple Developer account)*
9. Go to **https://developer.apple.com/account**, then **Certificates,
   Identifiers & Profiles**.
10. Under **Identifiers**, find or create your app's identifier (the agent will
    give you the bundle ID, e.g. `com.yourname.runquest`) and **enable the
    "Sign In with Apple" capability** on it. Save.
11. This is the fiddliest one. Rather than guess, paste back to the agent: your
    **Team ID** (top-right of the developer portal), your **bundle ID**, and
    confirm "Sign In with Apple is enabled." The agent will tell you if it needs
    a **Services ID** or a **key** in addition, with exact steps — Apple's flow
    changes often, so do this one interactively.

### Part D — Hand everything back
12. Store the secrets as EAS secrets (or paste them to the agent to do it). The
    set is roughly:
    ```
    npx eas secret:create --name SUPABASE_URL          --value "https://abcd1234.supabase.co"
    npx eas secret:create --name SUPABASE_ANON_KEY      --value "your-anon-public-key"
    npx eas secret:create --name GOOGLE_IOS_CLIENT_ID   --value "...."
    npx eas secret:create --name GOOGLE_ANDROID_CLIENT_ID --value "...."
    npx eas secret:create --name GOOGLE_WEB_CLIENT_ID   --value "...."
    ```
    (Apple values get added once Part C is finalised with the agent.)

### Part E — Test on a real phone
13. On a dev build, press **Start** for the first time and confirm the honest
    **"Create account / Just run"** prompt appears.
14. Test **"Just run"**: the app works fully, all local, no sign-in.
15. Test **Sign in with Google** and **Sign in with Apple**: each creates an
    account in one tap.
16. Do a session while signed in, then **delete and reinstall the app**, sign in
    again, and confirm your progression / lifetime weeks **came back** (that's
    the cloud sync working).
17. Report back which sign-ins worked and whether data restored on reinstall.

---

## Issue #13 — Notification delivery + scheduling

**Gate type:** ② product decision (still open) + ③ physical-device test.

Two gates here. First, the *content and timing rules aren't decided yet* — no
agent should invent them. Second, push notifications barely work in a simulator,
so the final check is on a real phone.

### Part A — Resolve the open decisions (do this with the agent, in a grilling session)
These are tracked as **Open Q#2** in `docs/DESIGN.md`. Decide and write each
into DESIGN.md:
1. **Reminder timing** — the current lean is: a single **time-of-day** default
   set in settings, the app picks *which days* from your week progress, and
   there's **no manual day-picker**. Confirm or change this.
2. **Frequency caps** — the maximum number per week for each category
   (*reminders*, *celebrations*, *re-engagement*). Re-engagement ("we miss
   you") should be the most tightly capped.
3. **Final wording** — the exact copy for each notification. Re-read the
   **HARD RULE: no predatory notifications** — nothing that uses loss/threat
   ("your streak ends in 4 hours"). Encouragement and invitation only.
   Hand back: the agreed copy strings, written into DESIGN.md.

### Part B — Test on a real phone (both platforms ideally)
4. Install the dev build and, when the app asks, **allow notifications** (note:
   the in-app pre-prompt should appear *before* the OS permission dialog —
   confirm that order).
5. Verify a **reminder** actually fires at the configured time of day. (The
   agent can give you a debug toggle to fire one in 1 minute so you don't wait
   all day.)
6. Verify a **celebration** fires after completing a session.
7. Lock the phone / close the app and confirm notifications still arrive
   (they're delivered by the OS, not the running app).
8. **Sanity-check against the HARD RULE:** read every notification that fired.
   If any feels like pressure, shame, or a threat, that's a bug — report it.
9. Confirm the **frequency caps** hold — e.g. force the conditions for several
   reminders in a week and check you don't get spammed past the cap.
10. Test on **iOS and Android** if possible — notification permission and
    delivery differ between them.
11. Report back: which notification types delivered, on which OS, and that none
    violated the no-predatory rule.
