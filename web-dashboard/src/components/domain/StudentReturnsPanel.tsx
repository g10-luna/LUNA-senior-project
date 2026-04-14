import { useCallback, useEffect, useMemo, useState } from "react";
import { getBookById } from "../../lib/catalogApi";
import type { BookStatus } from "../../lib/catalogTypes";
import {
  approveStudentReturn,
  confirmAdminReturnReceipt,
  createReturnPickupTask,
  listBookReturnsForStaff,
  listDeliveryTasksForStaff,
  startDeliveryRun,
  type BookReturnRow,
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

function tasksForReturn(all: DeliveryTaskRow[], returnId: string): DeliveryTaskRow[] {
  return all
    .filter((t) => t.return_id === returnId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function primaryTaskForReturn(all: DeliveryTaskRow[], returnId: string): DeliveryTaskRow | null {
  const arr = tasksForReturn(all, returnId);
  if (arr.length === 0) return null;
  const active = [...arr].reverse().find((x) => !["COMPLETED", "CANCELLED", "FAILED"].includes(x.status));
  return active ?? arr[arr.length - 1];
}

function completionSummary(req: BookReturnRow): { label: string; tone: "ok" | "warn" } {
  if (req.admin_receipt_confirmed_at) {
    return { label: "Desk confirmed receipt", tone: "ok" };
  }
  if (req.student_confirmed_at && !req.student_book_loaded_at) {
    return { label: "Student confirmed (legacy return)", tone: "ok" };
  }
  if (req.auto_closed_without_confirm_at) {
    return { label: "Did not confirm — closed automatically", tone: "warn" };
  }
  return { label: "Completed", tone: "ok" };
}

export function StudentReturnsPanel() {
  const [returns, setReturns] = useState<BookReturnRow[]>([]);
  const [tasks, setTasks] = useState<DeliveryTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [bookStatusById, setBookStatusById] = useState<Record<string, BookStatus | string>>({});

  const recentCompleted = useMemo(() => {
    return [...returns]
      .filter((q) => q.status === "COMPLETED")
      .sort((a, b) => {
        const ta = new Date(a.completed_at ?? a.initiated_at).getTime();
        const tb = new Date(b.completed_at ?? b.initiated_at).getTime();
        return tb - ta;
      })
      .slice(0, 12);
  }, [returns]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, t] = await Promise.all([listBookReturnsForStaff({ limit: 80 }), listDeliveryTasksForStaff({ limit: 100 })]);
      setReturns(r.items);
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
      setError(e instanceof Error ? e.message : "Could not load student returns.");
      setReturns([]);
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
    const waitingStudentBook = returns.some((r) => r.status === "AWAITING_STUDENT_LOAD");
    const waitingLegacy = returns.some((r) => {
      const tk = primaryTaskForReturn(tasks, r.id);
      return r.status === "PICKED_UP" && tk?.status === "COMPLETED";
    });
    if (!hasEta && !waitingStudentBook && !waitingLegacy) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [tasks, returns]);

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

  const open = returns.filter((q) => q.status !== "COMPLETED" && q.status !== "CANCELLED");

  return (
    <section className="card sdreq-panel" aria-labelledby="sdret-heading">
      <div className="sdreq-head">
        <h2 id="sdret-heading" className="requests-section-label">
          Student book returns
        </h2>
        <button type="button" className="sdreq-refresh" disabled={loading || !!busyId} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? (
        <p className="sdreq-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="sdreq-muted">Loading…</p> : null}

      {!loading && open.length === 0 ? <p className="sdreq-muted">No active return requests. Students submit returns from the app.</p> : null}

      {!loading && open.length > 0 ? (
        <ul className="sdreq-list">
          {open.map((req) => {
            const rowTasks = tasksForReturn(tasks, req.id);
            const outbound = rowTasks.find((t) => t.return_pickup_leg === "outbound") ?? null;
            const returnLeg = rowTasks.find((t) => t.return_pickup_leg === "return") ?? null;
            const task = primaryTaskForReturn(tasks, req.id);
            const eta = task?.status === "IN_PROGRESS" ? etaLabel(task.delivery_eta_at) : null;
            const pillClass = `sdreq-pill sdreq-pill--${req.status.toLowerCase()}`;
            return (
              <li key={req.id} className="sdreq-row">
                <div className="sdreq-row-main">
                  <div className="sdreq-title">{req.book_title ?? "Book"}</div>
                  <div className="sdreq-meta">
                    <span className={pillClass}>{req.status.replace(/_/g, " ")}</span>
                    {req.student_display_name ? (
                      <span className="sdreq-student" title={req.student_email ?? undefined}>
                        {req.student_display_name}
                      </span>
                    ) : null}
                    <span className="sdreq-loc">{req.pickup_location}</span>
                  </div>
                  <div className="sdreq-dates">Started {formatShort(req.initiated_at)}</div>
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
                          await approveStudentReturn(req.id);
                        })
                      }
                    >
                      {busyId === `ap-${req.id}` ? "…" : "Approve"}
                    </button>
                  ) : null}

                  {req.status === "PICKUP_SCHEDULED" && !task ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`ct-${req.id}`, async () => {
                          await createReturnPickupTask(req.id);
                        })
                      }
                    >
                      {busyId === `ct-${req.id}` ? "…" : "Open return task"}
                    </button>
                  ) : null}

                  {req.status === "PICKUP_SCHEDULED" && outbound?.status === "QUEUED" ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`sim-out-${outbound!.id}`, async () => {
                          await startDeliveryRun(outbound!.id);
                        })
                      }
                    >
                      {busyId === `sim-out-${outbound.id}` ? "…" : "Simulate robot to pickup (~4 min)"}
                    </button>
                  ) : null}

                  {req.status === "AWAITING_STUDENT_LOAD" && outbound?.status === "COMPLETED" ? (
                    (() => {
                      const dl = studentConfirmDeadlineMs(outbound);
                      const expired = dl != null && Date.now() > dl;
                      return (
                        <span className={expired ? "sdreq-wait sdreq-wait--warn" : "sdreq-wait"}>
                          {expired
                            ? "Window ended — student did not confirm the book is on the robot."
                            : "Waiting for student to confirm the book is on the robot"}
                        </span>
                      );
                    })()
                  ) : null}

                  {req.status === "READY_FOR_RETURN_LEG" && returnLeg?.status === "QUEUED" ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`sim-ret-${returnLeg!.id}`, async () => {
                          await startDeliveryRun(returnLeg!.id);
                        })
                      }
                    >
                      {busyId === `sim-ret-${returnLeg.id}` ? "…" : "Simulate robot to desk (~4 min)"}
                    </button>
                  ) : null}

                  {req.status === "AWAITING_ADMIN_CONFIRM" ? (
                    <button
                      type="button"
                      className="requests-action-btn requests-action-btn--primary"
                      disabled={!!busyId}
                      onClick={() =>
                        void run(`rcpt-${req.id}`, async () => {
                          await confirmAdminReturnReceipt(req.id);
                        })
                      }
                    >
                      {busyId === `rcpt-${req.id}` ? "…" : "Confirm book received at desk"}
                    </button>
                  ) : null}

                  {req.status === "PICKED_UP" && task?.status === "COMPLETED" && task ? (
                    (() => {
                      const dl = studentConfirmDeadlineMs(task);
                      const expired = dl != null && Date.now() > dl;
                      return (
                        <span className={expired ? "sdreq-wait sdreq-wait--warn" : "sdreq-wait"}>
                          {expired
                            ? "Confirmation window ended — student did not confirm. Return will close automatically."
                            : "Waiting for student (legacy return flow)"}
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
          <h3 className="sdreq-recent-heading">Recent return completions</h3>
          <ul className="sdreq-list sdreq-list--recent">
            {recentCompleted.map((req) => {
              const sum = completionSummary(req);
              return (
                <li key={req.id} className="sdreq-row sdreq-row--recent">
                  <div className="sdreq-row-main">
                    <div className="sdreq-title">{req.book_title ?? "Book"}</div>
                    <div className="sdreq-meta">
                      <span className="sdreq-pill sdreq-pill--completed">Completed</span>
                      {req.student_display_name ? (
                        <span className="sdreq-student" title={req.student_email ?? undefined}>
                          {req.student_display_name}
                        </span>
                      ) : null}
                      <span className="sdreq-loc">{req.pickup_location}</span>
                    </div>
                    <div className="sdreq-dates">{req.completed_at ? `Closed ${formatShort(req.completed_at)}` : null}</div>
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
