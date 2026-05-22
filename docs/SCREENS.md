# SCREENS.md

Every screen in the mobile app: purpose, layout, components, navigation, and API calls. Source of truth alongside the Figma designs.

---

## Design language

**"Editorial Minimalism with Lime Accent"** (from `mobile/src/theme/colors.ts`):

- Background: off-white `#FAFAFA` (light) / near-black `#0A0A0A` (dark)
- Surface (cards): pure white / `#18181B`
- Text: near-black `#0A0A0A` / off-white `#FAFAFA`, muted `#71717A` / `#A1A1AA`
- **Signature accent**: chartreuse lime `#C5EE51` — works in both themes
- Secondary accent: muted lavender `#7C7AED`
- Hairline borders (`#EAEAEA` / `#27272A`), no gradients, soft shadows only

Status colors: completed = success green, in_progress = primary lime, pending = muted text.
Priority colors: high = danger red, medium = warning amber, low = info lavender.

---

## Navigation structure

```
Root
├── AuthStack (unauthenticated)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── AppStack (authenticated)
    ├── MainTabs (bottom-tab navigator, floating capsule bar)
    │   ├── Dashboard  (◆ Home)
    │   ├── Tasks      (☰ Tasks)
    │   ├── Calendar   (▦ Calendar)
    │   └── AIChat     (✦ AI)
    └── TodoForm       (modal — accessible from any tab)
```

The bottom tab bar is a **floating capsule** — pill-shaped, hairline-bordered, with the active tab expanding into a lime pill showing both glyph and label. Inactive tabs show only the glyph.

---

## 1. LoginScreen

**Purpose**: sign in an existing user.

**Route**: `Auth → Login`

**Layout**:
- App name / logo at top
- Email field (autocapitalize off, keyboardType email-address)
- Password field (secureTextEntry)
- "Sign in" button (primary lime)
- Link to RegisterScreen — "Don't have an account? Register"
- Theme toggle in a corner (small, unobtrusive)

**State**:
- `email`, `password` — controlled inputs
- `loading` — disables the button + shows spinner
- `error` — shown inline below the form

**API**:
- `POST /auth/login` via `src/api/auth.ts → login(email, password)`
- On success: token stored in secure-store via `AuthContext.signIn(...)`, navigates to MainTabs automatically (token change triggers RootNavigator re-render).

**Validation**:
- Email format checked before submit.
- Password non-empty.

**Error states**:
- Invalid credentials → "Email or password is incorrect."
- Network error → "Can't reach the server. Try again."

---

## 2. RegisterScreen

**Purpose**: create a new account.

**Route**: `Auth → Register`

**Layout**:
- Headline ("Create your account")
- Name field
- Email field
- Password field (with show/hide toggle)
- "Create account" button
- Link back to LoginScreen — "Already have one? Sign in"

**State**: `name`, `email`, `password`, `loading`, `error`.

**API**:
- `POST /auth/register` via `src/api/auth.ts → register(...)`
- On success: same as login — token stored, navigate.

**Validation**:
- Name 1–80 chars.
- Email valid format.
- Password 6–128 chars. Show character count.

**Error states**:
- 409 (email taken) → "An account with that email already exists."
- 422 → field-specific message from the API.

---

## 3. DashboardScreen (Home tab)

**Purpose**: at-a-glance overview of today's state + quick actions.

**Route**: `MainTabs → Dashboard`

**Layout**:
- **Header**: greeting ("Hi, {name}"), date, theme toggle.
- **AnalyticsCard**: 2x2 grid of stat tiles:
  - Total
  - Pending
  - In progress
  - Completed (today)
- **Progress bar**: % of active todos completed today (lime fill).
- **Today section**: list of `TaskCard`s due today, tap to edit.
- **Quick-add input** (`InputBox`): single-line title input + plus button. Submitting creates a `pending`, `medium`-priority todo with `due_date = today end-of-day`.
- **Empty state**: when no todos for today, illustration + "Add your first task for today" prompt.

