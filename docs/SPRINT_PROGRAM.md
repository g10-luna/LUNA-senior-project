# LUNA Program Sprint — All Teams

**Period:** Spring 2026 (adjust per course calendar)  
**Purpose:** One sprint plan that **combines** (a) **vertical integration** work—discovery, catalog, and student/librarian UIs on a stable gateway—with (b) **operational E2E** work—delivery and return tasks, robot pipeline handoffs, and trustworthy status everywhere. Use it for cross-team stand-ups and demo planning.

**System context:** [System Design/SYSTEM_DESIGN.md](../System%20Design/SYSTEM_DESIGN.md)

---

## Program sprint goal

**Ship a coherent MVP slice** that is credible in a demo **and** maintainable in the repo:

1. **Discovery & catalog** — Students can **find books** and see **accurate availability**; librarians can **maintain catalog** behavior that matches the **books API** (not a one-off UI shim).
2. **Delivery & return operations** — **Request → task → preparation → robot execution → completion** (and the **return** analog) runs through **backend state**, not ad-hoc DB edits, with **explicit gates** where staff must confirm reality (e.g. **book placed before motion**).
3. **Single source of truth for tasks** — One **authoritative state model** and **consistent labels** across mobile, dashboard (including map/maintenance views where applicable), and services—no contradictory “stuck” vs “done.”
4. **Robot integration** — Bridge and backend **agree on contracts**; the **full pipeline** from **order intake** to **reported completion** is exercised, using **hardware or simulation** with the same transitions and payloads.
5. **Session & real-time UX** — **Auth** (refresh, 401, logout, roles) is dependable; **task/robot status** reaches users via **push/WebSocket where implemented**, with **polling or refresh fallbacks** so demos do not depend on a perfect socket layer.
6. **Integration discipline** — Teams share **frozen contracts** for the sprint, **env examples** stay current, and **one vertical checklist** proves mobile + backend + dashboard (and robot/sim) together—not only isolated service tests.

**Success snapshot:** Scripted **request + delivery + return + catalog touch** in one pass; **known issues** triaged; **simulation or manual fallbacks** documented where hardware is uncertain.

---

## Teams at a glance

| Track | Primary code / docs | Main users |
|--------|---------------------|------------|
| **Mobile** | `mobile/` | Students |
| **Backend** | `backend/` | All clients |
| **Web Dashboard** | `web-dashboard/` | Librarians / staff |
| **Robot** | `robot/` | Field / integration |

---

## Robot: full pipeline (order → delivery → closure)

Robot work must cover the **operational chain**, not only “the bridge calls `/api/v1/robot` once.”

| Stage | What must be true | Notes |
|-------|-------------------|--------|
| **1. Order intake** | A student request (or staff workflow) creates **delivery work** with a **stable task id** in the backend. | Prefer **idempotent** APIs so mobile retries do not duplicate tasks. |
| **2. Staff preparation** | **Book placed** (or equivalent) is recorded **before** the robot is allowed to proceed. | Enforce in **API + bridge**, not only in the dashboard UI. |
| **3. Dispatch** | Backend and bridge share **commands / targets / status** vocabulary; task enters **in progress** when appropriate. | Lock payloads early in the sprint. |
| **4. Progress** | Bridge **reports** progress; backend remains **canonical**; clients **render the same phase** for the same task. | Reconnect and **out-of-order** updates need a simple rule (timestamps, sequence, or “latest wins” for terminal states). |
| **5. Completion** | Terminal **success/failure** is visible; **student confirms received** where the product requires it. | Mirror discipline for **return pickup** and **librarian closeout**. |
| **6. Return path** | **Initiate → pickup → confirmations → close/validate** with the **same state rigor** as delivery. | Same enum/mapping layer as delivery where possible. |

**Hardware vs simulation:** Prefer **simulation parity** (same JSON, same transitions) when TurtleBot or network access is scarce; state explicitly in the runbook what ran **live** vs **sim** for reviewers.

---

## Mobile — sprint goal & backlog

