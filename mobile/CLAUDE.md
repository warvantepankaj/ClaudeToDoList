# mobile/CLAUDE.md

Mobile-specific context. Read alongside the root CLAUDE.md.

## API calls go through `src/api/`

Never `import axios` or `fetch(...)` directly from a screen or component. Every backend call goes through a wrapper in `src/api/`.

Why: the axios instance there has the JWT interceptor, the base URL from `EXPO_PUBLIC_API_URL`, and consistent error handling. Bypassing it means unauthenticated requests in production.

```ts
// 👎
const res = await axios.get('https://.../todos');

// 👍
import { todos } from '@/src/api';
const list = await todos.list({ status: 'pending' });
```

## Theme tokens, not hex literals

Colors, spacing, font sizes come from `src/theme/`. The theme switches between light + dark based on `ThemeContext` and persists via AsyncStorage.

```tsx
// 👎
<View style={{ backgroundColor: '#0f172a', padding: 16 }} />

// 👍
<View style={{ backgroundColor: theme.colors.background, padding: theme.space.md }} />
```

If a needed token doesn't exist, add it to the theme files — don't inline.

## Screen + component conventions

- Screens: `*Screen.tsx` in `src/screens/`, default-exported. One screen per file.
- Components: PascalCase in `src/components/`, named-exported.
- Navigation registered in `src/navigation/` — every new screen needs an entry + a typed param in the navigator's param list.
- Hooks live next to the consumer or in `src/utils/` if shared.

## Storage rules

- **JWT** → `expo-secure-store` (encrypted, OS-keychain). Never AsyncStorage.
- **Theme preference, last filter, etc.** → AsyncStorage (already wired).
- **Never** store secrets in AsyncStorage. It's plain disk.

## Notifications

`expo-notifications` is wired for scheduling local notifications at a todo's `due_date`.

- Scheduling happens client-side after a successful create/update. Backend doesn't push.
- On Android since Expo SDK 53, full notification functionality requires a **dev build**, not Expo Go. When testing notification flows: `eas build --profile development` and install that.
- Permission request happens on first launch — handled in `AuthContext` or app root.

## When to `eas update` vs `eas build`

| Change                                          | Action          |
| ----------------------------------------------- | --------------- |
| Edit screen/component/style, change API call    | `eas update`    |
| Add JS-only npm package                         | `eas update`    |
| Bump Expo SDK                                   | `eas build`     |
| Add expo-* plugin or native module              | `eas build`     |
| Change `app.json` native fields (icons, perms)  | `eas build`     |
| Change EAS env vars                             | `eas build`     |

`eas update` is ~30s. `eas build` is ~15min. Don't rebuild when you don't need to.

## Version bump (before every build)

In `mobile/app.json`:
- `expo.version` — semver, user-visible (e.g. `1.0.1`)
- `expo.android.versionCode` — strictly increasing integer (Play Store rejects duplicates)
- `expo.ios.buildNumber` — strictly increasing string

Use the `/bump-version` slash command if available.

## Env vars

- Only vars prefixed `EXPO_PUBLIC_` are accessible at runtime. Anything else is build-time only.
- `EXPO_PUBLIC_API_URL` is set per-profile in `eas.json` for builds, and per-developer in `mobile/.env` for local dev.
- Don't put secrets in `EXPO_PUBLIC_*` — they ship to the device and can be extracted. Backend-only secrets stay on the backend.

## Adding a new screen (checklist)

1. Create `src/screens/MyFeatureScreen.tsx` (default export).
2. Add it to the relevant navigator in `src/navigation/`.
3. Add its param type to the navigator's param list.
4. If it needs API data, add the call to `src/api/` first, then consume it.
5. Use theme tokens for all styling.
6. Add a loading + error state — never render a blank screen during fetch.

## Known issues

- **EAS tarball + backend symlinks**: the repo-root `.easignore` excludes `backend/` because its `.venv` contains POSIX symlinks Windows can't `lstat`. Don't remove that.
- **Cold-start latency on Vercel**: first request after idle takes 3–5s. Loading states are mandatory.
- **Notification scheduling in Expo Go**: limited on Android since SDK 53. Use dev build for real testing.
