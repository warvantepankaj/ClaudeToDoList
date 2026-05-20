# Todo API (FastAPI + MongoDB Atlas)

Async REST API powering the Expo Todo mobile app.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and fill in MONGODB_URI (Atlas), JWT_SECRET, etc.
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open Swagger UI: http://localhost:8000/docs

## Endpoints

| Method | Path                | Auth | Notes                                              |
| ------ | ------------------- | ---- | -------------------------------------------------- |
| GET    | `/health`           | —    | Liveness                                           |
| POST   | `/auth/register`    | —    | `{ name, email, password }` → token                |
| POST   | `/auth/login`       | —    | `{ email, password }` → token                      |
| GET    | `/todos`            | JWT  | Query: `status`, `priority`, `q`, `sort`           |
| POST   | `/todos`            | JWT  | Create todo                                        |
| GET    | `/todos/{id}`       | JWT  | Get one                                            |
| PUT    | `/todos/{id}`       | JWT  | Partial update                                     |
| DELETE | `/todos/{id}`       | JWT  | Delete                                             |

Sort options: `due_date_asc`, `due_date_desc`, `created_asc`, `created_desc` (default).

## Auth header

```
Authorization: Bearer <access_token>
```