**Goal:** Student flows support the **E2E narrative** (request, track, confirm; return path as designed) **and** stay **maintainable**: discovery/home/search aligned to backend, navigation stable, auth solid.

| Priority | Backlog candidate | Notes |
|----------|-------------------|--------|
| P0 | **Request / return / my tasks** wired to real APIs | Status screens must match backend task model; test unhappy paths (empty, error, retry). |
| P0 | **Auth**: login, session restore, **401 → refresh or logout**, role-appropriate routing | Align with `AuthContext` / `mobile/src/services/auth.ts`; avoid duplicate refresh calls. |
| P0 | **Home ↔ search ↔ detail** regression | Params, back stack, keyboard; [HOMEPAGE_PLAN.md](../mobile/docs/HOMEPAGE_PLAN.md). |
| P1 | **Search module** quality pass | [search-refactor-vibe.md](search-refactor-vibe.md), evidence under `docs/evidence/search-refactor/`. |
| P1 | **Map / browse** interactions | Panning, scroll/drag, safe areas, tab bar. |
| P1 | **Real-time or polling** for task status | Whatever backend exposes this sprint; UI must not lie if the socket drops. |
| P2 | **Tests** for critical hooks (optional) | e.g. search controller debounce; prioritize integration smoke over unit breadth. |

**Track risks:** API drift; **merge contention** on `mobile/app/(tabs)/`; **platform-specific** gestures; double-submit creating duplicate requests.

---

## Backend — sprint goal & backlog

**Goal:** Gateway and core services are **demo-stable**: auth, books, delivery/return, and robot-facing APIs **match what clients ship**, with a **clear task state machine** and **observable failures**.

| Priority | Backlog candidate | Notes |
|----------|-------------------|--------|
| P0 | **Smoke** gateway: `/health`, `/api/v1/auth`, `/api/v1/books`, delivery/return routes in use | [backend/README.md](../backend/README.md), Docker env hostnames. |
| P0 | **Task lifecycle** implemented once | Explicit transitions; document **enum**; reject illegal jumps; consider **idempotency** on create. |
| P0 | **Book-placed (or equivalent) gate** enforced server-side | Robot must not start delivery without it. |
| P1 | **Catalog contract** stable for mobile + dashboard | Search, filters, discover/suggestions if clients call them—coordinate renames. |
| P1 | **Robot API** payloads stable for bridge | Version or document breaking changes in the same PR. |
| P1 | **Workers / queues** (if used) visible in ops | Stuck “pending” tasks often trace to Celery/redis down. |
| P2 | **Integration tests** | Token expiry, concurrent updates, **duplicate submit**, illegal state transition. |

**Track risks:** **schema drift**; Supabase/auth edge cases ([backend/auth/README.md](../backend/auth/README.md)); async **worker** outages; undocumented **`.env`** variables.

---

## Web Dashboard — sprint goal & backlog

**Goal:** Librarians can run **catalog** and **task** work against **real APIs**, with **honest loading/error states** and **same task truth** as mobile.

| Priority | Backlog candidate | Notes |
|----------|-------------------|--------|
| P0 | **Env + API** wiring | `VITE_API_BASE_URL`, CORS, restart after `.env` changes. |
| P0 | **Catalog**: search, availability updates, add/delete aligned to books API | Match contract for CatalogScreen / top bar flows you already use. |
| P0 | **Task queue / deliveries** | Create/confirm steps that the backend supports; **map/maintenance** views use **shared status mapping**. |
| P1 | **Robot / safety** surfacing | E-stop or error path to backend (simulated acceptable when hardware absent). |
| P1 | **Auth & roles** | Librarian vs admin behavior; session expiry. |
| P1 | **Real-time or polling** for boards | Fallback UX when WS unavailable. |
| P2 | **Demo script sections** | Operator steps mirrored in UI labels (what to click, what to expect). |

**Track risks:** **Blocked** on missing endpoints; **Vite env** confusion; **CORS/mixed content** in non-local deploys.

---

## Robot — sprint goal & backlog

**Goal:** **Full pipeline readiness**: bridge talks to the **right** robot endpoints, respects **gates**, survives **disconnect**, and can be **demoed** on hardware **or** sim without faking state in the database.

