---
description: Scaffold a new FastAPI route following the route → service → db pattern
---

You will add a new backend route to this FastAPI project. Follow the project's three-layer convention strictly (see `backend/CLAUDE.md`).

The user's request: $ARGUMENTS

Steps:

1. **Clarify if needed**: confirm the HTTP method, path, auth requirement, and request/response shape. If the user gave enough info, skip.

2. **Define schemas** in `backend/app/schemas/` (create new file or extend existing):
   - Request model (if POST/PUT) — Pydantic v2, with `model_config = ConfigDict(...)`.
   - Response model — convert `_id` → `id: str`.

3. **Add business logic** in `backend/app/services/<feature>_service.py`:
   - `async def` functions only.
   - Call Motor via the db layer, don't import pymongo directly.
   - Convert `ObjectId` → str in the service, never leak it to the route.

4. **Add the route** in `backend/app/routes/<feature>.py`:
   - Thin — parse, call service, return.
   - If auth required: `current_user = Depends(get_current_user)`.
   - Add `summary=` and `description=` for Swagger.
   - Handle `InvalidId` → 404 explicitly when accepting `{id}` path params.

5. **Mount the router** in `backend/app/main.py` if it's a new file.

6. **Verify**: explain how to test via `http://localhost:8000/docs`.

Do NOT:
- Use sync DB calls (no `pymongo` directly, no missing `await`).
- Use `requests` for outbound HTTP — use `httpx.AsyncClient`.
- Inline Pydantic models in the route file.
- Return raw `ObjectId`.

After scaffolding, summarize the files created/modified and the exact curl/Swagger steps to verify.