**State**: `todos`, `loading`, `error`, `quickAddText`.

**API**:
- `GET /todos?sort=created_desc` then client-side filter for `due_date` is today.
- `POST /todos` for quick-add.

**Interactions**:
- Tap a task card → `TodoForm` modal (edit mode).
- Tap "View all" → switches to Tasks tab.
- Toggle a task's completion via long-press or a checkbox on the card.

---

## 4. TaskListScreen (Tasks tab)

**Purpose**: full searchable, filterable list of all the user's todos.

**Route**: `MainTabs → Tasks`

**Layout**:
- **Header**: title "Tasks", "+ New" button → `TodoForm` modal (create mode).
- **FilterBar**: chip row for status + priority + sort.
  - Status chips: All, Pending, In Progress, Completed.
  - Priority chips: All, Low, Medium, High.
  - Sort dropdown: Newest, Oldest, Due ↑, Due ↓.
- **Search bar**: debounced text input, sends `?q=` to the API.
- **List**: `FlatList` of `TaskCard`s.
  - Each card: title, description preview (one line), priority chip, status chip, due date relative ("in 2 days"), recurrence indicator if set.
- **Empty state**: per-filter messaging ("No completed tasks" / "Nothing matches '{q}'").
- **Loading**: skeleton cards on first load, pull-to-refresh.

**State**: `todos`, `loading`, `error`, `filters` (status, priority, sort), `searchQuery` (debounced).

**API**:
- `GET /todos` with all filter params.
- `PUT /todos/{id}` from inline complete-toggle on a card.
- `DELETE /todos/{id}` from swipe-to-delete.

**Interactions**:
- Tap card → `TodoForm` modal (edit).
- Swipe left on card → reveals Delete button.
- Long-press to multi-select (future — not built yet).
- Pull-to-refresh re-fetches the list.

---

## 5. TodoFormScreen (modal)

**Purpose**: create or edit a single todo.

**Route**: `AppStack → TodoForm`, presented as a modal. Param: `{ todo?: Todo }`. If `todo` is provided → edit mode. Otherwise → create mode.

**Layout**:
- Modal header: title ("New task" / "Edit task"), close (X) button on left, save button on right.
- **Title** field (large, focused on mount in create mode).
- **Description** field (multiline, expandable).
- **Status** selector (segmented control: Pending / In Progress / Completed). Edit mode only.
- **Priority** selector (segmented: Low / Medium / High).
- **Due date** picker (date + time, via `@react-native-community/datetimepicker`).
- **Recurrence** selector (None / Daily / Weekly / Monthly).
- **Delete** button at bottom (red, with confirmation alert) — edit mode only.

**State**: form fields mirroring `Todo`, `saving`, `deleting`, `error`.

**API**:
- Create: `POST /todos`.
- Update: `PUT /todos/{id}`.
- Delete: `DELETE /todos/{id}`.

**Side effects**:
- On save with `due_date` set → schedule a local notification (cancel previous if updating).
- On save → close modal, return to previous screen, refresh list.

**Validation**:
- Title required. Save button disabled until non-empty.
- Description ≤ 2000 chars (counter visible past 1800).

---

## 6. CalendarScreen (Calendar tab)

**Purpose**: see todos arranged by date.

**Route**: `MainTabs → Calendar`

**Layout**:
- **Month view**: grid of days. Days with todos get a small dot indicator (color-coded by highest-priority task that day).
- **Month nav**: chevrons left/right, "Today" pill to jump back.
- **Selected day section**: below the calendar, list of `TaskCard`s for the selected day.
- **Recurring tasks**: appear on every upcoming occurrence date based on their recurrence rule + base `due_date`.

**State**: `selectedDate`, `currentMonth`, `todos`, `loading`.

**API**:
- `GET /todos?sort=due_date_asc` — fetched once, expanded client-side via `recurringDisplay` util to show occurrences in the visible window.

