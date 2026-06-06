# AutoReach AI Backend

AutoReach AI is an async FastAPI backend for tracking outbound email threads, detecting stale conversations, and generating concise AI follow-up drafts.

## Stack

- Python 3.11+
- FastAPI
- SQLAlchemy async with MySQL using `aiomysql`
- Redis for scheduler job queueing
- APScheduler for daily cron scheduling
- OpenAI Python SDK
- Pydantic v2
- Alembic migrations

## Setup

1. Create and activate a virtual environment.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies.

```powershell
pip install -r requirements.txt
```

3. Create environment config.

```powershell
Copy-Item .env.example .env
```

Update `.env` with your MySQL, Redis, OpenAI, and IMAP credentials.

4. Create the MySQL database if it does not exist.

```sql
CREATE DATABASE autoreach_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Run migrations.

```powershell
alembic upgrade head
```

6. Start the API.

```powershell
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

## Running the Scheduler

The scheduler enqueues and processes the stale-thread scan every day at 08:00 in `SCHEDULER_TIMEZONE`.

```powershell
python -m app.services.scheduler
```

For deployments where the API process should own scheduling, set:

```env
ENVIRONMENT=production
```

You can also run one immediate scan without the cron loop:

```powershell
python -m app.workers.follow_up_worker
```

## API Endpoints

- `POST /api/threads/` creates a tracked email thread.
- `GET /api/threads/?user_id=USER_ID&status=tracking` lists threads for a user.
- `GET /api/threads/{id}` fetches one thread.
- `PATCH /api/threads/{id}/dismiss` marks a thread manually handled.
- `GET /api/drafts/?status=pending&user_id=USER_ID` lists generated drafts.
- `GET /api/drafts/{id}` fetches one draft.
- `POST /api/drafts/{id}/approve` marks a draft ready to send.
- `POST /api/drafts/{id}/dismiss` dismisses a draft.
- `POST /api/drafts/{id}/regenerate` creates a new pending draft in a different tone.

## Worker Behavior

The stale scan selects threads where:

- `status = tracking`
- `sent_at` is at least `STALE_AFTER_DAYS` days old
- no matching IMAP reply is found from the recipient

When a stale thread qualifies, AutoReach AI calls OpenAI with a strict JSON prompt and stores a pending draft. If the AI request fails or times out after 3 seconds, the worker stores a professional fallback draft so the workflow never stalls.
