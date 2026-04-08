import { type FormEvent, useMemo, useState } from "react";

export type RobotTaskStatus = "todo" | "in_progress" | "completed";

export type RobotTask = {
  id: string;
  title: string;
  description: string;
  status: RobotTaskStatus;
  createdAt: string;
};

const STORAGE_KEY = "luna-robot-tasks-v1";

const COLUMN_META: { status: RobotTaskStatus; label: string; pillClass: string }[] = [
  { status: "todo", label: "To Do", pillClass: "maint-task-col-pill--todo" },
  { status: "in_progress", label: "In Progress", pillClass: "maint-task-col-pill--progress" },
  { status: "completed", label: "Completed", pillClass: "maint-task-col-pill--done" },
];

function defaultTasks(): RobotTask[] {
  const now = Date.now();
  return [
    {
      id: `seed-${now}-1`,
      title: "Pick up book — Reserve hold desk",
      description: "Collect “The Bluest Eye” for patron pickup at desk B.",
      status: "todo",
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
    },
    {
      id: `seed-${now}-2`,
      title: "Return bin pickup — Circulation",
      description: "Empty ground-floor return bin; deliver to sorting.",
      status: "in_progress",
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
    {
      id: `seed-${now}-3`,
      title: "Shelf reshelving — Stack A-12",
      description: "Reshelve cart items for fiction A–D.",
      status: "completed",
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function loadTasks(): RobotTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultTasks();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultTasks();
    const tasks: RobotTask[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as RobotTask).id === "string" &&
        typeof (item as RobotTask).title === "string" &&
        typeof (item as RobotTask).description === "string" &&
        ["todo", "in_progress", "completed"].includes((item as RobotTask).status) &&
        typeof (item as RobotTask).createdAt === "string"
      ) {
        tasks.push(item as RobotTask);
      }
    }
    return tasks;
  } catch {
    return defaultTasks();
  }
}

function saveTasks(tasks: RobotTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* ignore quota / private mode */
  }
}

function formatCreated(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return "";
  }
}

export default function RobotTaskBoard() {
  const [tasks, setTasks] = useState<RobotTask[]>(() => loadTasks());
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const persist = (next: RobotTask[]) => {
    setTasks(next);
    saveTasks(next);
  };

  const updateTaskStatus = (id: string, status: RobotTaskStatus) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const addTask = (e: FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const row: RobotTask = {
      id: crypto.randomUUID(),
      title,
      description: newDescription.trim(),
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    persist([row, ...tasks]);
    setNewTitle("");
    setNewDescription("");
  };

  const removeTask = (id: string) => {
    persist(tasks.filter((t) => t.id !== id));
  };

  const grouped = useMemo(() => {
    const todo: RobotTask[] = [];
    const in_progress: RobotTask[] = [];
    const completed: RobotTask[] = [];
    for (const t of tasks) {
      if (t.status === "todo") todo.push(t);
      else if (t.status === "in_progress") in_progress.push(t);
      else completed.push(t);
    }
    return { todo, in_progress, completed };
  }, [tasks]);

  const openCount = grouped.todo.length + grouped.in_progress.length;

  return (
    <>
      <header className="maint-card-header maint-task-board-header">
        <div>
          <div className="maint-card-title">Robot task queue</div>
          <div className="maint-card-subtitle">Create and assign work to LUNA. Tasks move through To Do → In Progress → Completed.</div>
        </div>
        <span className={`maint-pill ${openCount > 0 ? "maint-pill--active" : "maint-pill--good"}`}>
          {openCount} open
        </span>
      </header>

      <form className="maint-task-create" onSubmit={addTask}>
        <div className="maint-task-create-fields">
          <label className="maint-task-field">
            <span className="maint-task-field-label">Task title</span>
            <input
              className="maint-task-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder='e.g. Pick up a book from reserve desk'
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label className="maint-task-field">
            <span className="maint-task-field-label">Details (optional)</span>
            <textarea
              className="maint-task-textarea"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Location, call number, patron notes…"
              rows={2}
              maxLength={500}
            />
          </label>
        </div>
        <div className="maint-task-create-actions">
          <button type="submit" className="maint-report-btn" disabled={!newTitle.trim()}>
            Assign to robot
          </button>
          <span className="maint-task-assign-hint">New tasks start in To Do.</span>
        </div>
      </form>

      <div className="maint-task-board" role="region" aria-label="Robot tasks by status">
        {COLUMN_META.map(({ status, label, pillClass }) => {
          const list = grouped[status];
          return (
            <section key={status} className="maint-task-column" aria-labelledby={`maint-col-${status}`}>
              <div className="maint-task-column-head">
                <h3 className="maint-task-column-title" id={`maint-col-${status}`}>
                  {label}
                </h3>
                <span className={`maint-task-col-pill ${pillClass}`}>{list.length}</span>
              </div>
              <ul className="maint-task-column-list">
                {list.length === 0 ? (
                  <li className="maint-task-empty">No tasks</li>
                ) : (
                  list.map((task) => (
                    <li key={task.id} className="maint-task-card">
                      <div className="maint-task-card-body">
                        <div className="maint-task-title">{task.title}</div>
                        {task.description ? <div className="maint-task-detail">{task.description}</div> : null}
                        <div className="maint-task-meta">Assigned to LUNA · {formatCreated(task.createdAt)}</div>
                      </div>
                      <div className="maint-task-card-actions">
                        {status === "todo" && (
                          <>
                            <button type="button" className="maint-task-action-btn maint-task-action-btn--primary" onClick={() => updateTaskStatus(task.id, "in_progress")}>
                              Start
                            </button>
                            <button type="button" className="maint-task-action-btn" onClick={() => updateTaskStatus(task.id, "completed")}>
                              Mark complete
                            </button>
                          </>
                        )}
                        {status === "in_progress" && (
                          <>
                            <button type="button" className="maint-task-action-btn maint-task-action-btn--primary" onClick={() => updateTaskStatus(task.id, "completed")}>
                              Complete
                            </button>
                            <button type="button" className="maint-task-action-btn" onClick={() => updateTaskStatus(task.id, "todo")}>
                              To Do
                            </button>
                          </>
                        )}
                        {status === "completed" && (
                          <>
                            <button type="button" className="maint-task-action-btn" onClick={() => updateTaskStatus(task.id, "in_progress")}>
                              In progress
                            </button>
                            <button type="button" className="maint-task-action-btn" onClick={() => updateTaskStatus(task.id, "todo")}>
                              Reopen
                            </button>
                          </>
                        )}
                        <button type="button" className="maint-task-action-btn maint-task-action-btn--danger" onClick={() => removeTask(task.id)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
