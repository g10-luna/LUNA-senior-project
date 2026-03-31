# Lab 5 — Sprint execution summary (AI-augmented)

**Team:** LUNA (group submission)  
**Sprint reference:** [SPRINT_PROGRAM.md](SPRINT_PROGRAM.md) (`docs/SPRINT_PROGRAM.md`)  
**Implementation branch:** `lab5/sprint-ai-backlog`  
**Date:** March 2026  

---

## 1. Backlog items implemented this sprint (≥2)

| # | Backlog reference | Acceptance / intent | Status | Primary owners | Evidence |
|---|-------------------|---------------------|--------|----------------|----------|
| 1 | **FS-11** — Auth hardening (single-flight refresh, 401 handling) | Avoid duplicate parallel refresh calls; retry catalog/auth calls once after a successful refresh | **Done** | Sarah, Isaac (Backend contract); Isaac (Mobile, Dashboard) | Mobile: `mobile/src/services/auth.ts`, `mobile/src/services/books.ts`. Dashboard: `web-dashboard/src/lib/authApi.ts` (`refreshSessionWithLock`, raw refresh `fetch`); `web-dashboard/src/lib/api.ts` |
| 2 | **FS-04 prep** — Requests tab UX (guardrails before API wire-up) | Pull-to-refresh, last-updated visibility, navigation to discovery; no double-fire on refresh | **Done** | Isaac (Mobile) | `mobile/app/(tabs)/requests.tsx` |
| 3 | **FS-10 prep** — Catalog operator UX (dashboard) | Last-loaded stamp, explicit retry after list errors, no double-submit while mutations run | **Done** | Isaac (Dashboard) | `web-dashboard/src/screens/CatalogScreen.tsx`, `web-dashboard/src/screens/Catalog.css` |

**Traceability:** Items map to **Final sprint scope + assignments** (FS-11, FS-04) in `SPRINT_PROGRAM.md`. Update the team **Requirements Traceability Matrix (RTM)** to link the same requirement IDs your course uses to these changes and commits.

---

## 2. Completed vs incomplete (this cycle)

### Completed
- Mobile: serialized **refresh token** flow (`refreshSessionWithLock`) aligned with `POST /api/v1/auth/refresh`.
- Mobile: **401 → refresh → retry once** for authenticated fetches used by the books client (`apiFetch` / `authenticatedFetch`).
- Mobile: **Requests** tab — `RefreshControl`, last-refreshed label, **Find books** navigation, refresh debounced with a lock ref.
- Dashboard: **single-flight refresh** (`refreshSessionWithLock` in `authApi`, `apiFetch` uses it) with **raw `fetch`** for the refresh call to avoid an import cycle with `api.ts`.
- Dashboard: **Catalog** — `lastLoadedAt` label after successful list load, **Retry** for load failures, `saving` guards on save/delete, **Search** / **Refresh** disabled while loading.

### Incomplete / deferred (still on sprint program)
- **FS-04** full delivery: create/list book requests against a live delivery service (gateway routing + mobile client calls).
- **FS-05–FS-09** dashboard and robot task flows.
- **RTM URL** and **GitHub Projects** screenshot must be attached per instructor (see §4).

---

## 3. Responsible use of AI tools

- AI assisted with **implementation scaffolding** (e.g. refresh mutex pattern, layout for Requests) and **consistency** with existing Expo / project style.
- **Human review** covered: security (tokens cleared on failed refresh), no duplicate refresh storms, and alignment with backend `/auth/refresh` JSON shape.
- **Tests:** manual — log in, use catalog, simulate expired access if possible; pull-to-refresh on Requests.

---

## 4. Deliverables checklist (course)

| Artifact | Location / action |
|----------|-------------------|
| Updated **GitHub Project Board** | Maintain columns & assignees; **attach screenshot or export to PDF** with submission. |
| **RTM** | Paste **team RTM URL** here: `______________________________` |
| **This summary** | Include in PDF bundle or submit as Markdown per LMS. |
| **Branch / PR** | Push `lab5/sprint-ai-backlog` and open PR to `main` for review. |

---

## 5. Suggested commit message

`feat(mobile,web-dashboard): single-flight auth refresh; requests + catalog refresh UX (lab5 sprint backlog)`
