# Lab 5 - Sprint summary (completed vs incomplete)

**Document:** `docs/LAB5_SPRINT_SUMMARY.md` (submit with the sprint bundle per instructor instructions.)  
**Team:** LUNA (group submission)  
**Sprint reference:** [SPRINT_PROGRAM.md](SPRINT_PROGRAM.md)  
**Implementation branch:** `lab5/sprint-ai-backlog`  
**GitHub epic:** [Issue #211 - Delivery pipeline](https://github.com/g10-luna/LUNA-senior-project/issues/211)  
**Date:** March 2026  

---

## 1. Backlog items this sprint (minimum 2)

| # | Backlog reference | Acceptance / intent | Status | Primary owners | Evidence |
|---|-------------------|---------------------|--------|----------------|----------|
| 1 | **FS-11** Auth hardening | Single-flight refresh; 401 then refresh then one retry on authenticated calls | **Done** | Isaac (mobile, web dashboard) | `mobile/src/services/auth.ts`, `mobile/src/services/books.ts`; `web-dashboard/src/lib/authApi.ts`, `web-dashboard/src/lib/api.ts` |
| 2 | **FS-04** Book requests and delivery (MVP) | Student create and list requests on live gateway; librarian APIs for approve, task creation, book-placed | **Partial** | Isaac | `backend/delivery/` (routes, services, tests); `mobile/src/services/bookRequests.ts`, `mobile/app/(tabs)/requests.tsx`, `mobile/app/book/[id].tsx` |
| 3 | **FS-10 prep** Catalog UX (dashboard) | Last-loaded stamp, retry on list errors, no double-submit on save/delete | **Done** | Isaac (web dashboard) | `web-dashboard/src/screens/CatalogScreen.tsx`, `web-dashboard/src/screens/Catalog.css` |
| 4 | **Backlog (UX)** **Library map** (web) | Howard Founders Library: floor tabs, legend, framed scrollable plans; static assets under `public/`; panel styling consistent with dashboard | **Done** | Najaat | Branch `ui-refresh/frontend-auth` |
| 5 | **Backlog (UX)** **Librarian auth + setup** (web) | Login + setup-account flows, Zod validation, auth API helpers, register without auto-login with post-submit success UX, copy aligned to librarian context | **Done** | Najaat | Branch `ui-refresh/frontend-auth`:`LoginScreen.tsx`, `LoginScreen.css`, `SetupAccountScreen.tsx`, `authApi.ts`, `loginSchema.ts`, `AppRouter.tsx` |
| 6 | **Backlog (UX)** **Account settings** (web) | Replace `/account` placeholder with profile (name, email, role), session copy, sign-out; frosted panel aligned with dashboard | **Done** | Najaat | Branch `ui-refresh/frontend-auth`: `web-dashboard/src/screens/AccountSettingsScreen.tsx`, `AccountSettingsScreen.css`|

**Traceability:** Map Section 1 rows and GitHub **#211** to your course requirement IDs (for example R2.a, R5.b) in the team **Requirements Traceability Matrix (RTM)**. Spreadsheet in repo: `docs/Traceablility Matrix.xlsx`.

---

## 2. Completed this cycle

- **Mobile auth:** `refreshSessionWithLock`; `apiFetch` retries once after a successful refresh; books client uses authenticated fetches.
- **Mobile requests:** Requests tab calls `GET /api/v1/requests/` with pull-to-refresh, error banner, and status cards; book detail **Request Book** calls `POST /api/v1/requests/` via `mobile/src/services/bookRequests.ts`.
- **Backend delivery:** Gateway paths `/api/v1/requests/` and `/api/v1/deliveries/`: create, list, and detail requests; approve and cancel; create delivery task from approved request; list and detail tasks; `POST /api/v1/deliveries/tasks/{task_id}/book-placed` (metadata, status PENDING to QUEUED); task status history on key transitions; idempotent student create when an active request already exists for the same book. Route tests (mocked database session): `backend/delivery/tests/test_delivery_routes.py`.
- **Web dashboard:** Single-flight token refresh; catalog last-loaded label, Retry on load errors, saving guards, Search and Refresh disabled while loading.
- **Web dashboard (`ui-refresh/frontend-auth`):** Founders Library **map** (multi-floor UI + assets); **librarian login / setup account** polish, schema-based login validation, registration flow without auto-login and success feedback, auth API integration patterns.
- **Web dashboard :** **Account** screen at `/account` — profile + session cards and sign-out, matching dashboard panel styling.


## 3. Incomplete or deferred

- **FS-04 remainder:** Web dashboard operator UI (approve request, create task, confirm book placed); richer requests list (book title and author); optional student choice of pickup location instead of one default string.
- **Robot and bridge:** Enforce book-placed (or agreed task phase) before dispatch; contract checks and documented simulation demo path.
- **Hardening:** Published API notes or OpenAPI for delivery shapes and enums; integration tests against Docker Postgres; short one-pass demo runbook (student then librarian steps).
- **Broader program:** FS-05 through FS-09 and other items in `SPRINT_PROGRAM.md` not covered above.
- **Course-only:** GitHub Project board screenshot or export if required.

---

## 4. Responsible use of AI

- AI helped with scaffolding (refresh mutex pattern, delivery route layout, UI patterns) aligned with existing repo style.
- Humans reviewed security-sensitive behavior (tokens, refresh), idempotency, and gateway path correctness.
- **Tests:** `backend/delivery` pytest with mocked DB in tests; mobile and book flows verified manually against a running gateway.

---

## 5. Course deliverables checklist

| Artifact | Location / notes |
|----------|------------------|
| Sprint summary | This file: `docs/LAB5_SPRINT_SUMMARY.md` |
| Requirements Traceability Matrix | `docs/Traceablility Matrix.xlsx` |
| GitHub Project Board | Screenshot or PDF export if required |
| Branch and PR | `lab5/sprint-ai-backlog`; open PR to `main`; reference **#211** until the epic is closed |
| Sprint program | `docs/SPRINT_PROGRAM.md` |

---

## 6. Commits on this branch (reference)

- `feat: delivery service, mobile requests, web catalog/auth hardening (Refs #211)` - main implementation batch.
- `docs: refresh Lab 5 sprint summary (completed vs incomplete, FS-04 status) (Refs #211)` - updates to this summary.

Verify latest commits on GitHub: [g10-luna/LUNA-senior-project](https://github.com/g10-luna/LUNA-senior-project), branch `lab5/sprint-ai-backlog`.
