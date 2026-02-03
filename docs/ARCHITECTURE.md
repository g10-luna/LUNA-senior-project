# LUNA System Architecture

**Last Updated:** 2025-02-03  
**Status:** Current State Documentation

---

## Table of Contents

1. [Current System Architecture](#current-system-architecture)
2. [Component Architecture](#component-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Database Schema](#database-schema)
5. [Target Architecture](#target-architecture)

---

## Current System Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph "Client Applications"
        SA[Student App<br/>luna-book-bot]
        LA[Librarian Dashboard<br/>Senior-Project-LUNA]
    end
    
    subgraph "Supabase Platform"
        Auth[Supabase Auth]
        EdgeFunc[Edge Function<br/>request-robot-navigation]
        DB[(PostgreSQL Database)]
        Realtime[Supabase Realtime]
        Storage[Supabase Storage]
    end
    
    subgraph "External Services"
        Robot[Robot Hardware<br/>Not Integrated]
    end
    
    SA -->|Direct Queries| DB
    SA -->|Authentication| Auth
    SA -->|Real-time Updates| Realtime
    SA -->|API Calls| EdgeFunc
    
    LA -->|Direct Queries| DB
    LA -->|Authentication| Auth
    LA -->|Real-time Updates| Realtime
    
    EdgeFunc -->|Service Role| DB
    EdgeFunc -.->|Future Integration| Robot
    
    style SA fill:#e1f5ff
    style LA fill:#fff4e1
    style EdgeFunc fill:#ffe1e1
    style DB fill:#e1ffe1
    style Robot fill:#f0f0f0,stroke-dasharray: 5 5
```

### Current Architecture Issues

- ❌ **No API Gateway** - Direct database access from frontend
- ❌ **No Service Layer** - Business logic in components
- ❌ **No Caching** - Every request hits database
- ❌ **Single Edge Function** - Limited backend capabilities
- ❌ **No Background Jobs** - No async task processing
- ❌ **No Load Balancing** - Single point of failure

---

## Component Architecture

### Student App (luna-book-bot)

```mermaid
graph LR
    subgraph "Student App Frontend"
        App[App.tsx<br/>Root Component]
        
        subgraph "Pages"
            Index[Index.tsx<br/>Main Page]
            Auth[Auth.tsx<br/>Authentication]
            NotFound[NotFound.tsx]
        end
        
        subgraph "Components"
            BookSearch[BookSearchResults.tsx]
            NavLink[NavLink.tsx]
            UI[UI Components<br/>49 files]
        end
        
        subgraph "Hooks"
            Toast[use-toast.ts]
            Mobile[use-mobile.tsx]
        end
        
        subgraph "Integrations"
            SupabaseClient[Supabase Client]
        end
    end
    
    App --> Index
    App --> Auth
    App --> NotFound
    
    Index --> BookSearch
    Index --> UI
    Index --> SupabaseClient
    
    Auth --> SupabaseClient
    BookSearch --> SupabaseClient
    
    style Index fill:#e1f5ff
    style SupabaseClient fill:#ffe1e1
```

### Librarian Dashboard (Senior-Project-LUNA)

```mermaid
graph LR
    subgraph "Librarian Dashboard Frontend"
        App2[App.tsx<br/>Root Component]
        
        subgraph "Pages"
            Dashboard[Dashboard.tsx]
            Catalog[Catalog.tsx]
            BookRequest[BookRequest.tsx]
            Maintenance[Maintenance.tsx]
        end
        
        subgraph "Components"
            RobotStatus[RobotStatus.tsx]
            TaskQueue[TaskQueue.tsx]
            NotificationCenter[NotificationCenter.tsx]
            LibraryCatalog[LibraryCatalog.tsx]
            BookRequestForm[BookRequestForm.tsx]
            UI2[UI Components<br/>49 files]
        end
        
        subgraph "Contexts"
            NotificationCtx[NotificationContext]
        end
        
        subgraph "Integrations"
            SupabaseClient2[Supabase Client]
        end
    end
    
    App2 --> Dashboard
    App2 --> Catalog
    App2 --> BookRequest
    App2 --> Maintenance
    
    Dashboard --> RobotStatus
    Dashboard --> TaskQueue
    Dashboard --> NotificationCenter
    Dashboard --> NotificationCtx
    
    Catalog --> LibraryCatalog
    BookRequest --> BookRequestForm
    
    Dashboard --> SupabaseClient2
    LibraryCatalog --> SupabaseClient2
    BookRequestForm --> SupabaseClient2
    
    style Dashboard fill:#fff4e1
    style SupabaseClient2 fill:#ffe1e1
```

---

## Data Flow Diagrams

### Book Request Flow (Current)

```mermaid
sequenceDiagram
    participant Student as Student App
    participant EdgeFunc as Edge Function
    participant DB as PostgreSQL
    participant Realtime as Supabase Realtime
    
    Student->>DB: Search Books (Direct Query)
    DB-->>Student: Return Books
    
    Student->>EdgeFunc: POST /request-robot-navigation
    Note over EdgeFunc: JWT Decoded (Not Verified)
    EdgeFunc->>DB: Insert robot_tasks
    EdgeFunc->>DB: Insert book_requests
    EdgeFunc-->>Student: Return Success
    
    Realtime->>Student: Notify Status Change
    Student->>DB: Fetch Updated Requests
    DB-->>Student: Return Active Requests
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Frontend App
    participant Auth as Supabase Auth
    participant DB as PostgreSQL
    
    User->>App: Login/Signup
    App->>Auth: signInWithPassword / signUp
    Auth->>DB: Verify/Create User
    Auth-->>App: Return Session + JWT
    App->>App: Store Session (localStorage)
    App->>DB: Query with JWT
    DB-->>App: Return Data (RLS Enforced)
```

### Current Issues in Data Flow

- ⚠️ **No Request Validation** - Direct database queries
- ⚠️ **No Caching** - Repeated queries for same data
- ⚠️ **No Rate Limiting** - Vulnerable to abuse
- ⚠️ **No Transaction Management** - Risk of orphaned records
- ⚠️ **No Error Recovery** - Failures not handled gracefully

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    BOOKS ||--o{ BOOK_REQUESTS : "has"
    BOOKS ||--o{ ROBOT_TASKS : "references"
    BOOK_REQUESTS ||--o| ROBOT_TASKS : "linked to"
    AUTH_USERS ||--o{ BOOK_REQUESTS : "creates"
    AUTH_USERS ||--o{ ROBOT_TASKS : "creates"
    
    BOOKS {
        uuid id PK
        text title
        text author
        text isbn
        text shelf_location
        text category
        boolean available
        timestamptz created_at
    }
    
    BOOK_REQUESTS {
        uuid id PK
        uuid book_id FK
        uuid user_id FK
        uuid robot_task_id FK
        text student_name
        text request_type
        text status
        text pickup_location
        timestamptz requested_at
        timestamptz completed_at
    }
    
    ROBOT_TASKS {
        uuid id PK
        uuid book_id FK
        uuid user_id FK
        text task_type
        text student_name
        text status
        integer priority
        text notes
        timestamptz requested_at
        timestamptz started_at
        timestamptz completed_at
    }
    
    AUTH_USERS {
        uuid id PK
        text email
        jsonb user_metadata
    }
```

### Database Indexes (Current)

- `idx_books_title` - On `books.title`
- `idx_books_author` - On `books.author`
- `idx_robot_tasks_status` - On `robot_tasks.status`
- `idx_book_requests_status` - On `book_requests.status`

**Missing Indexes:**
- ❌ Composite index on `book_requests(user_id, status)`
- ❌ Full-text search index on `books(title, author)`
- ❌ Index on `robot_tasks(user_id, status)`

---

## Target Architecture

### Recommended System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        SA2[Student App]
        LA2[Librarian Dashboard]
        Mobile[Mobile App<br/>Future]
    end
    
    subgraph "API Gateway Layer"
        Gateway[API Gateway<br/>Kong/AWS API Gateway]
        RateLimit[Rate Limiting]
        AuthMiddleware[Auth Middleware]
    end
    
    subgraph "Application Layer"
        subgraph "API Services"
            BookAPI[Book Service API]
            RequestAPI[Request Service API]
            TaskAPI[Task Service API]
            AuthAPI[Auth Service API]
        end
        
        subgraph "Background Services"
            JobQueue[Job Queue<br/>BullMQ + Redis]
            Scheduler[Cron Scheduler]
            Worker[Background Workers]
        end
    end
    
    subgraph "Data Layer"
        Cache[(Redis Cache)]
        DB2[(PostgreSQL<br/>Primary)]
        DBReplica[(PostgreSQL<br/>Read Replica)]
    end
    
    subgraph "External Services"
        Robot2[Robot Hardware API]
        Monitoring[Monitoring<br/>Sentry/DataDog]
        Logging[Logging<br/>ELK Stack]
    end
    
    SA2 --> Gateway
    LA2 --> Gateway
    Mobile --> Gateway
    
    Gateway --> RateLimit
    RateLimit --> AuthMiddleware
    AuthMiddleware --> BookAPI
    AuthMiddleware --> RequestAPI
    AuthMiddleware --> TaskAPI
    AuthMiddleware --> AuthAPI
    
    BookAPI --> Cache
    BookAPI --> DB2
    RequestAPI --> Cache
    RequestAPI --> DB2
    TaskAPI --> Cache
    TaskAPI --> DB2
    AuthAPI --> DB2
    
    BookAPI --> DBReplica
    RequestAPI --> DBReplica
    
    JobQueue --> Worker
    Scheduler --> JobQueue
    Worker --> DB2
    Worker --> Robot2
    
    BookAPI --> Monitoring
    RequestAPI --> Monitoring
    TaskAPI --> Monitoring
    
    BookAPI --> Logging
    RequestAPI --> Logging
    TaskAPI --> Logging
    
    style Gateway fill:#e1f5ff
    style Cache fill:#fff4e1
    style DB2 fill:#e1ffe1
    style JobQueue fill:#ffe1e1
    style Monitoring fill:#f0f0f0
```

### Target Architecture Benefits

- ✅ **API Gateway** - Centralized routing, rate limiting, authentication
- ✅ **Service Layer** - Separation of concerns, testable business logic
- ✅ **Caching Layer** - Reduced database load, improved performance
- ✅ **Read Replicas** - Scalable read operations
- ✅ **Background Jobs** - Async task processing, scheduled tasks
- ✅ **Monitoring** - Observability, error tracking, performance metrics
- ✅ **Horizontal Scaling** - Can scale services independently

### Service Layer Architecture

```mermaid
graph TB
    subgraph "API Layer"
        Routes[API Routes<br/>/api/v1/*]
    end
    
    subgraph "Service Layer"
        BookService[BookService]
        RequestService[RequestService]
        TaskService[TaskService]
        AuthService[AuthService]
    end
    
    subgraph "Repository Layer"
        BookRepo[BookRepository]
        RequestRepo[RequestRepository]
        TaskRepo[TaskRepository]
    end
    
    subgraph "Data Sources"
        DB3[(PostgreSQL)]
        Cache2[(Redis)]
    end
    
    Routes --> BookService
    Routes --> RequestService
    Routes --> TaskService
    Routes --> AuthService
    
    BookService --> BookRepo
    RequestService --> RequestRepo
    TaskService --> TaskRepo
    
    BookRepo --> DB3
    BookRepo --> Cache2
    RequestRepo --> DB3
    RequestRepo --> Cache2
    TaskRepo --> DB3
    TaskRepo --> Cache2
```

### Improved Data Flow (Target)

```mermaid
sequenceDiagram
    participant Student as Student App
    participant Gateway as API Gateway
    participant Service as Book Service
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant Queue as Job Queue
    participant Worker as Background Worker
    
    Student->>Gateway: GET /api/v1/books?q=search
    Gateway->>Gateway: Rate Limit Check
    Gateway->>Gateway: Auth Middleware
    Gateway->>Service: Forward Request
    
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Return Cached Data
    else Cache Miss
        Service->>DB: Query Database
        DB-->>Service: Return Data
        Service->>Cache: Store in Cache
    end
    
    Service-->>Gateway: Return Response
    Gateway-->>Student: Return Books
    
    Student->>Gateway: POST /api/v1/requests
    Gateway->>Service: Forward Request
    Service->>Service: Validate Request
    Service->>DB: Begin Transaction
    Service->>DB: Insert robot_task
    Service->>DB: Insert book_request
    Service->>DB: Commit Transaction
    Service->>Queue: Enqueue Task
    Service-->>Gateway: Return Success
    Gateway-->>Student: Return Response
    
    Queue->>Worker: Process Task
    Worker->>DB: Update Status
    Worker->>Cache: Invalidate Cache
```

---

## Migration Path

### Phase 1: Foundation (Weeks 1-2)
1. Set up API Gateway
2. Create service layer structure
3. Implement basic caching
4. Add monitoring/logging

### Phase 2: Refactoring (Weeks 3-6)
1. Migrate direct DB calls to services
2. Implement repository pattern
3. Add background job processing
4. Set up read replicas

### Phase 3: Optimization (Weeks 7-10)
1. Database optimization (indexes, queries)
2. Performance tuning
3. Horizontal scaling setup
4. Load testing and optimization

### Phase 4: Enhancement (Ongoing)
1. API versioning
2. Advanced caching strategies
3. Microservices extraction (if needed)
4. Continuous monitoring and improvement

---

## Technology Stack

### Current Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase Edge Functions (Deno)
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **State Management:** React Query (TanStack Query)
- **UI Components:** Radix UI, shadcn/ui

### Target Stack Additions
- **API Gateway:** Kong / AWS API Gateway
- **Caching:** Redis
- **Job Queue:** BullMQ
- **Monitoring:** Sentry / DataDog
- **Logging:** ELK Stack / CloudWatch
- **API Documentation:** OpenAPI/Swagger

---

## Notes

- This architecture document should be updated as the system evolves
- All diagrams use Mermaid syntax and render automatically on GitHub
- For detailed technical debt items, see [TECHNICAL_DEBT_ASSESSMENT.md](./TECHNICAL_DEBT_ASSESSMENT.md)
