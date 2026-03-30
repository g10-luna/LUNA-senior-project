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

## Suggested 3-week cadence

Adapt dates to your course schedule. The intent is **contracts first**, **both flows second**, **demo hardening third**.

| Week | Focus | “Done” signal |
|------|--------|----------------|
| **1** | Freeze client-facing contracts; **task skeleton** + **book-placed gate**; catalog + auth on **web + mobile**; **first** request→task→confirm visible in **at least one** UI without DB hacks. | Interfaces documented; one happy slice **observable**. |
| **2** | **Delivery** E2E + **return** E2E happy paths; **shared status** rules; WS or polling; **integration** tests on transitions + **auth expiry**. | Same task id looks consistent on **two clients** for tested steps. |
| **3** | Bridge **hardening** (retry, disconnect); **safety/e-stop** path; full **regression**; **seeded demo** + runbook + **known issues** list. | One-pass **scripted demo**; fallbacks explicit. |

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
