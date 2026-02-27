# Auth Service README

Service path: `backend/auth`

API base path:

```text
/api/v1/auth
```

## What This Service Handles

- Register, login, logout
- Access-token refresh
- Password reset flows
- Current user profile (`/me`)
- Delete current user account (`DELETE /me`)
- Profile updates and password change
- Local profile mirror sync to `app.user_profiles`
- Supabase user deletion webhook handling

## Local Smoke Test (via gateway)

Gateway base URL:

```text
http://localhost:8000
```

### Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-real-email@example.com",
    "password":"LunaTest!12345",
    "first_name":"Luna",
    "last_name":"Tester",
    "phone_number":"+15555550123",
    "role":"STUDENT"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-real-email@example.com",
    "password":"LunaTest!12345"
  }'
```

### Me (replace `<ACCESS_TOKEN>`)

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Refresh (replace `<REFRESH_TOKEN>`)

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<REFRESH_TOKEN>"}'
```

### Logout (replace `<ACCESS_TOKEN>`)

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Delete Account (replace `<ACCESS_TOKEN>`)

```bash
curl -X DELETE http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Supabase Notes

- Use real Supabase values in `backend/.env`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
- Use a valid test email format; some placeholder domains may be rejected.
- For faster local testing, email confirmation can be temporarily disabled in Supabase Auth settings.

## Local Profile Mirror

Successful auth/profile operations upsert local user data to:

```text
app.user_profiles
```

This allows app-domain tables to reference users in local Postgres while Supabase remains source of truth for authentication.

## Deletion Webhook

Endpoint:

```text
POST /api/v1/auth/webhooks/supabase-user-deleted
```

Required header:

```text
X-Webhook-Secret: <SUPABASE_WEBHOOK_SECRET>
```

Expected env var in `backend/.env`:

```text
SUPABASE_WEBHOOK_SECRET=<long-random-secret>
```

Supported payload shape example:

```json
{
  "type": "DELETE",
  "schema": "auth",
  "table": "users",
  "old_record": {
    "id": "user-uuid"
  }
}
```

Local dev note:
- Supabase cloud cannot reach `localhost` directly.
- Use a tunnel (for example ngrok/cloudflared) for real webhook delivery tests.
- Or simulate locally with `curl`.

## Useful Commands

From `backend/docker`:

```bash
# auth service logs
docker compose --env-file ../.env logs -f auth-service

# health
curl http://localhost:8000/api/v1/auth/health

# check mirrored users in postgres
docker compose --env-file ../.env exec -T postgres \
  psql -U luna_user -d luna_db -c "SELECT id, email, role FROM app.user_profiles;"
```
