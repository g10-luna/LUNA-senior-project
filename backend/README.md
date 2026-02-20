# LUNA Backend

This directory contains the backend implementation for the LUNA (Library User Navigation Assistant) system.

## Directory Layout

The backend follows a service-oriented architecture with the following structure:

```
backend/
├── auth/           # Authentication Service
│                   # Base path: /api/v1/auth
│                   # Responsibilities: Register, login, logout, refresh, forgot-password, reset-password, /me, change-password
│
├── book/           # Book Service
│                   # Base path: /api/v1/books
│                   # Responsibilities: CRUD, search/list, availability; bulk-import (Librarian)
│
├── delivery/       # Delivery Service
│                   # Base path: /api/v1/requests, /api/v1/returns, /api/v1/deliveries
│                   # Responsibilities: Student requests/returns; librarian delivery management; task lifecycle
│
├── robot/          # Robot Service
│                   # Base path: /api/v1/robot
│                   # Responsibilities: Robot status, task queue, emergency-stop, waypoints CRUD
│
├── notification/   # Notification Service
│                   # Base path: /api/v1/notifications
│                   # Responsibilities: List, read, read-all, delete; preferences; WebSocket for real-time events
│
├── shared/         # Shared code
│                   # Contains: DB connection, Redis client, JWT utilities, RBAC middleware, Pydantic schemas
│
├── nginx/          # Nginx configuration
│                   # API Gateway config for routing /api/v1/* to corresponding service containers
│
└── docker/         # Docker configuration
                    # Dockerfiles and docker-compose files for local development
```

## Implementation Details

For detailed implementation specifications, service responsibilities, API contracts, and development guidelines, see:

**[Backend Implementation Design](../System%20Design/BACKEND_IMPLEMENTATION_DESIGN.md)**

This document covers:
- Service implementation outlines
- Data layer architecture
- API layer implementation
- Message queue & Celery setup
- Real-time WebSocket implementation
- Security implementation
- Testing strategy
- Docker Compose configuration

## Technology Stack

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **Cache/Broker:** Redis
- **Message Queue:** Celery
- **API Gateway:** Nginx
- **ORM:** SQLAlchemy
- **Migrations:** Alembic

## Quick Start

Get the backend running locally in 5 steps:

```bash
# 1. Create and activate virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Start database and Redis (using Docker)
cd docker
docker compose up -d

# 5. Start the Auth service (Hello API)
cd ../auth
python main.py
# Visit http://localhost:8001/docs to see the API
```

## Development

### Prerequisites

- **Python 3.12+** (or latest 3.x) - Check with `python3 --version`
- **Docker and Docker Compose** - For local Postgres and Redis (or install them locally)
- **Git** - For version control

### Detailed Setup Instructions

#### 1. Create Virtual Environment

Create an isolated Python environment for this project:

```bash
cd backend
python3 -m venv venv
```

This creates a `venv/` directory with its own Python interpreter and package installation space.

**Verify it worked:**
```bash
ls -la venv/  # Should show bin/, lib/, etc.
```

#### 2. Activate Virtual Environment

Activate the virtual environment so all Python commands use packages from `venv/`:

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

**Verify activation:** Your terminal prompt should show `(venv)` at the beginning.

**To deactivate later:** Simply run `deactivate`

#### 3. Install Dependencies

Install all required Python packages:

```bash
pip install --upgrade pip  # Ensure pip is up to date
pip install -r requirements.txt
```

This installs:
- FastAPI and Uvicorn (web framework and server)
- SQLAlchemy and Alembic (database ORM and migrations)
- PostgreSQL drivers (asyncpg, psycopg2-binary)
- Redis client
- Celery (message queue)
- Authentication libraries (python-jose, passlib)
- And other dependencies listed in `requirements.txt`

**Verify installation:**
```bash
pip list  # Should show all installed packages
python -c "import fastapi, sqlalchemy, redis, celery; print('✓ Dependencies OK')"
```

#### 4. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Edit `.env` file** and update these required values:

- **`DATABASE_URL`** - PostgreSQL async connection string
  - If using Docker Compose: `postgresql+asyncpg://luna_user:luna_password@localhost:5432/luna_db`
  - If using local Postgres: Replace with your database credentials
  
- **`DATABASE_URL_SYNC`** - PostgreSQL sync connection (for migrations)
  - If using Docker Compose: `postgresql://luna_user:luna_password@localhost:5432/luna_db`
  - Must match DATABASE_URL credentials but without `+asyncpg`

- **`REDIS_URL`** - Redis connection string
  - Default: `redis://localhost:6379/0`

- **`JWT_SECRET_KEY`** - Generate a secure random string:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
  Copy the output and paste it as the `JWT_SECRET_KEY` value.

**Note:** The `.env` file is gitignored and won't be committed to version control.

#### 5. Start Local Database and Redis

Using Docker Compose (recommended):

```bash
cd docker
docker compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`

To stop:
```bash
docker compose down
```

To view logs:
```bash
docker compose logs -f
```

**Alternative:** If you have Postgres and Redis installed locally, update `.env` with your connection strings and skip this step.

#### 6. Run Database Migrations

