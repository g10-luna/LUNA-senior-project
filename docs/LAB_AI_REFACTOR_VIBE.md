# Lab: AI-assisted refactor & VIBE (submission draft)

Use this document for your **individual PDF**: copy sections into your PR description, attach screenshots where noted, then print / export to PDF (e.g. print from VS Code / Markdown preview, or paste into Google Docs and export as PDF).

---

## Suggested PR title

`refactor(web-dashboard): extract pure robot task selectors from Requests screen`

---

## 1. Refactor rationale

**Problem.** The Requests screen mixed **UI concerns** (drag-and-drop, forms, layout) with **data shaping**: deriving the ordered waiting list from `tasks` + `queueOrder`, filtering in-progress and completed tasks, and formatting timestamps. That coupling makes the screen harder to read and duplicates “how do we interpret store shape?” in one place.

**Principle.** **Separation of concerns** and a thin slice of **abstraction**: queue interpretation belongs in **pure, side-effect-free functions** that take `RobotTasksState` and return views of the data. The React screen only subscribes to the store and renders.

**Change (high level).**

| Before | After |
|--------|--------|
| `useMemo` blocks in `RequestsScreen.tsx` inlined `Map` / `filter` logic | `web-dashboard/src/lib/robotTaskSelectors.ts` exports `selectQueuedOrderedTasks`, `selectInProgressTasks`, `selectCompletedTasks`, `formatRobotTaskCreatedAt` |
| Screen owned timestamp formatting | Shared `formatRobotTaskCreatedAt` used by queue rows |

**Why it helps.** Selectors are trivial to reason about, reuse if another screen needs the same lists, and keep `RequestsScreen` focused on composition and events. Persistence and reconciliation stay in `robotTasksStore.ts` (single source of truth).

---

## 2. AI usage summary (VIBE)

Representative **Cursor / Composer-style prompts** used during the project (paraphrased):

1. *“Add a Requests tab with auto-queue from robot telemetry, single in-progress robot, drag-and-drop reorder, and queued-by from session.”*
2. *“Replace assignee inputs with who queued the task and initials on the side.”*
3. *“Revert the large feature-folder split; keep everything very minimal in one screen.”*
4. *“Extract pure selectors for the robot task queue into `robotTaskSelectors.ts` for the lab refactor.”*

**Human verification (what you changed vs raw AI output).**

- Merged teammate branch (`origin/ui-refresh/frontend`) and **fixed build breaks** (e.g. missing `hasLibrarianSessionHint` import in `TopBar.tsx`, maintenance loading line).
- Chose **small** selector extraction instead of a large `features/` tree after scope feedback (“very minimal”).
- Reviewed **TypeScript** and **`npm run build`** after each structural change.

---

## 3. Verification & testing (no regressions)

**Automated**

- [x] `cd web-dashboard && npm run build` — TypeScript project build + Vite production build succeed.

**Manual checklist (Requests / robot queue)**

- [ ] Log in → sidebar **Requests** opens `/requests`.
- [ ] **Add to queue** — task appears under **Waiting**; **Queued by** shows your session name + initials.
- [ ] **Drag** a row to reorder; **↑ / ↓** still move priority.
- [ ] **Complete** on waiting or in-progress moves state correctly; **single** in-progress behavior unchanged (store reconciliation).
- [ ] **Dashboard** “View Task Queue” still navigates to `/requests#queue` and scrolls to the queue.
- [ ] **Maintenance** summary still links to Requests and shows open count.

**Evidence to attach (rubric)**

1. Screenshot: Requests page with ≥1 waiting task and **Queued by** visible.  
2. Screenshot or short paste: terminal output of `npm run build` showing success.  
3. (Optional) Short screen recording: add task → reorder → complete.

---

## 4. PR professionalism (checklist)

- [ ] Clear title (see above).
- [ ] This rationale + AI summary + verification in the PR body.
- [ ] Commits: small, one for refactor (`refactor: …`) if possible.

---

## 5. Export to PDF

1. Open this file in your editor’s Markdown preview **or** paste into Google Docs / Word.  
2. Add your screenshots inline or as an appendix.  
3. **Print → Save as PDF** (or Docs **File → Download → PDF**).

---

## File touched by this lab refactor

- **New:** `web-dashboard/src/lib/robotTaskSelectors.ts`  
- **Updated:** `web-dashboard/src/screens/RequestsScreen.tsx` (imports selectors; removes inlined derivation / date helper)
