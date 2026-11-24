# Fast AI — Web Admin Panel

A static single-page admin panel for the Fast AI Android app. It uses the
**same Firebase project** as the app (`fast-ai-43cdf`) — Auth + Firestore —
straight from the browser. No build step, no server: just three files
(`index.html`, `app.js`, `style.css`), ready for GitHub Pages (or Netlify,
or any static host).

## What it can do

- **Admin-only login** — email/password via Firebase Auth; after login the
  panel checks the signed-in email against `ADMIN_EMAIL` in `app.js` and
  signs out anyone else. Firestore rules enforce the same check server-side.
- **Users** — lists the `users` collection; **Ban / Unban** toggle writes the
  `banned` field on the user document.
- **Announcement** — edits `config/announcement` (`active`, `title`,
  `message`). The app shows it as a banner on Home and Chat when active.
- **Feature Flags** — edits `config/features` (`websiteBuilder`,
  `floatingAvatar`). The app reads these live and shows/hides the Website
  Builder and the floating-avatar voice chat accordingly. Defaults (no doc /
  offline): announcement off, all features on.
- **API Key Status** — reads `users/{uid}/keyStatus/*` metadata the app
  syncs: provider name, whether a key is configured, a masked suffix
  (•••• + last 4 chars at most), and timestamps. **Full API keys never leave
  the user's phone** — they exist only in the app's encrypted on-device
  storage. This panel never requests, receives, or displays a full key, and
  the Firestore rules reject any keyStatus document that tries to carry one.

## Setup (owner — do these once)

1. **Set your admin email in `app.js`**
   Open `app.js` and change the constant at the top:
   `const ADMIN_EMAIL = "OWNER_EMAIL_HERE";` → your own email.
   Use the same email as your Firebase Auth admin account.

2. **Set the same email in the Firestore rules**
   Open `firestore-rules-additions.txt`, replace `OWNER_EMAIL_HERE` with
   the same email, and merge the blocks into the project's existing
   `firestore.rules` (Firebase Console → Firestore Database → Rules →
   Publish). The additions grant: admin read of users, admin ban-only
   updates, the keyStatus field whitelist, and `config/*` read for signed-in
   users / write for admin only.

3. **Make sure Email/Password sign-in is enabled**
   Firebase Console → Authentication → Sign-in method → Email/Password →
   Enable. (The app needs this too — it was a Phase 1 prerequisite.)

4. **(Optional) Register a Web app**
   Firebase Console → Project settings → Your apps → Web (`</>`) → register
   "Fast AI Admin". Copy the `appId` (and any differing values) into
   `firebaseConfig` in `app.js`. Auth + Firestore already work with the
   config shipped here; this is only for completeness/Analytics.

5. **Publish the panel (GitHub Pages)**
   - Create a GitHub repo (e.g. `fast-ai-admin`), push `index.html`,
     `app.js`, `style.css` (this README and the rules file can go too —
     they're harmless).
   - Repo → Settings → Pages → Source: `main` branch, root folder → Save.
   - Your panel is live at `https://<username>.github.io/fast-ai-admin/`.
   - ⚠️ The panel is protected by Firebase Auth + the admin-email check +
     Firestore rules — **not** by hiding the URL. Anyone can open the page,
     but nobody can log in or read data without the admin account.

6. **Add the GitHub Pages domain to Firebase Auth (if login complains)**
   Firebase Console → Authentication → Settings → Authorized domains →
   add `<username>.github.io`.

## How the app side connects

- Announcement + flags: `AdminConfigRepository` in the Android app listens
  to `config/announcement` and `config/features` and applies changes live,
  with safe offline defaults.
- Key status: the app writes metadata only (`KeyStatusSync`) whenever a
  user saves or deletes a key in the API Hub — provider, hasKey, masked
  suffix, timestamps. Guests and offline use simply skip the sync.
- Ban: the `banned` field is written by this panel. Enforcing it inside the
  app (sign-out / block screen for banned users) is a small follow-up in the
  app code — the data path is ready.
