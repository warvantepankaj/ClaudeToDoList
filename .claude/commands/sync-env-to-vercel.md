---
description: Sync backend/.env values to Vercel production env vars
---

You will mirror values from `backend/.env` to Vercel production env vars.

The user's request: $ARGUMENTS

Steps:

1. **Read `backend/.env`** and list every key=value pair (mask the values when reporting, e.g. `MONGODB_URI=mongodb+srv://****`).

2. **List current Vercel env vars** to see what's already set:
   ```bash
   vercel env ls production
   ```

3. **For each key in `.env`** that should ship to production:
   - If it's missing in Vercel: add it.
     ```bash
     vercel env add <KEY> production
     # then paste the value
     ```
   - If it's already set but differs: ask the user before overwriting (it might be intentionally different in prod).

4. **Never sync** these — they're local-dev only:
   - `HOST`, `PORT` (Vercel sets its own)
   - Anything with `localhost` in the value

5. **Validate** — confirm `JWT_SECRET` is NOT empty in `.env` before syncing. If it is, generate one:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
   Update `.env` AND Vercel with the new value. Warn the user this invalidates all existing tokens.

6. **Trigger redeploy** so the new env vars take effect:
   ```bash
   vercel --prod
   ```
   (Setting env vars alone does NOT redeploy.)

Report the synced keys (masked) and confirm the redeploy was triggered.
