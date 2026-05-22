---
description: Scan the repo for accidentally committed secrets and risky env patterns
---

Scan this repo for committed secrets, exposed API keys, and risky env patterns. Report findings with file:line references.

## What to look for

1. **Hardcoded secrets in committed files**:
   - MongoDB connection strings with credentials (`mongodb+srv://user:pass@...`)
   - JWT secrets that aren't placeholders
   - Gemini / Google API keys (`AIza...`)
   - AWS keys (`AKIA...`)
   - Generic high-entropy strings in `.py`, `.ts`, `.tsx`, `.json`, `.js`

2. **`.env` files tracked by git**:
   - `git ls-files | grep -E '\.env($|\..*$)'` — anything other than `.env.example` is a finding.

3. **Secrets in `eas.json`**:
   - `eas.json` env blocks ship to the build worker. Anything sensitive should be in **EAS Secrets** (`eas secret:create`), not inline.

4. **`EXPO_PUBLIC_*` vars with secrets**:
   - These ship to the device and are extractable. API keys, signing secrets, etc. must NOT be `EXPO_PUBLIC_*`.

5. **Git history**:
   - `git log --all -p | grep -iE '(api[_-]?key|secret|password|token).*=.*[a-z0-9]{20,}'` — if anything matches, that secret is permanently in history and must be rotated even if the file is now clean.

## What to ignore

- `.env.example` placeholders
- `JWT_SECRET=change-me-...` defaults in `config.py` (it's the fallback, not a real value)
- Truly random-looking but non-sensitive IDs (UUIDs in tests, etc.)

## Report format

For each finding:
- **File:line**
- **What** — the secret type
- **Severity** — high (real prod credential) / medium (suspicious) / low (likely false positive)
- **Action** — rotate (if exposed in history), gitignore (if tracked), move to env (if hardcoded)

If a finding requires rotation, give exact steps:
- Atlas password → Database Access → reset user password
- Gemini key → Google AI Studio → revoke + regenerate
- JWT_SECRET → generate new + redeploy (note: invalidates all sessions)

End with a one-line summary: `X high, Y medium, Z low findings`.