| Priority | Backlog candidate | Notes |
|----------|-------------------|--------|
| P0 | **Repro env** | [robot/README.md](../robot/README.md) scenarios (Pi vs dev/sim machine). |
| P0 | **Contract tests** with backend | Poll/report shapes, auth if any, error codes. |
| P0 | **“Book placed” / start order** respected | No motion until backend says it is allowed. |
| P1 | **Progress + completion** postbacks | Backend task moves to terminal states correctly. |
| P1 | **Retries** on transient network failure | Define max retries and “failed” terminal state. |
| P2 | **E-stop / fault** path | At least one **end-to-end** path to dashboard visibility (sim ok). |

**Track risks:** **Hardware and Wi-Fi**; ROS **distro** skew; **bridge/backend** deploy mismatch; lab access on demo day.

---

## Program-wide priorities (cross-team backlog)

Use this when ordering work that **touches every repo**:

| Theme | Candidates |
|--------|------------|
| **E2E delivery** | Request → task → **book-placed** → robot progress → complete → **student confirmation** (mobile + backend + dashboard). |
| **E2E return** | Initiate → pickup → confirmations → **librarian close/validate** with legal state transitions only. |
| **One task truth** | Shared enum/mapper (or generated types); **two-client test** (mobile + web same task id). |
| **Real-time path** | WebSocket/events if ready; **polling + pull-to-refresh** as safety net; handle **out-of-order** events. |
| **Auth everywhere** | Single-flight refresh, clean logout, role checks across mobile and web. |
| **Hardening** | Idempotent creates where duplicates hurt; **correlation id** in logs across gateway→services; **simulated robot** mode for demos. |
| **NFR / demo** | Integration tests for expiry, interruption, duplicate action, **race** on status update; **seeded data**, **runbook**, **logistics** (power, network, who runs the bot). |

---

## Risks and dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Contract drift** | Clients break on enum/shape changes. | Early **freeze**; shared types or OpenAPI; breaking changes in one coordinated PR. |
| **Split task state** | Users see conflicting status. | One state machine; shared mapping; acceptance test **same task, two surfaces**. |
| **Auth / refresh races** | Logout loops or duplicate refresh. | **Single-flight** refresh; centralized HTTP layer on each client. |
| **Real-time gap** | Stale UI if WS late or broken. | **Polling fallback**; visible “last updated”; manual refresh. |
| **Robot / network** | E2E blocked on hardware day. | **Simulation parity** + documented **fallback** demo path. |
| **Safety bypass** | Motion without **book-placed**. | **Server + bridge** enforcement, not UI-only. |
| **Scope** | Too many FRs for one sprint. | Prioritize **student request/return visibility**, **librarian task + catalog**, **robot pipeline**, and **auth**; defer polish that does not change the narrative. |
| **Async workers down** | Tasks never leave pending. | Health check in ops; show meaningful error to staff if possible. |
| **Deploy skew** | Bridge and API **version mismatch** weird failures. | Pin compatible revisions or document **demo SHA set**. |

---

## Suggested 14-day cadence (AI-assisted)

We intend to finish the sprint in **14 days**. The intent is **contracts first**, then **both flows + robot integration**, then **hardening + demo readiness**—compressed using AI-assisted implementation and test generation where appropriate (with human review).

| Days | Focus | “Done” signal |
|------|--------|----------------|
| **1–3** | Freeze client-facing contracts; task skeleton + **book-placed gate**; catalog/auth wiring on web + mobile; first request→task→confirm visible in at least one UI. | Interfaces documented; one happy slice observable without DB hacks. |
| **4–10** | **Delivery + return** E2E happy paths; shared status rules; robot bridge contract validation (sim/hardware); basic integration tests; polling fallback. | Same task id consistent across mobile + dashboard for tested steps; robot/sim progress reflected. |
| **11–14** | Hardening: retries/reconnect, safety/fault surfacing, real-time (WS if ready), NFR baseline checks, seeded demo + runbook + contingency. | One-pass scripted demo; fallbacks explicit; critical issues triaged with workarounds. |

