# FEATURES.md

The product spec — what this app does, told as user stories. Together with `DATA_MODEL.md` and `SCREENS.md`, this is enough to rebuild the app from scratch.

---

## 1. Authentication

### 1.1 Register
**As a** new user
**I can** create an account with name, email, and password
**So that** my todos are private to me

- Email must be valid and unique across the system.
- Password ≥ 6 chars, ≤ 128 chars. Stored as bcrypt hash, never plaintext.
- Successful register returns a JWT and the user record — auto-logs in.

### 1.2 Login
**As a** returning user
**I can** sign in with email + password
**So that** I see my saved todos on any device

- Returns JWT + user record.
- JWT lasts 7 days (`JWT_EXPIRE_MINUTES=10080`).
- Failed login returns 401 with a generic message (no enumeration of which field was wrong).

### 1.3 Session persistence
**As a** logged-in user
**I can** close and reopen the app without re-entering credentials
**So that** the app feels native, not webby

- JWT stored in **expo-secure-store** (OS keychain), never AsyncStorage.
- On launch, the app reads the token, validates it client-side (expiry), and routes to the authenticated tab navigator if valid.

### 1.4 Logout
**As a** logged-in user
**I can** sign out
**So that** my account is safe on shared devices

- Clears the secure-store token. No server-side revocation (stateless JWT).

---

## 2. Todos — CRUD

### 2.1 Create a todo
**As a** user
**I can** create a todo with title, optional description, status, priority, optional due date, and optional recurrence
**So that** I can track work

- Title required, 1–200 chars.
- Description optional, ≤ 2000 chars.
- Status: `pending` (default) | `in_progress` | `completed`.
- Priority: `low` | `medium` (default) | `high`.
- Due date: ISO datetime, optional.
- Recurrence: `daily` | `weekly` | `monthly` | none (default).

### 2.2 List my todos with filtering, search, and sorting
**As a** user
**I can** browse my todos
**So that** I can find what I need

Query parameters supported:
- `status` — filter by exact status.
- `priority` — filter by exact priority.
- `q` — case-insensitive substring search on title and description.
- `sort` — one of `due_date_asc`, `due_date_desc`, `created_desc` (default), `created_asc`.

Todos are scoped to the requesting user — never leak across accounts.

### 2.3 View a single todo
**As a** user
**I can** fetch one todo by id
**So that** I can deep-link to it

- 404 if id is invalid format OR if the todo doesn't belong to me.

### 2.4 Update a todo
**As a** user
**I can** partially update any field of a todo I own
**So that** plans can change

- PUT accepts a partial body. Unspecified fields are not modified.
- `updated_at` is always bumped to now.

### 2.5 Delete a todo
**As a** user
**I can** delete one of my todos
**So that** noise stays out

- DELETE returns 204. 404 if not found or not mine.

---

## 3. Recurring tasks (the interesting part)

### 3.1 Mark recurrence at creation
**As a** user
**I can** flag a todo as daily/weekly/monthly
**So that** it repeats without me re-creating it

### 3.2 Bump-in-place on completion
**As a** user
**When I complete a recurring task**
**Then** the same record stays around, its `due_date` advances by one interval, and its status goes back to `pending`

- One record per recurring task — never a history of past completions.
- `last_completed_at` records the moment the user pressed complete.
- Monthly recurrence clamps to the last valid day (Jan 31 → Feb 28/29).

### 3.3 Uncomplete a recurring task
**As a** user
**I can** revert the last completion of a recurring task
**So that** I can correct a misclick

- POST `/todos/{id}/uncomplete` walks `due_date` back one interval, clears `last_completed_at`, and resets status to `pending`.

---

## 4. Notifications

### 4.1 Schedule a local reminder
**As a** user
**When I create or update a todo with a due_date**
**Then** the app schedules a local notification for that time

- Scheduled client-side via `expo-notifications`. The backend does NOT push.
- Permission is requested on first launch.
- For recurring tasks, the next occurrence's notification is scheduled when the previous one is completed (since the `due_date` field advances).