**Interactions**:
- Tap a day → updates `selectedDate`, the day's task list scrolls into view.
- Tap a task in the day list → `TodoForm` modal.

---

## 7. AIChatScreen (AI tab)

**Purpose**: conversational interface for creating tasks, planning the day, and getting summaries.

**Route**: `MainTabs → AIChat`

**Layout**:
- **Header**: "Assistant", clear-conversation button.
- **Chat scroll view**: alternating user / assistant `ChatBubble`s.
  - User bubbles: right-aligned, lime background, black text.
  - Assistant bubbles: left-aligned, surface background, with rendered content:
    - Plain text reply
    - **Question bubble**: list of clarifying questions, each tappable to insert as the next user message.
    - **Task draft card**: title + priority + deadline + recurrence, with "Add" / "Edit" / "Discard" buttons.
    - **Schedule view**: time-slotted list of tasks for the day.
- **InputBox**: text field + send button, sticky at bottom above the tab bar.
- **Typing indicator** while awaiting response.

**State**:
- `messages`: array of `{role, text, payload?}`.
- `conversation`: trimmed history sent to `/ai/plan` for context.
- `existingTasks`: snapshot of current todos sent for de-duplication.
- `timeRange`: optional working-hour window collected mid-conversation.
- `loading`.

**API**:
- `POST /ai/plan` — primary endpoint. Returns `{type, message, questions[], tasks[], schedule[]}`.
- `POST /todos` — called when user accepts a task draft.
- `POST /ai/parse-task` — used for one-shot natural-language → task without conversation (e.g. shortcuts).
- `POST /ai/schedule-day` — used when user explicitly requests a day plan and time_range is set.

**Conversation rules** (mirrored in backend prompt):
- If AI returns `type: question` → render questions as taps.
- If AI returns `type: create_task` → render task draft, user must explicitly Add to commit.
- If AI returns `type: create_tasks` → render list of drafts, all-add / select-add / discard.
- If AI returns `type: schedule` → render time-slot view, "Save as tasks" creates them all.

**Safety**:
- Tasks are never created without explicit user confirmation.
- Deadlines are never inferred — the AI must have been told a time, or it asks.

---

## Shared components

### `Header` (`src/components/Header.tsx`)
Top bar pattern reused across Dashboard, Tasks, Calendar, AIChat. Props: title, optional right action.

### `TaskCard` (`src/components/TaskCard.tsx`)
The reusable todo row. Renders title, description preview, priority chip, status indicator, due date, recurrence badge. Tappable, swipeable, supports inline complete toggle.

### `FilterBar` (`src/components/FilterBar.tsx`)
Horizontal chip group for status + priority + sort. Used in TaskListScreen.

### `AnalyticsCard` (`src/components/AnalyticsCard.tsx`)
The 2x2 stat grid + progress bar on Dashboard.

### `ChatBubble` (`src/components/ChatBubble.tsx`)
Bubble for the AI chat. Variants: user, assistant-text, assistant-question, assistant-task-draft, assistant-schedule.

### `InputBox` (`src/components/InputBox.tsx`)
Text input + send button. Used on Dashboard (quick-add) and AIChatScreen.

### `ThemeToggle` (`src/components/ThemeToggle.tsx`)
Sun/moon icon button. Updates `ThemeContext`, which persists via AsyncStorage.

---

## Cross-cutting requirements (all screens)

Every screen must:

1. **Use theme tokens only**. No hex literals, no magic number spacing.
2. **Show a loading state** when fetching. Skeleton or spinner. Never a blank flash.
3. **Show an error state** with retry. Network errors get "Try again", validation errors get the field-specific message.
4. **Handle the offline / cold-start case**. Vercel cold start is 3–5s — loading must persist that long without timing out the user's patience (no "Failed" toast at 2s).
5. **Be accessible**: `accessibilityLabel` on icon-only buttons, touch targets ≥ 44pt, contrast verified in both themes.
6. **Use safe-area insets** via `useSafeAreaInsets` — the floating tab bar requires bottom inset; headers require top.
