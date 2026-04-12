import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { StudentDeliveryRequestsPanel } from "../components/domain/StudentDeliveryRequestsPanel";
import { listBooks, updateBook } from "../lib/catalogApi";
import type { Book } from "../lib/catalogTypes";
import { getCurrentQueuerProfile } from "../lib/queuedByProfile";
import {
  addRobotTaskToQueue,
  getInProgressTaskProgress,
  markTaskBookUnavailable,
  moveQueuedTask,
  pauseRobotTask,
  removeRobotTask,
  reorderQueuedTasks,
  resumeRobotTask,
  type RobotTask,
  updateRobotTaskStatus,
  useRobotTasksState,
} from "../lib/robotTasksStore";
import "./RequestsScreen.css";

type QueueTaskOption = {
  id: string;
  label: string;
  requiresBook: boolean;
  detailTemplate: string;
};

const TASK_OPTIONS: QueueTaskOption[] = [
  { id: "book_pickup", label: "Book pickup", requiresBook: true, detailTemplate: "Pick up selected title from {location}." },
  { id: "returns_pickup", label: "Returns pickup", requiresBook: false, detailTemplate: "Collect returns from {location}." },
  { id: "shelving_cart", label: "Shelving cart transfer", requiresBook: false, detailTemplate: "Move shelving cart from {location}." },
  { id: "hold_dropoff", label: "Hold drop-off", requiresBook: false, detailTemplate: "Deliver hold materials to {location}." },
  { id: "inventory_scan", label: "Inventory scan assist", requiresBook: false, detailTemplate: "Run scan support in {location}." },
];

const PICKUP_LOCATIONS = [
  "Reserve Hold Desk",
  "Circulation Desk",
  "Returns Bin - Ground Floor",
  "Stacks A-12",
  "Stacks B-07",
  "Media Desk",
];

