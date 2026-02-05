# Architecture Explanation
## How the LUNA System Works End-to-End

**Last Updated:** 2025-02-03

---

## Overview

LUNA (Library User Navigation Assistant) is a library automation system that helps students find and request books, while providing librarians with tools to manage the library catalog and monitor robot operations. The system consists of two main applications: a **Student App** for book discovery and requests, and a **Librarian Dashboard** for catalog management and system monitoring.

---

## System Components

### 1. Student Application (`luna-book-bot`)

**Purpose:** Allows students to search for books, request robot navigation assistance, and track their book requests.

**Key Features:**
- Book search and catalog browsing
- Book request creation
- Real-time request status tracking
- Request history viewing

### 2. Librarian Dashboard (`Senior-Project-LUNA`)

**Purpose:** Provides librarians with tools to manage the library catalog, monitor robot status, and view system metrics.

**Key Features:**
- Library catalog management (CRUD operations)
- Robot status monitoring
- Task queue management
- Maintenance log viewing
- System health metrics

### 3. Backend Infrastructure (Supabase)

**Components:**
- **PostgreSQL Database:** Stores books, requests, and robot tasks
- **Supabase Auth:** Handles user authentication and authorization
- **Supabase Realtime:** Provides real-time updates via WebSocket subscriptions
- **Edge Functions:** Serverless functions for server-side operations (currently only one: `request-robot-navigation`)

---

## End-to-End User Flows

### Flow 1: Student Requests Book Navigation

**Step-by-Step Process:**

1. **Student Opens App**
   - Student navigates to the Student App
   - App checks authentication status via Supabase Auth
   - If not authenticated, redirects to login/signup page

2. **Student Searches for Book**
   - Student enters search query (title, author, or ISBN)
   - Frontend directly queries PostgreSQL database via Supabase client:
     ```typescript
     supabase.from('books')
       .select('*')
       .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
     ```
   - Results displayed to student

3. **Student Requests Navigation**
   - Student clicks "Show Me Where" on a book
   - Frontend calls Edge Function: `request-robot-navigation`
   - Edge Function:
     - Decodes JWT token (currently without verification - **security issue**)
     - Validates request (bookId, studentName)
     - Fetches book details from database
     - Creates `robot_tasks` record (non-transactional - **reliability issue**)
     - Creates `book_requests` record linked to robot task
     - Returns success response

4. **Request Status Updates**
   - Frontend subscribes to Supabase Realtime for `book_requests` table changes
   - When status changes, frontend automatically refreshes active requests
   - Student sees status updates: `pending` → `robot_navigating` → `ready` → `completed`

5. **Status Progression (Current Implementation)**
   - **Note:** Currently uses simulated auto-processing with random delays
   - Status automatically advances after random intervals (5-35 seconds)
   - This is **mock behavior** and needs to be replaced with real robot integration

**Current Issues:**
- ⚠️ Direct database queries from frontend (no API layer)
- ⚠️ JWT decoded without verification (security vulnerability)
- ⚠️ Non-transactional database writes (risk of orphaned records)
- ⚠️ Simulated status updates (not connected to real robot)

---

### Flow 2: Librarian Manages Catalog

**Step-by-Step Process:**

1. **Librarian Opens Dashboard**
   - Librarian navigates to Librarian Dashboard
   - Authenticates via Supabase Auth
   - Dashboard loads with multiple views

2. **Catalog Management**
   - Librarian navigates to Catalog page
   - Frontend queries all books directly from database:
     ```typescript
     supabase.from('books').select('*').order('title')
     ```
   - Librarian can:
     - **Add Book:** Inserts new book record directly to database
     - **Update Availability:** Toggles `available` field
     - **Delete Book:** Removes book record (CASCADE deletes related requests)

3. **Robot Monitoring**
   - Dashboard displays robot status (currently **simulated data**)
   - Shows battery level, current location, active tasks
   - Task queue displays pending, in-progress, and completed tasks
   - **Note:** All robot data is currently hardcoded/simulated

