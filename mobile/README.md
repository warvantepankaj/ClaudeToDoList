# Todo List Mobile (Expo)

React Native / Expo client for the Todo API.

## Setup

Requires Node 20+.

```bash
cd mobile
npm install
# If Expo prints any version-mismatch warnings, run:
#   npx expo install --fix
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_URL to your backend's URL.
# For Expo Go on a physical phone, use your machine's LAN IP, e.g.
#   EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

Make sure the backend is running first (`uvicorn app.main:app --host 0.0.0.0 --port 8000` from `../backend`).

## Run

```bash
npx expo start
```

Scan the QR with Expo Go (Android) or the Camera app (iOS).

## Features

- JWT auth, stored in `expo-secure-store` (native) / AsyncStorage (web)
- Login + Register
- Home: todo list with filters (status, priority), search, sort
- Create / Edit screen with date+time picker
- Local notifications scheduled at `due_date`
- Analytics card (completed vs pending with progress bar)
- Dark mode with system / light / dark, toggled from Home, persisted

## Project layout

```
src/
├── api/         # axios client + endpoints + types
├── context/     # AuthContext, ThemeContext
├── navigation/  # RootNavigator (Auth vs App stacks)
├── screens/     # Login, Register, Home, TodoForm
├── components/  # TodoItem, FilterBar, AnalyticsCard
├── theme/       # color palettes
└── utils/       # notifications
```
