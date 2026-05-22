# backend/CLAUDE.md

Backend-specific context. Read alongside the root CLAUDE.md.

## The three-layer rule

Every feature flows: **route → service → db**. Don't skip layers.

- `routes/` — parse + validate request, call service, shape response. No Motor calls here.
- `services/` — business logic. Calls `db` for I/O. Returns plain dicts or Pydantic models, never raw `ObjectId`.
- `db/` — Motor client + collection accessors only.

If a route file imports `motor` or `pymongo`, that's a smell — push it into a service.

## Async-only

This is a Vercel serverless deployment on Motor. Sync I/O blocks the event loop, which on a 1-worker lambda means every other request stalls.

- `async def` for all routes and services that touch the DB or call external APIs.
- `await db.todos.find_one(...)` — never `db.todos.find_one(...)` without await.
- Don't introduce `requests` — use `httpx.AsyncClient` (already a dep for the Gemini service).

If you see sync code, it's a bug. Convert it.

## Pydantic v2 conventions

- Use `model_config = ConfigDict(...)`, not the v1 `class Config:` inner class.
- Use `Field(...)` for validation, not separate validator methods unless logic is non-trivial.
- Request/response schemas live in `app/schemas/`. Don't redefine inline in routes.
- For Mongo docs, the response schema converts `_id: ObjectId` → `id: str`. Centralize this in a helper like `to_response_model(doc)` inside the service.

## Mongo IDs

The client never sees `ObjectId`. Always return `id: str` (the hex string). The conversion lives in the service layer, never the route.

When accepting an `id` from a path param:
```python
from bson import ObjectId
from bson.errors import InvalidId

try:
    oid = ObjectId(todo_id)
except InvalidId:
    raise HTTPException(status_code=404, detail="Todo not found")
```
Don't leak `InvalidId` as a 500.

## Auth

Protected routes use `Depends(get_current_user)` from `app/core/`. The dependency:
1. Reads the `Authorization: Bearer ...` header
2. Verifies the JWT
3. Returns the user document (or raises 401)

Never re-implement JWT verification per-route. If a new auth flow is needed (e.g., refresh tokens), extend `app/core/` and use it via Depends.

## Environment

- `app/config.py` reads `.env` via `pydantic-settings`. Add new env vars there with a typed default.
- Local: `backend/.env` (gitignored).
- Production: Vercel dashboard env vars. After adding a new one to `config.py`, also add it to Vercel or production will fall back to the default and break silently.

## Run + test

```bash
cd backend
. .venv/bin/activate                                # Linux/Mac
# .\.venv\Scripts\Activate.ps1                      # Windows PowerShell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Hit `http://localhost:8000/docs` for Swagger.

There's no test suite yet. When adding one, use `pytest` + `httpx.AsyncClient` against `app.main:app` with a test MongoDB instance (`mongomock-motor` works for unit tests).

## Adding a new route (checklist)

1. Define request/response Pydantic models in `app/schemas/`.
2. Add business logic in `app/services/<feature>_service.py`.
3. Add the route in `app/routes/<feature>.py` — thin, calls the service.
4. Mount the router in `app/main.py` if it's a new file.
5. Add Swagger description: `@router.post("/...", summary="...", description="...")`.
6. If it needs auth: `current_user = Depends(get_current_user)`.
7. Test via `/docs`.

## Gemini service

`gemini_service.py` uses `httpx.AsyncClient` to call the Gemini API. The API key never reaches the mobile client — all AI calls go through this backend. Don't expose it as a public env var on the mobile side.

Timeout is set via `GEMINI_TIMEOUT` (default 20s). Vercel free tier has a 10s function timeout — production timeout should be ≤ 9s to leave room for response serialization.