4. **Maintenance Viewing**
   - Displays system health metrics (currently **hardcoded**)
   - Shows maintenance logs (currently **hardcoded**)
   - **Note:** No real integration with robot hardware

**Current Issues:**
- ⚠️ Direct database writes from frontend (no service layer)
- ⚠️ No validation layer (data integrity risk)
- ⚠️ Simulated robot data (not production-ready)
- ⚠️ No real-time updates from actual robot hardware

---

### Flow 3: Authentication & Authorization

**Step-by-Step Process:**

1. **User Registration/Login**
   - User enters email and password
   - Frontend calls Supabase Auth:
     ```typescript
     supabase.auth.signUp({ email, password })
     // or
     supabase.auth.signInWithPassword({ email, password })
     ```
   - Supabase Auth:
     - Validates credentials
     - Creates/verifies user in `auth.users` table
     - Generates JWT token
     - Returns session with user metadata

2. **Session Management**
   - JWT token stored in `localStorage`
   - Supabase client automatically includes token in all requests
   - Token used for:
     - Database queries (RLS policies enforce access)
     - Edge function authentication

3. **Row Level Security (RLS)**
   - Database enforces access control via RLS policies
   - Students can only view/update their own requests
   - Librarians (authenticated users) have broader access
   - Policies defined in migration files

**Current Issues:**
- ⚠️ Edge function bypasses RLS using service role key
- ⚠️ JWT verification in edge function is incomplete
- ⚠️ No role-based access control (RBAC) system

---

## Data Flow Architecture

### Current Architecture (As-Is)

```
┌─────────────────┐
│  Student App    │
│  (React + Vite)  │
└────────┬─────────┘
         │
         ├─── Direct Queries ───┐
         │                       │
         ├─── Auth ──────────────┤
         │                       ▼
         └─── Realtime ──────┐  ┌──────────────────┐
                             │  │   Supabase      │
┌─────────────────┐          │  │   Platform      │
│ Librarian       │          │  │                 │
│ Dashboard       │──────────┼─▶│  - PostgreSQL   │
│ (React + Vite)  │          │  │  - Auth         │
└─────────────────┘          │  │  - Realtime     │
                              │  │  - Edge Func    │
                              │  └──────────────────┘
                              │
                              └─── WebSocket ────┐
                                                  │
                                                  ▼
                                            Real-time Updates
```

### Key Characteristics:

1. **Frontend-Direct Database Access**
   - Both apps query database directly via Supabase client
   - No API layer or service abstraction
   - Business logic embedded in React components

2. **Single Edge Function**
   - Only one serverless function: `request-robot-navigation`
   - Handles robot task creation
   - Uses service role key (bypasses RLS)

3. **Real-time Updates**
   - Supabase Realtime provides WebSocket connections
   - Frontend subscribes to table changes
   - Automatic UI updates when data changes

4. **No Caching**
   - Every request hits the database
   - No Redis or client-side caching strategy
   - Repeated queries for same data

---

## Database Schema & Relationships

### Core Entities

**Books Table**
- Stores library catalog information
- Fields: `id`, `title`, `author`, `isbn`, `shelf_location`, `category`, `available`
- Public read access (anyone can search)
- Librarians can modify

**Book Requests Table**
- Tracks student book requests
- Fields: `id`, `book_id`, `user_id`, `robot_task_id`, `status`, `requested_at`, `completed_at`
- Linked to `books` and `robot_tasks`
- RLS: Students can only see their own requests

**Robot Tasks Table**
- Queue of tasks for robot to execute
- Fields: `id`, `book_id`, `user_id`, `task_type`, `status`, `priority`, `notes`
- Linked to `books` and `book_requests`
- RLS: Students can only see their own tasks

### Relationships