**Note:** This step is for when database models and migrations are implemented. Skip for now if you're just testing the Hello API.

Once database models are created, set up Alembic migrations:

```bash
# Initialize Alembic (first time only - creates alembic/ directory)
alembic init alembic

# Configure alembic.ini to use DATABASE_URL_SYNC from .env
# Edit alembic/env.py to load environment variables

# Create a migration from your models
alembic revision --autogenerate -m "Initial migration"

# Apply migrations to create database tables
alembic upgrade head

# Check migration status
alembic current
alembic history
```

**Common migration commands:**
- `alembic upgrade head` - Apply all pending migrations
- `alembic downgrade -1` - Rollback last migration
- `alembic revision -m "description"` - Create empty migration file

#### 7. Start a Service

**Start the Auth Service (Hello API example):**

From the `backend/` directory:

```bash
# Option 1: Run the service directly
cd auth
python main.py
```

**Or** using uvicorn directly (recommended for development):

```bash
# From backend/ directory
uvicorn auth.main:app --host 0.0.0.0 --port 8001 --reload
```

The `--reload` flag enables auto-reload on code changes (useful for development).

**Verify the service is running:**

The service will be available at:
- **API Root:** http://localhost:8001/
- **Health Check:** http://localhost:8001/health
- **Interactive API Docs:** http://localhost:8001/docs (Swagger UI)
- **Alternative Docs:** http://localhost:8001/redoc (ReDoc)

**Test the API:**
```bash
# Using curl
curl http://localhost:8001/
curl http://localhost:8001/health

# Or visit http://localhost:8001/docs in your browser
```

**Start other services similarly:**
```bash
# Book Service
uvicorn book.main:app --host 0.0.0.0 --port 8002 --reload

# Delivery Service
uvicorn delivery.main:app --host 0.0.0.0 --port 8003 --reload

# Robot Service
uvicorn robot.main:app --host 0.0.0.0 --port 8004 --reload

# Notification Service
uvicorn notification.main:app --host 0.0.0.0 --port 8005 --reload
```

**Running multiple services:** Open separate terminal windows/tabs for each service, or use a process manager like `tmux` or `screen`.

#### 8. Full Stack with Docker Compose (Future)

**Current Status:** The `docker/docker-compose.yml` file currently only includes PostgreSQL and Redis. The full stack configuration will be added when all services are implemented.

**When ready**, you'll be able to run the complete stack:

```bash
cd docker
docker compose -f docker-compose.full.yml up
```

Or in detached mode (background):
```bash
docker compose -f docker-compose.full.yml up -d
```

This will start all 9 containers:
- **Nginx** (API Gateway) - Port 8000
- **Auth Service** - Port 8001
- **Book Service** - Port 8002
- **Delivery Service** - Port 8003
- **Robot Service** - Port 8004
- **Notification Service** - Port 8005
- **PostgreSQL** - Port 5432
- **Redis** - Port 6379
- **Celery Worker** - Background worker for async tasks

**View logs:**
```bash
docker compose -f docker-compose.full.yml logs -f
```

**Stop all containers:**
```bash
docker compose -f docker-compose.full.yml down
```

**Note:** Each service will need a Dockerfile before this can work. See the Backend Implementation Design for details.

### Verification Checklist

After setup, verify everything works:

- [ ] Virtual environment is activated (prompt shows `(venv)`)
- [ ] Dependencies installed: `pip list | grep fastapi`
- [ ] `.env` file exists and has correct values
- [ ] Docker containers running: `docker compose ps` (should show postgres and redis)
- [ ] Database accessible: `docker compose exec postgres psql -U luna_user -d luna_db -c "SELECT 1;"`
- [ ] Redis accessible: `docker compose exec redis redis-cli ping` (should return `PONG`)
- [ ] Auth service starts: `uvicorn auth.main:app --port 8001`
- [ ] API responds: `curl http://localhost:8001/health` returns `{"status":"healthy"}`

### Development Workflow

Daily development workflow:

1. **Activate virtual environment:** `source venv/bin/activate`
2. **Start database/Redis:** `cd docker && docker compose up -d`
3. **Check migrations:** `alembic upgrade head` (if models exist)
4. **Start services:** `uvicorn <service>.main:app --reload`
5. **Make changes** and test
6. **Run tests:** `pytest`
7. **Stop services:** `Ctrl+C` in service terminal
8. **Stop database/Redis:** `cd docker && docker compose down` (optional, can leave running)

### Troubleshooting

**Database connection errors:**
- Ensure Docker containers are running: `docker compose ps`
- Check `.env` file has correct `DATABASE_URL`
- Verify PostgreSQL is healthy: `docker compose logs postgres`

**Redis connection errors:**
- Check Redis is running: `docker compose ps`
- Verify `REDIS_URL` in `.env` matches Docker Compose port

**Port already in use:**
- Change port in `.env` or stop the conflicting service
- Check what's using the port: `lsof -i :8001` (macOS/Linux)

### Additional Resources

See the [Backend Implementation Design](../System%20Design/BACKEND_IMPLEMENTATION_DESIGN.md) document for:
- Implementation order
- Service dependencies
- Testing strategies
- API contracts