---

## Cross-team dependency matrix

| Dependency | Consumers | Provider | If it slips |
|------------|-----------|----------|-------------|
| Task + robot **payloads** | Mobile, Dashboard, Bridge | Backend | Pipeline stalls or mis-reports phase |
| **Book-placed** rule | Bridge, safety story | Backend | Do not ship without enforcement |
| Catalog **read/write** | Dashboard, Mobile discovery | Backend | Demo story and inventory wrong |
| Auth **tokens + roles** | Mobile, Dashboard | Backend | 403 loops, wrong screens |
| **Gateway** URL + health | All | Backend / hosting | False “app bugs” |
| **Events** (WS/poll contract) | Mobile, Dashboard | Backend | Stale UI; need fallback |
| **Seeded / fixture data** | Demo, QA | Backend / scripts | Wasted setup time |

---

## References

| Document | Use |
|----------|-----|
| [SYSTEM_DESIGN.md](../System%20Design/SYSTEM_DESIGN.md) | Requirements and workflows |
| [BACKEND_IMPLEMENTATION_DESIGN.md](../System%20Design/BACKEND_IMPLEMENTATION_DESIGN.md) | Services alignment |
| [MOBILE_APP_IMPLEMENTATION_DESIGN.md](../System%20Design/MOBILE_APP_IMPLEMENTATION_DESIGN.md) | Student app scope |
| [ROBOT_IMPLEMENTATION_DESIGN.md](../System%20Design/ROBOT_IMPLEMENTATION_DESIGN.md) | Bridge architecture |
| [search-refactor-vibe.md](search-refactor-vibe.md) | Search QA |
| [HOMEPAGE_PLAN.md](../mobile/docs/HOMEPAGE_PLAN.md) | Home vs APIs |
| [web-dashboard/README.md](../web-dashboard/README.md), [backend/README.md](../backend/README.md), [robot/README.md](../robot/README.md) | Local setup |

---

*Living document: reconcile priorities with your course rubric and rename weeks if your sprint length differs.*

---

## Human revised plan (corrected sprint plan)

This section is a **human synthesis** of sprint reality across **all teams**: what is **done**, what is **in progress**, and what still **needs to be done** to reach the sprint goal—plus clear ownership.

### Ownership

| Track | Owners |
|------|--------|
| **Frontend (Web Dashboard)** | **Kelynn, Najaat** |
| **Backend** | **Sarah, Isaac** |
| **Robotics** | **Kritika, Isaac** |
| **Mobile App** | **Isaac** |

**Support:** Isaac provides support to the Frontend team as needed (API contract questions, status mapping, integration smoke tests).

### What’s implemented (this branch)

- **Mobile (Isaac)**:
  - **Search refactor to feature module** (`mobile/src/features/search/*`) and thin route composition (`mobile/app/(tabs)/search.tsx`), with verification doc and evidence screenshots (`docs/search-refactor-vibe.md`, `docs/evidence/search-refactor/*`).
  - **Home / tabs / navigation shell** improvements (tab bar component, home sections/screens under `mobile/app/home/*`, route/layout updates).
  - **Map tab UX fixes** (drag/scroll behavior and panning bounds adjustments in `mobile/app/(tabs)/map.tsx`).
  - **Book detail** screen and supporting services (`mobile/app/book/[id].tsx`, `mobile/src/services/books.ts`).
  - **Auth context + login/setup flows** and profile screens (`mobile/contexts/AuthContext.tsx`, `mobile/app/login.tsx`, `mobile/app/setup-account.tsx`, account pages).

- **Backend (Sarah, Isaac)**:
  - **Book service foundation and expanded catalog/discovery/search endpoints** (new/updated `backend/book/*`, including discovery overview, suggestions, filters/facets, stats/analytics, related/random, ISBN lookup, import/maintenance utilities).
  - **Route smoke tests** for core API behaviors (`backend/book/tests/test_routes.py`).
  - **Redis usage** added/expanded for analytics reads and shared client (`backend/shared/redis_client.py`) plus docker compose updates.
  - **Auth hardening tweaks** (changes under `backend/auth/*`, `backend/shared/auth_dependencies.py`).

