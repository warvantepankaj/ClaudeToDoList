# Todo List — FastAPI + Expo + MongoDB

Production-ready todo app: async FastAPI backend on MongoDB Atlas, React Native (Expo) mobile client.

## Stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Backend  | FastAPI (async), Motor, Pydantic v2, JWT (python-jose), bcrypt        |
| Database | MongoDB Atlas                                                         |
| Mobile   | Expo (React Native 0.76), TypeScript, React Navigation, Axios         |

## Features

- Auth: register, login, JWT, bcrypt password hashing, protected `/todos`
- Todos: CRUD (title, description, status, priority, due_date, timestamps)
- Filter by status & priority, full-text search on title/description, sort by due_date or created_at
- Analytics: completed vs in-progress vs pending, progress bar
- Local notifications scheduled at due_date (Expo Notifications)
- Dark mode with persistence
- Loading and error states throughout

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in MONGODB_URI from Atlas and JWT_SECRET
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Visit `http://localhost:8000/docs` for Swagger UI.

### 2. Mobile

```bash
cd mobile
npm install
cp .env.example .env       # set EXPO_PUBLIC_API_URL to your LAN IP, e.g. http://192.168.1.42:8000
npx expo start
```

Open with **Expo Go** on your phone (scan the QR).

## API reference

| Method | Path             | Auth | Body / Query                                                                                          |
| ------ | ---------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | —    | `{ name, email, password }`                                                                           |
| POST   | `/auth/login`    | —    | `{ email, password }`                                                                                 |
| GET    | `/todos`         | JWT  | Query: `status`, `priority`, `q`, `sort=due_date_asc\|due_date_desc\|created_asc\|created_desc`       |
| POST   | `/todos`         | JWT  | `{ title, description?, status?, priority?, due_date? }`                                              |
| GET    | `/todos/{id}`    | JWT  | —                                                                                                     |
| PUT    | `/todos/{id}`    | JWT  | Partial update (same fields)                                                                          |
| DELETE | `/todos/{id}`    | JWT  | —                                                                                                     |

All `/todos/*` endpoints require `Authorization: Bearer <token>` from `/auth/login` or `/auth/register`.

## Repo layout

```
.
├── backend/   # FastAPI app
└── mobile/    # Expo (React Native) app
```

See per-folder READMEs for setup details.