```
books (1) ────< (many) book_requests
books (1) ────< (many) robot_tasks
book_requests (many) ────< (1) robot_tasks
auth.users (1) ────< (many) book_requests
auth.users (1) ────< (many) robot_tasks
```

**Cascade Behavior:**
- Deleting a book cascades to delete related requests and tasks
- This ensures data integrity but may cause unintended data loss

---

## Real-time Updates Mechanism

### How It Works

1. **Frontend Subscription**
   ```typescript
   const channel = supabase
     .channel('book-requests-changes')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'book_requests'
     }, () => {
       fetchActiveRequests(); // Refresh data
     })
     .subscribe();
   ```

2. **Database Changes**
   - When any row in `book_requests` is inserted/updated/deleted
   - Supabase Realtime detects the change
   - Broadcasts change to all subscribed clients

3. **Frontend Response**
   - Receives change notification
   - Refetches data from database
   - Updates UI with new data

**Current Limitations:**
- ⚠️ Refetches entire dataset (not efficient)
- ⚠️ No optimistic updates
- ⚠️ No conflict resolution

---

## Authentication Flow

### Login Process

1. User enters credentials
2. Frontend calls `supabase.auth.signInWithPassword()`
3. Supabase validates against `auth.users` table
4. If valid, returns:
   - JWT access token
   - Refresh token
   - User metadata
5. Frontend stores tokens in `localStorage`
6. All subsequent requests include JWT in `Authorization` header

### Authorization (RLS)

**How RLS Works:**
- Each database query includes user context from JWT
- PostgreSQL evaluates RLS policies before returning data
- Policies check `auth.uid()` against row's `user_id`
- Only matching rows are returned

**Example Policy:**
```sql
CREATE POLICY "Users can view their own book requests"
ON book_requests FOR SELECT
USING (auth.uid() = user_id);
```

**Current Issues:**
- ⚠️ Edge function uses service role (bypasses RLS)
- ⚠️ Some policies are too permissive (e.g., "Anyone can view books")
- ⚠️ No role-based differentiation (all authenticated users treated same)

---

## Current System Limitations

### 1. No API Layer
- **Problem:** Business logic in frontend components
- **Impact:** Difficult to test, maintain, and scale
- **Solution Needed:** Extract to service layer

### 2. Direct Database Access
- **Problem:** Frontend queries database directly
- **Impact:** Tight coupling, security concerns, no caching
- **Solution Needed:** API gateway with service layer

### 3. Simulated Data
- **Problem:** Robot status, tasks, and metrics are hardcoded
- **Impact:** Not production-ready, misleading functionality
- **Solution Needed:** Real robot API integration

### 4. No Caching
- **Problem:** Every request hits database
- **Impact:** Poor performance, high database load
- **Solution Needed:** Redis caching layer

### 5. Non-Transactional Operations
- **Problem:** Multiple database writes without transactions
- **Impact:** Risk of orphaned records, data inconsistency
- **Solution Needed:** Database transactions or RPC functions

### 6. Security Vulnerabilities
- **Problem:** JWT not verified, CORS wildcard, service role exposure
- **Impact:** Potential unauthorized access, data breaches
- **Solution Needed:** Proper JWT verification, restricted CORS, RLS usage

---

## How Components Interact

### Student App Component Flow

```
App.tsx (Root)
  ├── QueryClientProvider (React Query)
  ├── BrowserRouter (Routing)
  └── Routes
      ├── Index.tsx (Main Page)
      │   ├── BookSearchResults.tsx
      │   │   └── Calls Edge Function
      │   ├── Active Requests List
      │   │   └── Subscribes to Realtime
      │   └── Direct Supabase Queries
      └── Auth.tsx
          └── Supabase Auth
```

### Librarian Dashboard Component Flow

