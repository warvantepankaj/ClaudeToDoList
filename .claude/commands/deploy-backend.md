---
description: Pre-deploy checklist + deploy the FastAPI backend to Vercel
---

You will deploy the backend to Vercel production. Run the checklist BEFORE deploying.

The user's request: $ARGUMENTS

## Pre-deploy checklist

Verify each item. Report any issues before proceeding.

1. **Git is clean** — `git status`. Uncommitted changes? Ask the user whether to commit, stash, or proceed anyway.

2. **Env vars are set in Vercel** — list with `vercel env ls` (or check the dashboard). Required:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `JWT_SECRET` (must NOT be empty)
   - `GEMINI_API_KEY`
   - `CORS_ORIGINS`

3. **Atlas Network Access** — must allow `0.0.0.0/0` or Vercel's IP range. Ask the user to confirm in the Atlas dashboard if uncertain.

4. **No new env vars** — diff `backend/app/config.py` against the deployed env. Any new `Settings` field added since last deploy must also be set in Vercel, or production silently falls back to the default.

5. **Requirements pinned** — `backend/requirements.txt` uses `==` pins. Confirm no `>=` or unpinned packages crept in (Vercel cold starts are sensitive to dep resolution time).

6. **Function timeout** — Vercel free tier limits functions to 10s. Confirm `GEMINI_TIMEOUT` is ≤ 9s.

## Deploy

If all checks pass:

```bash
cd backend
vercel --prod
```

## Post-deploy verification

1. Hit `https://claude-to-do-list.vercel.app/docs` — Swagger should load.
2. Hit `https://claude-to-do-list.vercel.app/health` (or the root) — should return 200.
3. Try a login from the mobile app or via `curl`. If it 500s, check the Vercel logs:
   ```bash
   vercel logs --prod
   ```

Report the deployment URL and any failed checks.
