# Lab 5 — Sprint summary (completed vs incomplete)

**Location:** `docs/LAB5_SPRINT_SUMMARY.md` (submit this Markdown with your sprint bundle as required.)  
**Team:** LUNA (group submission)  
**Sprint reference:** [SPRINT_PROGRAM.md](SPRINT_PROGRAM.md)  
**Implementation branch:** `lab5/sprint-ai-backlog`  
**Tracking epic (GitHub):** [#211 — Delivery pipeline](https://github.com/g10-luna/LUNA-senior-project/issues/211)  
**Date:** March 2026  

---

## 1. Backlog items this sprint (≥2)

| # | Backlog reference | Acceptance / intent | Status | Primary owners | Evidence |
|---|-------------------|---------------------|--------|----------------|----------|
| 1 | **FS-11** — Auth hardening | Single-flight refresh; **401 → refresh → retry once** | **Done** | Isaac (Mobile, Dashboard) | `mobile/src/services/auth.ts`, `mobile/src/services/books.ts`; `web-dashboard/src/lib/authApi.ts`, `web-dashboard/src/lib/api.ts` |
| 2 | **FS-04** — Book requests & delivery (MVP) | Student create/list requests on **live** gateway API; staff APIs for approve/task/placed exist | **Partial** | Isaac | Backend: `backend/delivery/` (routes, services, tests). Mobile: `mobile/src/services/bookRequests.ts`, `mobile/app/(tabs)/requests.tsx`, `mobile/app/book/[id].tsx` |
| 3 | **FS-10 prep** — Catalog UX (dashboard) | Last-loaded, retry on errors, no double-submit on mutations | **Done** | Isaac (Dashboard) | `web-dashboard/src/screens/CatalogScreen.tsx`, `web-dashboard/src/screens/Catalog.css` |

**Traceability:** Link these rows (and GitHub **#211**) in your course **RTM** to the requirement IDs your instructor uses.

---

## 2. Completed (this cycle)

- **Mobile auth:** `refreshSessionWithLock`; `apiFetch` with one retry after refresh; books client uses authenticated fetches.
- **Mobile requests:** **Requests** tab loads **`GET /api/v1/requests/`**, pull-to-refresh, error banner, status cards; **Request Book** on book detail → **`POST /api/v1/requests/`** (`mobile/src/services/bookRequests.ts`).
- **Backend delivery:** Gateway routes under **`/api/v1/requests/`** and **`/api/v1/deliveries/`**: create/list/detail requests, approve/cancel, create task from approved request, list/detail tasks, **`POST .../book-placed`** (metadata, **PENDING → QUEUED**), task status history on key transitions; **idempotent** student create for an active request on the same book. Mocked route tests: `backend/delivery/tests/test_delivery_routes.py`.
- **Web dashboard:** Single-flight refresh; catalog **last loaded** time, **Retry** on list errors, **saving** guards, **Search**/**Refresh** disabled while loading.

---

## 3. Incomplete / deferred (still on program or epic #211)

- **FS-04 remainder:** Web dashboard **operator UI** (approve request, create task, confirm book placed) on the same APIs; requests list **book title/author** (API enrich or client batch fetch); optional **pickup location** UX (not a single hard-coded string).
- **Robot / bridge:** Enforce **book-placed** (or agreed task phase) before dispatch; contract validation and documented **sim** demo path.
- **Hardening:** OpenAPI or doc for delivery JSON/enums; **integration tests** against Dockerized Postgres (not only mocked `get_db`); short **one-pass runbook** (student → librarian steps).
- **Broader sprint program:** **FS-05–FS-09** and other program-wide items in `SPRINT_PROGRAM.md` not listed above.
- **Course artifacts:** **RTM URL** placeholder below; **GitHub Project** screenshot/export per instructor.

---

## 4. Responsible use of AI

- AI assisted with **scaffolding** (refresh mutex, delivery route structure, UI patterns) consistent with repo style.
- **Human review:** token handling, idempotency rules, and gateway path alignment.
- **Tests:** `backend/delivery` pytest (mocked DB in tests); mobile/book flows **manual** against a running gateway.

---

## 5. Course deliverables checklist

| Artifact | Location / action |
|----------|-------------------|
| **Sprint summary (this file)** | `docs/LAB5_SPRINT_SUMMARY.md` |
| **GitHub Project Board** | Screenshot or PDF export with submission |
| **RTM** | Team RTM URL: `______________________________` |
| **Branch / PR** | `lab5/sprint-ai-backlog` → PR to `main`; reference issue **#211** until epic is done |

---

## 6. Reference commit (already on branch)

`feat: delivery service, mobile requests, web catalog/auth hardening (Refs #211)` — includes this document when committed with that batch.
