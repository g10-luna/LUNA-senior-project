# LUNA Backend Setup

## Auth Service (Register/Login)

### 1. Configure Supabase

Edit `backend/.env` and set real values from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API:

- **SUPABASE_URL** – Project URL (e.g. `https://YOUR_PROJECT_REF.supabase.co`)
- **SUPABASE_SERVICE_ROLE_KEY** – `service_role` key (server-side only)
- **SUPABASE_ANON_KEY** – `anon` key

Do not use placeholder values like `YOUR_PROJECT_REF`.

### 2. Start Redis

The auth service uses Redis for refresh token storage. Start Redis with Docker:

```bash
cd backend/docker
docker compose up -d
```

Or install Redis locally (e.g. `brew install redis` on macOS) and run `redis-server`.

### 3. Run the Auth Service

```bash
cd backend
source venv/bin/activate
uvicorn auth.main:app --host 0.0.0.0 --port 8001 --reload-exclude 'venv/*'
```

### 4. Test Register/Login

```bash
python test_auth.py
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `nodename nor servname provided, or not known` | `SUPABASE_URL` is still a placeholder; set the real URL in `.env` |
| `Redis is not running` | Start Redis: `cd backend/docker && docker compose up -d` |
| `Connection refused` to Redis | Same as above; ensure Redis is listening on `localhost:6379` |