- **Robotics (Kritika, Isaac)**:
  - **Robot onboarding complete** (ROS/TurtleBot stack running) and the TurtleBot can **run and move reliably** under manual control.

### In progress / needs verification (branch suggests started, but sprint requires proof)

- **Mobile (Isaac)**:
  - **End-to-end task flows** (request/return) are not evidenced here; mobile has the shell/screens but the sprint needs verified **request → status → completion** UX tied to backend task truth.
  - **Real-time vs polling behavior** for task/robot status needs an explicit plan + implementation check (this doc currently assumes fallback; confirm what’s actually wired).

- **Backend (Sarah, Isaac)**:
  - **Delivery/return/task state machine**: this branch shows strong catalog work; the sprint MVP still needs a clearly enforced **task lifecycle** for delivery + return, including the **book-placed gate** and legal transitions.
  - **Contract freeze**: confirm enums/shapes used by mobile and dashboard are stable and documented (or generated).

- **Frontend / Web Dashboard (Kelynn, Najaat)**:
  - No web-dashboard code changes appear in this branch diff; treat dashboard work as **not yet integrated here** and plan integration/QA accordingly.

- **Robotics (Kritika, Isaac)**:
  - **Mapping + navigation pipeline** is the next milestone: build a map, verify localization, and validate repeatable point-to-point navigation in the target space.
  - Bridge/pipeline integration still needs validation against backend robot/delivery contracts (dispatch, progress, completion, failure, reconnect).

### What still needs to be done (task breakdown with owners)

#### P0 — MVP E2E: Delivery + Return (must work for demo)

- **Backend (Sarah, Isaac)**:
  - **Define/lock the authoritative task state machine** for delivery + return (enums, transitions, terminal states).
  - **Enforce the “book placed” gate server-side** (robot cannot start until confirmed).
  - **Expose consistent task status APIs** used by both mobile and dashboard (plus any event feed if available).

- **Mobile (Isaac)**:
  - **Wire request creation + status tracking** to backend task APIs (no mock state).
  - **Wire return initiation + status tracking** to backend task APIs.
  - Add UX guardrails: disable double-submit, show last-updated, provide manual refresh when real-time is down.

- **Frontend / Web Dashboard (Kelynn, Najaat)**:
  - **Task queue UI**: librarian confirms book placed, monitors progress, closes/validates completion (delivery + return).
  - **Status rendering consistency**: same mapping/labels as mobile for the same task id.

- **Robotics (Kritika, Isaac)**:
  - Build a **map** for the target demo space and validate **localization** (reliable pose estimation).
  - Validate **navigation** between key waypoints (pickup/hand-off/destination) with repeatable outcomes.
  - **Bridge ↔ backend contract validation**: dispatch, progress, completion, failure.
  - Implement/verify **retry + reconnect** behavior (hardware or sim).

#### P1 — Catalog + discovery polishing (already strong; confirm end-to-end)

- **Backend (Sarah, Isaac)**:
  - Confirm **books API contract** aligns with dashboard catalog operations (search, add/delete, availability updates).
  - Keep route tests updated for any contract changes.

- **Frontend / Web Dashboard (Kelynn, Najaat)**:
  - Finish **catalog search + maintenance UX** matching the books API (availability updates, add/delete flows).

- **Mobile (Isaac)**:
  - Home/discover sections QA against the new discovery endpoints; confirm error states and performance on device.

#### P1 — Auth hardening across clients

- **Backend (Sarah, Isaac)**:
  - Confirm refresh/token error behavior is consistent and documented.

- **Mobile (Isaac)** and **Frontend (Kelynn, Najaat)**:
  - Implement **single-flight refresh** and consistent 401 handling (logout vs retry rules), role checks, and session clear + redirect.

#### P2 — Real-time reliability + NFR baseline

- **Backend (Sarah, Isaac)**:
  - If WebSocket/events exist: document event ordering rules; otherwise document polling cadence recommendations.

