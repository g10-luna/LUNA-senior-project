# LUNA Backend

Backend services for the LUNA (Library User Navigation Assistant) system.

This backend runs as a small service-oriented stack:
- Auth Service
- Book Service
- Delivery Service
- Robot Service
- Notification Service
- PostgreSQL
- Redis
- Celery worker
- Nginx API gateway

## Quick Start (Docker, recommended)

1. From the `backend` directory, create your env file:

```bash
cp .env.example .env
```

2. Fill in required values in `backend/.env` for your environment.

3. For full Docker Compose runs, use container hostnames (not localhost):

```env
DATABASE_URL=postgresql+asyncpg://luna_user:luna_password@postgres:5432/luna_db
DATABASE_URL_SYNC=postgresql://luna_user:luna_password@postgres:5432/luna_db
REDIS_URL=redis://redis:6379/0
REDIS_CELERY_BROKER_URL=redis://redis:6379/1
```

4. Start the full stack:

```bash
cd docker
docker compose --env-file ../.env up -d --build
```

5. Check health:

```bash
docker compose --env-file ../.env ps
curl http://localhost:8000/health
```

## Service Endpoints

Gateway base URL:

```text
http://localhost:8000
```

Main API prefixes:
- Auth: `/api/v1/auth`
- Books: `/api/v1/books`
- Delivery: `/api/v1/requests`, `/api/v1/returns`, `/api/v1/deliveries`
- Robot: `/api/v1/robot`
- Notifications: `/api/v1/notifications`

## Service-Specific Docs

Detailed auth setup, auth smoke tests, profile sync behavior, and Supabase webhook integration are documented in:

- `backend/auth/README.md`

## Useful Commands

From `backend/docker`:

```bash
# start / rebuild
docker compose --env-file ../.env up -d --build

# stop
docker compose --env-file ../.env down

# logs
docker compose --env-file ../.env logs -f

# check db users
docker compose --env-file ../.env exec -T postgres \
  psql -U luna_user -d luna_db -c "SELECT COUNT(*) FROM app.user_profiles;"
```

## Troubleshooting

- Service connection refused errors:
  - Ensure Docker env values use `redis`/`postgres` hostnames, not `localhost`.
- Use service-specific logs:
  - `docker compose --env-file ../.env logs --tail=200 <service-name>`

## Project Layout

```text
backend/
  auth/
  book/
  delivery/
  robot/
  notification/
  shared/
  alembic/
  nginx/
  docker/
```
