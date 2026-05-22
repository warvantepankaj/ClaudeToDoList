---
description: Bump the mobile app version in app.json before an EAS build
---

You will bump the mobile app version in `mobile/app.json` for the next EAS build.

The user's request: $ARGUMENTS (typically "patch", "minor", "major", or a specific version like "1.2.0")

Steps:

1. **Read** `mobile/app.json` and extract the current values:
   - `expo.version`
   - `expo.android.versionCode`
   - `expo.ios.buildNumber`

2. **Compute the new values**:
   - `expo.version` — semver bump per the user's request. If they said "patch", increment patch; "minor", increment minor + reset patch; "major", increment major + reset minor/patch. If they gave an explicit version, use it.
   - `expo.android.versionCode` — increment by 1. ALWAYS. Even for a minor user-facing version bump. Play Store rejects duplicates forever per app.
   - `expo.ios.buildNumber` — increment by 1 (as a string).

3. **Edit `mobile/app.json`** with the new values.

4. **Report**:
   - Old → new values for all three fields.
   - The build command to run next (based on the profile — ask if unclear):
     ```
     cd mobile
     eas build --platform android --profile production
     ```
   - Reminder: if no native changes, consider `eas update` instead of a full rebuild.

Do NOT:
- Skip the `versionCode` bump even if only `version` changed.
- Lower any of the three values (would break store uploads).
- Commit the change unless explicitly asked.