- **Mobile (Isaac)** and **Frontend (Kelynn, Najaat)**:
  - Implement WebSocket if available; otherwise robust polling + manual refresh affordances.

- **All teams**:
  - Add integration tests / scripts for: token expiry, network interruption, duplicate actions, and task-state race conditions.

#### P2 — Demo readiness

- **All teams (lead: Isaac coordinating)**:
  - Seeded test data and a one-pass runbook: **request → book placed → robot progress → delivered → return → closeout**.
  - Explicit fallback plan if hardware/network fails (simulation path and which screens still demonstrate truth).

### Sprint timeline (features, story points, dependencies)

**Story points are effort estimates — not days or hours.** We use a Fibonacci-style scale (1, 2, 3, 5, 8, 13). A “Done” feature means it is **integrated**, **demoable**, and has a **basic failure-mode** story (error + retry or documented fallback). We expect **AI assistance** to reduce implementation time, but we still treat integration/QA and contract alignment as the critical path.

| Days | Feature / deliverable | Owners | Est. points | Dependencies | Definition of done |
|------|------------------------|--------|-------------|--------------|--------------------|
| 1–3 | **Contract freeze**: task statuses, payload shapes, role expectations | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 5 | Agreement on enums and API shapes; doc location | One shared status enum/mapping and stable request/response shapes referenced by both clients |
| 1–3 | **Delivery/return task state machine skeleton** (authoritative) | Backend (Sarah, Isaac) | 8 | Contract freeze | Legal transitions enforced; terminal states defined; rejects invalid transitions |
| 1–3 | **Book-placed gate enforced server-side** | Backend (Sarah, Isaac) | 3 | Task state machine | Robot/task cannot enter “start/in-progress” unless book-placed is recorded |
| 1–3 | **Dashboard env + base wiring** (`VITE_API_BASE_URL`, auth attach) | Frontend (Kelynn, Najaat) | 3 | Backend reachable gateway | Dashboard runs against live backend; clear error state when misconfigured |
| 1–4 | **Mobile auth hardening (single-flight refresh)** | Mobile (Isaac) + Backend support | 5 | Backend auth behavior verified | No refresh storms; clean logout/redirect on invalid session |
| 4–10 | **E2E Delivery flow (happy path)**: request → placed → progress → delivered → confirm received | Mobile (Isaac) + Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) | 8 | Contracts + gate + task machine | Same task id shows consistent status on mobile + dashboard; no DB hand edits |
| 4–10 | **E2E Return flow (happy path)**: initiate → pickup → confirm → close/validate | Mobile (Isaac) + Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) | 8 | Contracts + task machine | Return transitions are legal; librarian closeout reflected on mobile |
| 4–10 | **Robot bridge contract validation** (sim or hardware) | Robotics (Kritika, Isaac) + Backend (Sarah, Isaac) | 8 | Backend robot/task endpoints stable | Bridge can start/monitor/complete (or simulate) with correct postbacks and retry-on-disconnect |
| 4–10 | **Shared status rendering rules** (web + mobile) | Frontend (Kelynn, Najaat) + Mobile (Isaac) | 5 | Contract freeze | Same label/color for same status; ignores out-of-order updates safely (timestamp/sequence rule) |
| 11–14 | **Real-time reliability** (WS if ready, otherwise polling + manual refresh) | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 8 | Endpoint/event availability | Users see timely updates; fallback works when WS drops; last-updated visible |
| 11–14 | **NFR baseline tests** for critical failure cases | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 8 | E2E flows exist | Covers token expiry, network interruption, duplicate action prevention, and task-state race checks |
| 11–14 | **Safety + operational controls** (e-stop / fault surfaced) | Robotics (Kritika, Isaac) + Frontend (Kelynn, Najaat) + Backend (Sarah, Isaac) | 5 | Robot pipeline | At least one end-to-end “fault/stop” path is visible in dashboard with clear operator instruction |
| 11–14 | **Demo package**: seeded data + runbook + checklist + fallback plan | All teams (coord: Isaac) | 5 | E2E flows | One-pass rehearsal succeeds; fallback (sim mode) documented and tested |

### Breakdown: split large items into smaller tasks

