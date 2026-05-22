# CLAUDE.md

Context for Claude working on this repo. Keep this file terse — it loads into every session.

## What this is

Full-stack todo app with AI chat, recurring tasks, and a calendar view.

- **Backend**: FastAPI (async) on **Vercel serverless**, MongoDB Atlas, Gemini API for AI features.
- **Mobile**: Expo / React Native (TypeScript) shipped via **EAS Build** as APK.

## Design source of truth

- Initial mockups generated in **Stitch** (Google AI design tool).
- Refined and assembled into screens in **Figma**.
- When changing UI, prefer matching the Figma reference over inventing new patterns.
- Visual language is codified in `mobile/src/theme/colors.ts` — "Editorial Minimalism with Lime Accent".

## Product spec

These three docs are the canonical "what to build" — read them when the question is about features or behavior, not just code style:

- [`docs/FEATURES.md`](docs/FEATURES.md) — every user-facing feature, in user-story form
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — MongoDB collections, schemas, indexes, conventions
- [`docs/SCREENS.md`](docs/SCREENS.md) — every mobile screen: purpose, layout, API calls, components

Together with this file, they're enough to rebuild the app from scratch.

## Repo layout

```
.
├── backend/                FastAPI app (deployed to Vercel)
│   ├── api/index.py        Vercel entry point — wraps FastAPI ASGI app
│   ├── app/
│   │   ├── main.py         FastAPI() instance, CORS, route mounting
│   │   ├── config.py       pydantic-settings, reads .env
│   │   ├── core/           shared internals (auth deps, hashing, jwt)
│   │   ├── db/             Motor client setup
│   │   ├── routes/         auth.py, todos.py, ai.py
│   │   ├── services/       user_service, todo_service, gemini_service
│   │   └── schemas/        Pydantic v2 request/response models
│   ├── requirements.txt
│   ├── vercel.json         rewrites /(.*) → /api/index
│   └── .env                LOCAL ONLY — gitignored. Prod uses Vercel env vars.
│
├── mobile/                 Expo app (built via EAS)
│   ├── App.tsx             root, wraps providers + navigation
│   ├── app.json            Expo config — bump version + versionCode here
│   ├── eas.json            build profiles: development | preview | production
│   ├── src/
│   │   ├── api/            axios client + endpoint wrappers (JWT interceptor)
│   │   ├── components/     TaskCard, FilterBar, AnalyticsCard, Header,
│   │   │                   ChatBubble, InputBox, ThemeToggle
│   │   ├── context/        ThemeContext, AuthContext
│   │   ├── navigation/     stack + bottom tabs
│   │   ├── screens/        Login, Register, Dashboard, TaskList, TodoForm,
│   │   │                   Calendar, AIChat
│   │   ├── theme/          colors + typography tokens (light/dark)
│   │   └── utils/
│   └── .env                LOCAL ONLY — gitignored. EAS reads from eas.json env block.
│
└── .easignore              excludes backend/ from the EAS tarball (Windows symlink issue)
```

## Stack

**Backend** — FastAPI 0.115, Motor 3.6 (async MongoDB), Pydantic v2, python-jose JWT, bcrypt 4.2, httpx 0.27 (for Gemini calls).

**Mobile** — Expo SDK 54, React Native 0.81, React 19, React Navigation 7 (native-stack + bottom-tabs), axios, expo-secure-store (JWT storage), expo-notifications, AsyncStorage (theme persistence).

## Run locally

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Linux/Mac
# or:  py -m venv .venv ; .\.venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger at `http://localhost:8000/docs`.

**Mobile:**
```bash
cd mobile
npm install
npx expo start
```
Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your LAN IP (e.g. `http://192.168.1.42:8000`) when testing against local backend.

## Deploy

**Backend → Vercel:**
```bash
cd backend
vercel --prod
```
Env vars must be set in the Vercel dashboard (or `vercel env add`):
`MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `GEMINI_API_KEY`, `CORS_ORIGINS`.

Atlas Network Access must allow `0.0.0.0/0` — Vercel lambdas have no fixed egress IP.

**Mobile → EAS:**
```bash
cd mobile
eas build --platform android --profile preview     # internal APK
eas build --platform android --profile production  # release APK
```

For JS-only changes (no native module / SDK / plugin / permission change), skip the rebuild and ship an OTA update:
```bash
eas update --branch preview --message "fix X"
```

When a rebuild IS needed, bump in `mobile/app.json`:
- `expo.version` — semver, user-visible
- `expo.android.versionCode` — strictly increasing integer (Play Store requirement)
- `expo.ios.buildNumber` — strictly increasing string

## Conventions

- **Backend route → service → db** split. Routes parse + validate, services hold logic, db layer holds Motor calls. Don't call `db.collection.find_one` directly from routes.
- **Pydantic v2 schemas** live in `app/schemas/`. Use `model_config = ConfigDict(...)` not the v1 `class Config:` style.
- **Mongo IDs** — return `id: str` to the client, never raw `ObjectId`. Conversion happens in the service layer.
- **JWT auth** — protected routes use the `Depends(get_current_user)` dependency from `app/core/`. Don't roll new auth checks per-route.
- **Mobile API calls** — go through `src/api/`, never raw `axios.get` from a screen. JWT is attached by the axios interceptor automatically.
- **Theming** — use tokens from `src/theme/`, not hardcoded hex. New colors get added to the theme, not inlined.
- **Async everywhere on the backend** — `async def` routes, `await db.collection...`. Motor is async; using sync pymongo will silently block the event loop.

## Known gotchas

- **EAS tarball + Windows**: `backend/.venv` contains POSIX symlinks that `lstat` can't read on Windows. The repo-root `.easignore` excludes `backend/` — don't remove it.
- **`.easignore` overrides `.gitignore`**: if you add a new build-time ignore (e.g. `coverage/`), add it to `.easignore` too, not just `.gitignore`.
- **Vercel cold starts** the first request after idle can take 3–5s. Add a client-side retry/loading state, don't treat it as failure.
- **Atlas connection pooling**: each Vercel invocation may create a new Motor client. Connection counts can spike. Keep the client module-level so warm invocations reuse it.
- **Expo Go vs dev build**: `expo-notifications` doesn't fully work in Expo Go on Android since SDK 53 — use a dev build (`eas build --profile development`) when testing notification scheduling.

## Secrets

- `.env` files are gitignored both at root and per-package. Never commit them.
- Production secrets live in **Vercel env vars** (backend) and **`eas.json` env block** (non-secret) or **EAS Secrets** for sensitive values.
- If a secret leaks (paste, screenshot, accidental commit), rotate immediately:
  - Atlas: Database Access → reset user password
  - Gemini: Google AI Studio → revoke + regenerate
  - JWT_SECRET: generate new (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) — note this invalidates all existing tokens.

## When in doubt

- Match the existing pattern in a sibling file before inventing a new one.
- Backend lives async — never introduce `requests` or sync DB calls.
- Mobile lives typed — don't `any` your way out of a type error; fix the type.
