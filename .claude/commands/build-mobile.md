---
description: Build the mobile app via EAS with the right profile and pre-build checks
---

You will build the mobile app with EAS. Pick the right path: a full build, or an OTA update.

The user's request: $ARGUMENTS

## First: decide build vs update

Ask yourself (and the user if unclear):
- Did this change touch native code, `app.json` native fields, plugins, permissions, or Expo SDK?
- **Yes** → full `eas build`.
- **No** (JS/TS only) → `eas update` is faster (~30s vs ~15min).

If it's an `eas update`:
```bash
cd mobile
eas update --branch <preview|production> --message "<short description>"
```
Done. Skip the rest.

## Full build path

### Pre-build checks

1. **`.easignore` exists at repo root** and excludes `backend/`. If missing, the build will fail on Windows due to backend symlinks.

2. **Version bumped** — open `mobile/app.json` and confirm `expo.version`, `expo.android.versionCode`, `expo.ios.buildNumber` are all higher than the last build. If not, run `/bump-version` first.

3. **Right profile** — confirm with the user:
   - `development` — dev client for testing native features (notifications, etc.)
   - `preview` — APK for internal sharing, no store
   - `production` — APK for Play Store release

4. **API URL** — check the chosen profile in `mobile/eas.json` — `EXPO_PUBLIC_API_URL` should point at the production Vercel URL for `preview`/`production`.

5. **Git is clean** (recommended). EAS uses git to determine what to upload.

### Build

```bash
cd mobile
eas build --platform android --profile <profile>
```

The build runs on EAS servers. URL is printed; user can monitor progress at expo.dev.

### After build

- For `preview` — share the APK install URL with testers.
- For `production` — submit with `eas submit --platform android --latest` when ready.

Report the build URL and next steps.