Use this table to turn the large rows above into “pullable” tasks sized to the point scale.

| Epic (from timeline) | Smaller task | Owners | Est. points | Dependencies | Acceptance / done |
|----------------------|--------------|--------|-------------|--------------|-------------------|
| E2E Delivery | Define delivery status enum + transition rules (shared doc) | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 3 | Contract freeze | All three surfaces use the same names/mapping for delivery states |
| E2E Delivery | API: create delivery request returns canonical task id + initial status | Backend (Sarah, Isaac) | 3 | Task state machine skeleton | Create returns stable id; duplicate submit is handled (dedupe or safe failure) |
| E2E Delivery | Dashboard: “confirm book placed” action wired + visible | Frontend (Kelynn, Najaat) + Backend (Sarah, Isaac) | 3 | Book-placed gate endpoint | Clicking updates status; button disables appropriately; errors visible |
| E2E Delivery | Mobile: request creation wired + “My requests” shows status | Mobile (Isaac) + Backend support | 3 | Create request API | New request appears with correct status after refresh |
| E2E Delivery | Robot/bridge: start only after book-placed + post “in progress” | Robotics (Kritika, Isaac) + Backend (Sarah, Isaac) | 5 | Book-placed gate + robot contract | Cannot start early; progress updates reach backend |
| E2E Delivery | Completion: mark delivered + student confirm received (if required) | Backend (Sarah, Isaac) + Mobile (Isaac) + Frontend (Kelynn, Najaat) | 5 | Robot progress reporting | Terminal status consistent across mobile + dashboard; confirm step recorded |
| E2E Return | Define return status enum + transition rules (shared doc) | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 3 | Contract freeze | Same mapping/labels across surfaces for return states |
| E2E Return | Mobile: initiate return + status tracking | Mobile (Isaac) + Backend support | 3 | Return create API | Return task appears; status updates on refresh |
| E2E Return | Robot/bridge: pickup flow status updates | Robotics (Kritika, Isaac) + Backend (Sarah, Isaac) | 5 | Robot contract + mapping | Pickup progress and completion/failure recorded |
| E2E Return | Dashboard: librarian close/validate completion | Frontend (Kelynn, Najaat) + Backend (Sarah, Isaac) | 3 | Return terminal state support | Close action updates status; shows audit/error on failure |
| Robot mapping & nav | Build map of demo space | Robotics (Kritika, Isaac) | 5 | TurtleBot running | Map artifact produced and reused; documented procedure |
| Robot mapping & nav | Localization sanity + waypoint navigation rehearsal | Robotics (Kritika, Isaac) | 5 | Map | Robot can navigate between key waypoints repeatably |
| Real-time reliability | Define update strategy: WS vs polling + cadence + last-updated UX | Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) + Mobile (Isaac) | 3 | Event/poll endpoints | Both clients implement the same rules and show last-updated |
| Real-time reliability | Implement polling fallback for tasks in mobile + dashboard | Mobile (Isaac) + Frontend (Kelynn, Najaat) | 5 | Task list/detail endpoints | Works when sockets are off; refresh doesn’t duplicate actions |
| NFR baseline tests | Token expiry / refresh single-flight tests | Backend (Sarah, Isaac) + Mobile (Isaac) + Frontend (Kelynn, Najaat) | 5 | Auth hardening | Multiple concurrent 401s behave predictably |
| NFR baseline tests | Race/duplicate action tests (double tap, retry, reconnect) | Backend (Sarah, Isaac) + Mobile (Isaac) + Frontend (Kelynn, Najaat) | 5 | E2E create endpoints | No duplicate tasks or contradictory terminal states |
| Safety + ops controls | E-stop / fault surfaced end-to-end (sim acceptable) | Robotics (Kritika, Isaac) + Backend (Sarah, Isaac) + Frontend (Kelynn, Najaat) | 5 | Robot pipeline | Dashboard shows stop/fault with clear operator instruction |
| Demo package | Seed data + one-pass runbook + fallback (sim) | All teams (coord: Isaac) | 3 | E2E flows | Rehearsal succeeds; fallback steps documented |
