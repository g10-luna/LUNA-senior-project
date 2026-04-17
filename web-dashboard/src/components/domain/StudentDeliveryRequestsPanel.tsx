import { useCallback, useEffect, useMemo, useState } from "react";
import { getBookById } from "../../lib/catalogApi";
import type { BookStatus } from "../../lib/catalogTypes";
import {
  approveStudentRequest,
  confirmBookPlacedOnRobot,
  createPickupTask,
  listBookRequestsForStaff,
  listDeliveryTasksForStaff,
  startDeliveryRun,
  type BookRequestRow,
  type DeliveryTaskRow,
} from "../../lib/deliveryRequestsApi";

function formatShort(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatCatalogStatus(status: BookStatus | string | undefined): string {
  if (!status) return "—";
  const s = String(status);
  switch (s) {
    case "AVAILABLE":
      return "Available";
    case "UNAVAILABLE":
      return "Unavailable";
    case "CHECKED_OUT":
      return "Checked out";
    case "RESERVED":
      return "Reserved";
    case "LOW_STOCK":
      return "Low stock";
    default:
      return s.replace(/_/g, " ");
  }
}

function etaLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const t = d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return `ETA ${t}`;
  } catch {
    return null;
  }
}

/** Milliseconds when the student's confirm window ends (5 min after run completion, or explicit deadline from API). */
function studentConfirmDeadlineMs(task: DeliveryTaskRow): number | null {
  if (task.student_confirm_deadline_at) {
    const t = new Date(task.student_confirm_deadline_at).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (task.completed_at) {
    const t = new Date(task.completed_at).getTime();
    if (Number.isNaN(t)) return null;
    return t + 5 * 60 * 1000;
  }
  return null;
}

function completionSummary(req: BookRequestRow): { label: string; tone: "ok" | "warn" } {
  if (req.student_confirmed_at) {
    return { label: "Student confirmed receipt", tone: "ok" };
  }
  if (req.auto_closed_without_confirm_at) {
    return { label: "Did not confirm — closed automatically", tone: "warn" };
  }
  return { label: "Completed", tone: "ok" };
}

export function StudentDeliveryRequestsPanel() {
  const [requests, setRequests] = useState<BookRequestRow[]>([]);
  const [tasks, setTasks] = useState<DeliveryTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [bookStatusById, setBookStatusById] = useState<Record<string, BookStatus | string>>({});
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "IN_PROGRESS">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");

  const taskByRequestId = useMemo(() => {
    const m = new Map<string, DeliveryTaskRow>();
    for (const t of tasks) {
      if (t.request_id) m.set(t.request_id, t);
    }
    return m;
  }, [tasks]);

  const recentCompleted = useMemo(() => {
    return [...requests]
      .filter((q) => q.status === "COMPLETED")
      .sort((a, b) => {
        const ta = new Date(a.completed_at ?? a.requested_at).getTime();
        const tb = new Date(b.completed_at ?? b.requested_at).getTime();
        return tb - ta;
      })
      .slice(0, 12);
  }, [requests]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, t] = await Promise.all([listBookRequestsForStaff({ limit: 80 }), listDeliveryTasksForStaff({ limit: 100 })]);
      setRequests(r.items);
      setTasks(t.items);

      const uniqueBookIds = [...new Set(r.items.map((x) => x.book_id))];
      if (uniqueBookIds.length > 0) {
        const settled = await Promise.allSettled(uniqueBookIds.map((bid) => getBookById(bid)));
        const next: Record<string, BookStatus | string> = {};
        settled.forEach((result, i) => {
          const bid = uniqueBookIds[i];
          if (result.status === "fulfilled" && result.value.status) {
            next[bid] = result.value.status;
          }
        });
        setBookStatusById(next);
      } else {
        setBookStatusById({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load student requests.");
      setRequests([]);
      setTasks([]);
      setBookStatusById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasEta = tasks.some((x) => x.status === "IN_PROGRESS" && x.delivery_eta_at);
    const waitingConfirm = requests.some((r) => {
      const tk = taskByRequestId.get(r.id);
      return r.status === "IN_PROGRESS" && tk?.status === "COMPLETED";
    });
    if (!hasEta && !waitingConfirm) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [tasks, requests, taskByRequestId]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusyId(label);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const open = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = requests.filter((q) => {
      if (q.status === "COMPLETED" || q.status === "CANCELLED") return false;
      if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = `${q.book_title ?? ""} ${q.student_display_name ?? ""} ${q.student_email ?? ""} ${q.request_location ?? ""}`
        .toLowerCase()
        .trim();
      return haystack.includes(normalizedQuery);
    });
    filtered.sort((a, b) => {
      const ta = new Date(a.requested_at).getTime();
      const tb = new Date(b.requested_at).getTime();
      return sortBy === "newest" ? tb - ta : ta - tb;
    });
    return filtered;
  }, [requests, statusFilter, query, sortBy]);

  return (
    <section className="card sdreq-panel" aria-labelledby="sdreq-heading">
      <div className="sdreq-head">
        <h2 id="sdreq-heading" className="requests-section-label">
          Student delivery requests
        </h2>
        <button type="button" className="sdreq-refresh" disabled={loading || !!busyId} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="sdreq-controls" role="group" aria-label="Filter and sort student requests">
        <label className="sdreq-control">
          <span className="sdreq-control-label">Status</span>
          <select className="sdreq-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="ALL">All open</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In progress</option>
          </select>
        </label>
        <label className="sdreq-control">
          <span className="sdreq-control-label">Sort</span>
          <select className="sdreq-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <label className="sdreq-control sdreq-control--search">
          <span className="sdreq-control-label">Search</span>
          <input
            type="search"
            className="sdreq-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Book, student, email, or location"
          />
        </label>
      </div>

      {error ? (
        <p className="sdreq-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="sdreq-muted">Loading…</p> : null}

      {!loading && open.length === 0 ? (
        <p className="sdreq-muted">
          No requests match these filters. Try clearing search or selecting <strong>All open</strong>.
        </p>
      ) : null}

      {!loading && open.length > 0 ? (
        <ul className="sdreq-list">
          {open.map((req) => {
            const task = taskByRequestId.get(req.id) ?? null;
            const eta = task?.status === "IN_PROGRESS" ? etaLabel(task.delivery_eta_at) : null;
            return (
              <li key={req.id} className="sdreq-row">
                <div className="sdreq-row-main">
                  <div className="sdreq-title">{req.book_title ?? "Book"}</div>
                  <div className="sdreq-meta">
                    <span className={`sdreq-pill sdreq-pill--${req.status.toLowerCase()}`}>{req.status.replace("_", " ")}</span>
                    {req.student_display_name ? (
                      <span className="sdreq-student" title={req.student_email ?? undefined}>
                        {req.student_display_name}
                      </span>
                    ) : null}
                    <span className="sdreq-loc">{req.request_location}</span>
                  </div>
                  <div className="sdreq-dates">Requested {formatShort(req.requested_at)}</div>
                  <div className="sdreq-bookline">
                    <span className="sdreq-bookline-label">Book in catalog</span>
                    <span className={`sdreq-book-status sdreq-book-status--${String(bookStatusById[req.book_id] ?? "unknown").toLowerCase()}`}>
                      {formatCatalogStatus(bookStatusById[req.book_id])}
                    </span>
                  </div>
                  {task ? (
                    <div className="sdreq-taskline">
                      Task: {task.status.replace("_", " ")}
                      {task.status === "IN_PROGRESS" && eta ? <span className="sdreq-eta"> · {eta}</span> : null}
                    </div>
                  ) : null}
                </div>
                <div className="sdreq-actions">
                  {req.status === "PENDING" ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`ap-${req.id}`, async () => {
                          await approveStudentRequest(req.id);
                        })
                      }
                    >
                      {busyId === `ap-${req.id}` ? "…" : "Approve"}
                    </button>
                  ) : null}

                  {req.status === "APPROVED" && !task ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`ct-${req.id}`, async () => {
                          await createPickupTask(req.id);
                        })
                      }
                    >
                      {busyId === `ct-${req.id}` ? "…" : "Open fulfillment task"}
                    </button>
                  ) : null}

                  {req.status === "IN_PROGRESS" && task?.status === "PENDING" && !task.book_placed ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`bp-${task!.id}`, async () => {
                          await confirmBookPlacedOnRobot(task!.id);
                        })
                      }
                    >
                      {busyId === `bp-${task.id}` ? "…" : "Confirm book on robot"}
                    </button>
                  ) : null}

                  {req.status === "IN_PROGRESS" && task?.status === "QUEUED" ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`sim-${task!.id}`, async () => {
                          await startDeliveryRun(task!.id);
                        })
                      }
                    >
                      {busyId === `sim-${task.id}` ? "…" : "Simulate robot to pickup (~4 min)"}
                    </button>
                  ) : null}

                  {req.status === "IN_PROGRESS" && task?.status === "COMPLETED" && task ? (
                    (() => {
                      const dl = studentConfirmDeadlineMs(task);
                      const expired = dl != null && Date.now() > dl;
                      return (
                        <span className={expired ? "sdreq-wait sdreq-wait--warn" : "sdreq-wait"}>
                          {expired
                            ? "Confirmation window ended — student did not confirm. Request will close automatically (simulated robot return)."
                            : "Simulated run complete — waiting for student to confirm they picked up the book in the app"}
                        </span>
                      );
                    })()
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && recentCompleted.length > 0 ? (
        <>
          <h3 className="sdreq-recent-heading">Recent completions</h3>
          <ul className="sdreq-list sdreq-list--recent">
            {recentCompleted.map((req) => {
              const sum = completionSummary(req);
              return (
                <li key={req.id} className="sdreq-row sdreq-row--recent">
                  <div className="sdreq-row-main">
                    <div className="sdreq-title">{req.book_title ?? "Book"}</div>
                    <div className="sdreq-meta">
                      <span className={`sdreq-pill sdreq-pill--completed`}>Completed</span>
                      {req.student_display_name ? (
                        <span className="sdreq-student" title={req.student_email ?? undefined}>
                          {req.student_display_name}
                        </span>
                      ) : null}
                      <span className="sdreq-loc">{req.request_location}</span>
                    </div>
                    <div className="sdreq-dates">
                      {req.completed_at ? `Closed ${formatShort(req.completed_at)}` : null}
                    </div>
                    <div className={`sdreq-completion sdreq-completion--${sum.tone}`}>{sum.label}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