### 4.2 Cancel reminders
**As a** user
**When I delete a todo or remove its due date**
**Then** the scheduled notification is cancelled

---

## 5. AI features (powered by Gemini)

All AI endpoints require auth. The Gemini API key lives on the backend only — it never ships to the client.

### 5.1 Parse natural language into a task
**As a** user
**I can** type something like "Pay rent on the 1st"
**And** the app extracts title, deadline, priority, recurrence, and optional subtasks

Endpoint: `POST /ai/parse-task`
- Returns `{title, subtasks[], deadline, priority, recurrence}`.
- Conservative — never invents a deadline if the user didn't state one.

### 5.2 Schedule a day
**As a** user
**I can** give the AI a list of tasks and a working-hour window
**And** get back a chronological time-slotted plan

Endpoint: `POST /ai/schedule-day`
- Input: tasks (with optional priority, deadline, duration) + start_hour + end_hour.
- Output: array of `{time, task}` slots in HH:MM 24h.
- Higher-priority and earlier-deadline tasks scheduled first. Breaks allowed if many tasks.

### 5.3 Intent-classified chat
**As a** user
**I can** chat with the assistant
**And** get a classified intent (create_task / list_tasks / complete_task / schedule / summary / smalltalk / other) plus structured `actions` the client can execute

Endpoint: `POST /ai/chat`
- The client uses the `actions` payload to actually perform the work (e.g. create the task locally) rather than the AI doing it server-side.

### 5.4 Smart planning with conversation memory
**As a** user
**I can** have a multi-turn planning conversation
**And** the AI tracks state, asks clarifying questions when info is missing, and only commits to creating tasks when time/priority is explicit

Endpoint: `POST /ai/plan`
- Input: current message + conversation history + existing tasks + optional working-hours window.
- Output: response `type` ∈ `{question, create_task, create_tasks, schedule}` plus `tasks[]` / `schedule[]` / `questions[]` payloads.
- Safety nets prevent the AI from inventing deadlines or returning bare acknowledgements with no action. If time info is missing, it switches to `question` type.

---

## 6. Calendar view

**As a** user
**I can** see my todos arranged by date
**So that** I can plan my week visually

- Month view with dots/markers on days that have todos.
- Tap a day → drill into that day's tasks.
- Recurring tasks appear on every upcoming due date, not just the current one.

---

## 7. Dashboard / Analytics

**As a** user
**I can** see a summary of my todo state on the home screen
**So that** I know where I stand without scrolling lists

Counts shown:
- Total todos
- Pending
- In progress
- Completed (today)
- Progress bar (% completed of total active)

Also shows:
- Today's todos (due_date is today)
- Quick-add input

---

## 8. Theming

### 8.1 Light / dark mode
**As a** user
**I can** toggle between light and dark themes
**So that** the app fits my environment

- Toggle in settings / header.
- Choice persists via AsyncStorage across launches.
- Design language is "Editorial Minimalism with Lime Accent" — see DESIGN.md (or theme/colors.ts):
  - Lime chartreuse (`#C5EE51`) as the signature accent in both themes.
  - Near-black (`#0A0A0A`) text on near-white (`#FAFAFA`) background (light) and inverse (dark).
  - Hairline borders, no gradients, no shadow noise.

---

## 9. Timezone repair (legacy fix)

**As a** user with old AI-created tasks
**I can** correct their stored UTC offset
**So that** they show at the right wall-clock time

Endpoint: `POST /todos/{id}/repair-timezone` with `{offset_minutes}`.

Background: early versions saved local datetimes as if they were UTC. This endpoint subtracts the offset from `due_date` and `last_completed_at` for a one-shot fix. Should be removed after all affected records are migrated.

---

## Out of scope (intentionally not built)

- Sharing todos with other users / collaboration
- Sub-tasks as first-class records (only as AI-parsed strings)
- Push notifications from the server
- File attachments
- Tags / labels (priority + status are the only categorization)
- Web app
- Offline mode (we always assume the API is reachable, with loading states for latency)
