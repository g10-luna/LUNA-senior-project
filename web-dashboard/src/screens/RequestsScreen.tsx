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
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentQueuerProfile } from "../lib/queuedByProfile";
import {
  addRobotTaskToQueue,
  moveQueuedTask,
  removeRobotTask,
  reorderQueuedTasks,
  type RobotTask,
  updateRobotTaskStatus,
  useRobotTasksState,
} from "../lib/robotTasksStore";
import "./RequestsScreen.css";

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
  onComplete,
  onRemove,
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  task: RobotTask;
  onComplete: () => void;
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
        <button type="button" className="requests-action-btn" onClick={onComplete}>
          Complete
        </button>
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
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const queuerPreview = getCurrentQueuerProfile();

  const queuedOrdered = useMemo(() => {
    const byId = new Map(store.tasks.map((t) => [t.id, t]));
    return store.queueOrder.map((id) => byId.get(id)).filter((t): t is RobotTask => !!t && t.status === "queued");
  }, [store.tasks, store.queueOrder]);

  const inProgress = useMemo(() => store.tasks.filter((t) => t.status === "in_progress"), [store.tasks]);
  const completed = useMemo(() => store.tasks.filter((t) => t.status === "completed"), [store.tasks]);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (id !== "queue") return;
    const el = document.getElementById("requests-queue");
    if (!el) return;
    window.requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash]);

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
    const q = getCurrentQueuerProfile();
    addRobotTaskToQueue({
      title: newTitle,
      description: newDescription,
      queuedByName: q.queuedByName,
      queuedByInitials: q.queuedByInitials,
      source: "manual",
    });
    setNewTitle("");
    setNewDescription("");
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

      <form className="card requests-add-form" onSubmit={onSubmitManual}>
        <h2 className="requests-section-label">Add to queue</h2>
        <div className="requests-add-fields">
          <label className="requests-field">
            <span className="requests-field-label">Task title</span>
            <input
              className="requests-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Pick up returns — desk 2"
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label className="requests-field">
            <span className="requests-field-label">Details (optional)</span>
            <textarea
              className="requests-textarea"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Call number, patron, location…"
              rows={2}
              maxLength={500}
            />
          </label>
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
          <button type="submit" className="requests-submit-btn" disabled={!newTitle.trim()}>
            Add to queue
          </button>
        </div>
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
                    onComplete={() => updateRobotTaskStatus(task.id, "completed")}
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
          <p className="requests-side-hint">Single active robot job. Completing it starts the next waiting task.</p>
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
                      <div className="requests-side-actions">
                        <button type="button" className="requests-action-btn requests-action-btn--primary" onClick={() => updateRobotTaskStatus(task.id, "completed")}>
                          Complete
                        </button>
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