```
App.tsx (Root)
  ├── QueryClientProvider
  ├── NotificationProvider
  ├── BrowserRouter
  └── Routes
      ├── Dashboard.tsx
      │   ├── RobotStatus.tsx (Simulated)
      │   ├── TaskQueue.tsx (Simulated)
      │   └── NotificationCenter.tsx
      ├── Catalog.tsx
      │   └── LibraryCatalog.tsx
      │       └── Direct CRUD Operations
      └── Maintenance.tsx
          ├── RobotHealthMetrics.tsx (Hardcoded)
          └── MaintenanceLogViewer.tsx (Hardcoded)
```

---

## Data Persistence

### How Data is Stored

1. **User Data**
   - Stored in Supabase `auth.users` table
   - Managed by Supabase Auth
   - Includes email, password hash, metadata

2. **Application Data**
   - Books, requests, tasks stored in PostgreSQL
   - Managed via Supabase client
   - RLS policies enforce access control

3. **Session Data**
   - JWT tokens in `localStorage` (browser)
   - No server-side session storage
   - Stateless authentication

### Data Consistency

**Current Approach:**
- Database foreign keys ensure referential integrity
- CASCADE deletes maintain consistency
- No application-level transaction management

**Issues:**
- ⚠️ No optimistic locking
- ⚠️ No conflict resolution
- ⚠️ Race conditions possible in concurrent updates

---

## Error Handling

### Current Error Handling

1. **Frontend**
   - Try-catch blocks in some places
   - Console.error for logging (should be removed)
   - Toast notifications for user feedback
   - No error boundaries (React)

2. **Backend (Edge Function)**
   - Try-catch with error responses
   - Console.error for logging
   - Returns HTTP error codes

**Issues:**
- ⚠️ Inconsistent error handling patterns
- ⚠️ No centralized error logging
- ⚠️ No error recovery mechanisms
- ⚠️ Generic error messages

---

## Performance Characteristics

### Current Performance

1. **Database Queries**
   - Every search hits database
   - No query result caching
   - Limited indexes (only basic ones)
   - No query optimization

2. **Frontend Rendering**
   - React Query provides some caching
   - No code splitting mentioned
   - Large component files (587 lines)

3. **Real-time Updates**
   - WebSocket connections maintained
   - Full data refetch on changes (inefficient)
   - No incremental updates

**Bottlenecks:**
- Database becomes bottleneck under load
- No horizontal scaling capability
- Single edge function handles all server-side logic

---

## Security Model

### Current Security

1. **Authentication**
   - Supabase Auth handles user authentication
   - JWT tokens for session management
   - Password hashing handled by Supabase

2. **Authorization**
   - Row Level Security (RLS) policies
   - User-based access control
   - Service role bypasses RLS (security risk)

3. **Data Protection**
   - HTTPS for all connections
   - Environment variables for secrets
   - No `.env` in `.gitignore` (risk)

**Vulnerabilities:**
- ⚠️ JWT not verified in edge function
- ⚠️ CORS allows any origin
- ⚠️ Service role key exposure risk
- ⚠️ No rate limiting
- ⚠️ No input validation/sanitization

---

## Summary

The LUNA system is a **frontend-heavy architecture** with minimal backend infrastructure. The two React applications communicate directly with Supabase (database, auth, realtime) with only one edge function for server-side operations. While this provides rapid development, it creates several challenges:

1. **Scalability:** Direct database access doesn't scale well
2. **Security:** Multiple vulnerabilities in authentication and authorization
3. **Maintainability:** Business logic scattered in components
4. **Reliability:** No transaction management, simulated data
5. **Performance:** No caching, inefficient queries

The system needs significant architectural improvements to be production-ready, as detailed in the [Technical Debt Assessment](./TECHNICAL_DEBT_ASSESSMENT.md) and [Architecture](./ARCHITECTURE.md) documents.

---

## Next Steps

For a detailed view of recommended improvements, see:
- [Technical Debt Assessment](./TECHNICAL_DEBT_ASSESSMENT.md) - Complete list of issues and remediation plans
- [Architecture](./ARCHITECTURE.md) - Visual diagrams and target architecture