function formatCreated(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function QueuedByAside({ name, initials, compact }: { name: string; initials: string; compact?: boolean }) {
  return (
    <div className={`requests-queued-by${compact ? " requests-queued-by--compact" : ""}`} title={`Queued by ${name}`}>
      <span className="requests-queued-by-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="requests-queued-by-text">
        <span className="requests-queued-by-label">Queued by</span>
        <span className="requests-queued-by-name">{name}</span>
      </div>
    </div>
  );
}

function SortableQueueRow({
  task,
  onRemove,
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  task: RobotTask;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className={`requests-queue-row${isDragging ? " requests-queue-row--dragging" : ""}`}>
      <button
        type="button"
        className="requests-drag-handle"
        aria-label={`Drag to reprioritize: ${task.title}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden>⠿</span>
      </button>
      <div className="requests-queue-body">
        <div className="requests-queue-title">{task.title}</div>
        {task.description ? <div className="requests-queue-detail">{task.description}</div> : null}
        <div className="requests-queue-meta">
          {task.source === "robot_api" ? "Auto-queued · " : null}
          {formatCreated(task.createdAt)}
        </div>
      </div>
      <QueuedByAside name={task.queuedByName} initials={task.queuedByInitials} />
      <div className="requests-queue-actions">
        <div className="requests-reorder-btns">
          <button type="button" className="requests-mini-btn" disabled={disableUp} onClick={onMoveUp} aria-label="Move up in queue">
            ↑
          </button>
          <button type="button" className="requests-mini-btn" disabled={disableDown} onClick={onMoveDown} aria-label="Move down in queue">
            ↓
          </button>
        </div>
        <button type="button" className="requests-action-btn requests-action-btn--danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}

export default function RequestsScreen() {
  const location = useLocation();
  const store = useRobotTasksState();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(TASK_OPTIONS[0]?.id ?? "");
  const [pickupLocation, setPickupLocation] = useState<string>(PICKUP_LOCATIONS[0] ?? "");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [bookQuery, setBookQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [bookStatusSyncError, setBookStatusSyncError] = useState<string | null>(null);
  const [, setProgressTick] = useState(0);
  const syncingBookTaskIds = useRef(new Set<string>());

  const queuerPreview = getCurrentQueuerProfile();

  const queuedOrdered = useMemo(() => {
    const byId = new Map(store.tasks.map((t) => [t.id, t]));
    return store.queueOrder.map((id) => byId.get(id)).filter((t): t is RobotTask => !!t && t.status === "queued");
  }, [store.tasks, store.queueOrder]);

  const inProgress = useMemo(() => store.tasks.filter((t) => t.status === "in_progress" || t.status === "paused"), [store.tasks]);
  const completed = useMemo(() => store.tasks.filter((t) => t.status === "completed"), [store.tasks]);
  const selectedTask = useMemo(() => TASK_OPTIONS.find((t) => t.id === selectedTaskId) ?? TASK_OPTIONS[0], [selectedTaskId]);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (id !== "queue") return;
    const el = document.getElementById("requests-queue");
    if (!el) return;
    window.requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash]);

  useEffect(() => {
    const hasInProgress = store.tasks.some((t) => t.status === "in_progress");
    if (!hasInProgress) return;
    const interval = window.setInterval(() => {
      setProgressTick((v) => (v + 1) % 10_000);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [store.tasks]);

  useEffect(() => {
    if (!selectedTask?.requiresBook) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.resolve()
        .then(() => {
          if (cancelled) return;
          setBooksLoading(true);
          setBooksError(null);
        })
        .then(() =>
          listBooks({
            q: bookQuery.trim() || undefined,
            limit: 25,
            sort: "title",
            order: "asc",
          })
        )
        .then((res) => {
          if (cancelled) return;
          setBooks(res.items);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Failed to load books.";
          setBooksError(message);
        })
        .finally(() => {
          if (cancelled) return;
          setBooksLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedTask?.requiresBook, bookQuery]);

  useEffect(() => {
    const candidates = store.tasks.filter(
      (t) =>
        t.status === "completed" &&
        !!t.relatedBookId &&
        !!t.relatedBookTitle &&
        !!t.relatedBookAuthor &&
        !t.bookMarkedUnavailableAt
    );
    for (const task of candidates) {
      if (syncingBookTaskIds.current.has(task.id)) continue;
      syncingBookTaskIds.current.add(task.id);
      void updateBook(task.relatedBookId!, {
        title: task.relatedBookTitle!,
        author: task.relatedBookAuthor!,
        status: "UNAVAILABLE",
      })
        .then(() => {
          markTaskBookUnavailable(task.id);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to mark picked book unavailable.";
          setBookStatusSyncError(message);
        })
        .finally(() => {
          syncingBookTaskIds.current.delete(task.id);
        });
    }
  }, [store.tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = queuedOrdered.map((t) => t.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderQueuedTasks(arrayMove(ids, oldIndex, newIndex));
  };

  const onSubmitManual = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!pickupLocation.trim()) return;
    const selectedBook = selectedTask.requiresBook ? books.find((b) => b.id === selectedBookId) ?? null : null;
    if (selectedTask.requiresBook && !selectedBook) return;

    const taskTitle = selectedTask.requiresBook
      ? `${selectedTask.label} - ${selectedBook?.title ?? "Selected book"}`
      : `${selectedTask.label} - ${pickupLocation}`;
    const taskDescription = selectedTask.requiresBook
      ? `${selectedTask.detailTemplate.replace("{location}", pickupLocation)} Book: ${selectedBook?.title ?? ""}${selectedBook?.author ? ` by ${selectedBook.author}` : ""}.`
      : selectedTask.detailTemplate.replace("{location}", pickupLocation);

    const q = getCurrentQueuerProfile();
    addRobotTaskToQueue({
      title: taskTitle,
      description: taskDescription,
      queuedByName: q.queuedByName,
      queuedByInitials: q.queuedByInitials,
      source: "manual",
      relatedBookId: selectedTask.requiresBook ? selectedBook?.id : undefined,
      relatedBookTitle: selectedTask.requiresBook ? selectedBook?.title : undefined,
      relatedBookAuthor: selectedTask.requiresBook ? selectedBook?.author : undefined,
    });
    if (selectedTask.requiresBook) {
      setSelectedBookId("");
      setBookQuery("");
    }
  };

  const openCount = queuedOrdered.length + inProgress.length;

  return (
    <div className="requests-page">
      <header className="requests-page-header">
        <div className="requests-page-header-frame">
          <div className="requests-page-header-text">
            <h1 className="section-title requests-page-title">Requests</h1>
            <p className="requests-page-subtitle">
              Incoming robot work is <strong>auto-queued</strong> when the API reports a current task. Only <strong>one</strong> job is active
              at a time: the top of the queue moves to <strong>In progress</strong> when the robot is free; completing it advances the next.
              Drag rows or use arrows to reprioritize. Each request shows who <strong>queued</strong> it (your account when you add one here).
            </p>
          </div>
          <span className={`requests-open-pill ${openCount > 0 ? "requests-open-pill--active" : ""}`}>{openCount} open</span>
        </div>
      </header>

      <StudentDeliveryRequestsPanel />

      <form className="card requests-add-form" onSubmit={onSubmitManual}>
        <h2 className="requests-section-label">Add to queue</h2>
        <div className="requests-add-fields">
          <label className="requests-field">
            <span className="requests-field-label">Task type</span>
            <select
              className="requests-input"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
            >
              {TASK_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="requests-field">
            <span className="requests-field-label">Pick up location</span>
            <select className="requests-input" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}>
              {PICKUP_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
          {selectedTask?.requiresBook && (
            <label className="requests-field">
              <span className="requests-field-label">Book</span>
              <input
                className="requests-input"
                type="search"
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Search title, author, or ISBN..."
                disabled={booksLoading || books.length === 0}
              />
              {!booksLoading && books.length > 0 && (
                <div className="requests-book-search-results" role="listbox" aria-label="Book search results">
                  {books.map((book) => {
                    const isSelected = selectedBookId === book.id;
                    return (
                      <button
                        key={book.id}
                        type="button"
                        className={`requests-book-result${isSelected ? " requests-book-result--selected" : ""}`}
                        onClick={() => {
                          setSelectedBookId(book.id);
                          setBookQuery(book.title);
                        }}
                      >
                        {book.title}
                        {book.author ? ` - ${book.author}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              {!booksLoading && bookQuery.trim() && books.length === 0 && (
                <span className="requests-field-label">No books match your search.</span>
              )}
              {selectedBookId && (
                <span className="requests-field-label">
                  Selected: {books.find((b) => b.id === selectedBookId)?.title ?? "Book"}
                </span>
              )}
              {booksLoading && <span className="requests-field-label">Loading books...</span>}
              {booksError && <span className="requests-field-label">{booksError}</span>}
            </label>
          )}
        </div>
        <div className="requests-form-footer">
          <p className="requests-queuer-hint">
            <span className="requests-queuer-hint-label">You&apos;ll be listed as requester:</span>{" "}
            <span className="requests-queuer-hint-profile">
              <span className="requests-queued-by-avatar requests-queued-by-avatar--inline" aria-hidden>
                {queuerPreview.queuedByInitials}
              </span>
              <strong>{queuerPreview.queuedByName}</strong>
            </span>
          </p>
          <button
            type="submit"
            className="requests-submit-btn"
            disabled={!selectedTask || !pickupLocation || (selectedTask.requiresBook && (!selectedBookId || booksLoading))}
          >
            Add to queue
          </button>
        </div>
        {bookStatusSyncError && <p className="requests-side-hint">{bookStatusSyncError}</p>}
      </form>

      <section className="card requests-queue-card" id="requests-queue">
        <div className="requests-queue-head">
          <h2 className="requests-section-label">Waiting (priority order)</h2>
          <p className="requests-queue-hint">
            Drag the handle or use ↑ ↓. The first row is next: it becomes <strong>In progress</strong> automatically when the robot has no
            active job.
          </p>
        </div>
        {queuedOrdered.length === 0 ? (
          <p className="requests-empty">
            No tasks waiting. New work from the robot or the form above appears here; the next item starts automatically when the robot is
            free.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={queuedOrdered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="requests-queue-list" aria-label="Draggable robot task queue">
                {queuedOrdered.map((task, index) => (
                  <SortableQueueRow
                    key={task.id}
                    task={task}
                    onRemove={() => removeRobotTask(task.id)}
                    onMoveUp={() => moveQueuedTask(task.id, "up")}
                    onMoveDown={() => moveQueuedTask(task.id, "down")}
                    disableUp={index === 0}
                    disableDown={index === queuedOrdered.length - 1}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <div className="requests-columns">
        <section className="card requests-side-card">
          <h2 className="requests-section-label">In progress</h2>
          <p className="requests-side-hint">Single active robot job. Pause stops auto-complete until you resume.</p>
          <ul className="requests-side-list">
            {inProgress.length === 0 ? (
              <li className="requests-empty requests-empty--inline">None — the next waiting task will appear here automatically.</li>
            ) : (
              inProgress.map((task) => (
                <li key={task.id} className="requests-side-item">
                  <div className="requests-side-item-top">
                    <QueuedByAside compact name={task.queuedByName} initials={task.queuedByInitials} />
                    <div className="requests-side-item-main">
                      <div className="requests-side-title">{task.title}</div>
                      {task.status === "paused" ? <div className="requests-progress-label">Task Paused</div> : (() => {
                        const progress = getInProgressTaskProgress(task);
                        if (!progress) return null;
                        return (
                          <div className="requests-progress" role="status" aria-live="polite">
                            <div className="requests-progress-track" aria-hidden>
                              <div className="requests-progress-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                            </div>
                            <div className="requests-progress-label">
                              Task completes in {Math.max(1, Math.ceil(progress.remainingMs / 1000))}s
                            </div>
                          </div>
                        );
                      })()}
                      <div className="requests-side-actions">
                        {task.status === "paused" ? (
                          <button type="button" className="requests-action-btn requests-action-btn--primary" onClick={() => resumeRobotTask(task.id)}>
                            Resume
                          </button>
                        ) : (
                          <button type="button" className="requests-action-btn requests-action-btn--primary" onClick={() => pauseRobotTask(task.id)}>
                            Pause
                          </button>
                        )}
                        <button type="button" className="requests-action-btn" onClick={() => updateRobotTaskStatus(task.id, "queued")}>
                          Back to queue
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="card requests-side-card">
          <h2 className="requests-section-label">Completed</h2>
          <ul className="requests-side-list">
            {completed.length === 0 ? (
              <li className="requests-empty requests-empty--inline">None</li>
            ) : (
              completed.map((task) => (
                <li key={task.id} className="requests-side-item">
                  <div className="requests-side-item-top">
                    <QueuedByAside compact name={task.queuedByName} initials={task.queuedByInitials} />
                    <div className="requests-side-item-main">
                      <div className="requests-side-title">{task.title}</div>
                      <div className="requests-side-actions">
                        <button type="button" className="requests-action-btn" onClick={() => updateRobotTaskStatus(task.id, "queued")}>
                          Reopen
                        </button>
                        <button type="button" className="requests-action-btn requests-action-btn--danger" onClick={() => removeRobotTask(task.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
