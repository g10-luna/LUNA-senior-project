import { useSyncExternalStore } from "react";
import { TELEMETRY_QUEUED_BY, displayNameToInitials } from "./queuedByProfile";

export type RobotTaskStatus = "queued" | "in_progress" | "completed";

export type RobotTask = {
  id: string;
  title: string;
  description: string;
  status: RobotTaskStatus;
  createdAt: string;
  /** Staff member who submitted the request (captured when queued, read-only in UI) */
  queuedByName: string;
  queuedByInitials: string;
  startedAt?: string;
  source?: "manual" | "robot_api";
  robotTaskId?: string;
};

export type RobotTasksState = {
  tasks: RobotTask[];
  queueOrder: string[];
};

const STORAGE_KEY = "luna-robot-tasks-v2";
const LEGACY_KEY = "luna-robot-tasks-v1";

const listeners = new Set<() => void>();

let state: RobotTasksState = loadInitialState();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeRobotTasks(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getRobotTasksSnapshot(): RobotTasksState {
  return state;
}

function persist(next: RobotTasksState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

function normalizeState(s: RobotTasksState): RobotTasksState {
  const queuedIds = new Set(s.tasks.filter((t) => t.status === "queued").map((t) => t.id));
  const queueOrder = s.queueOrder.filter((id) => queuedIds.has(id));
  for (const id of queuedIds) {
    if (!queueOrder.includes(id)) queueOrder.push(id);
  }
  return { tasks: s.tasks, queueOrder };
}

/** One robot: at most one in_progress; when idle, queue head auto-promotes. */
function reconcileSingleRobot(s: RobotTasksState): RobotTasksState {
  let tasks = s.tasks.map((t) => ({ ...t }));
  let queueOrder = [...s.queueOrder];

  let inProgress = tasks.filter((t) => t.status === "in_progress");

  if (inProgress.length > 1) {
    const scored = inProgress.map((t) => ({ t, key: t.startedAt ?? t.createdAt }));
    scored.sort((a, b) => a.key.localeCompare(b.key));
    for (const { t } of scored.slice(1)) {
      const idx = tasks.findIndex((x) => x.id === t.id);
      if (idx < 0) continue;
      tasks[idx] = { ...tasks[idx], status: "queued", startedAt: undefined };
      if (!queueOrder.includes(t.id)) queueOrder.push(t.id);
    }
    inProgress = tasks.filter((t) => t.status === "in_progress");
  }

  if (inProgress.length === 0) {
    while (queueOrder.length > 0) {
      const headId = queueOrder[0];
      const task = tasks.find((t) => t.id === headId);
      if (task && task.status === "queued") {
        const idx = tasks.indexOf(task);
        tasks[idx] = {
          ...task,
          status: "in_progress",
          startedAt: new Date().toISOString(),
        };
        queueOrder = queueOrder.filter((id) => id !== headId);
        break;
      }
      queueOrder = queueOrder.slice(1);
    }
  }

  return { tasks, queueOrder };
}

function finalizeState(raw: RobotTasksState): RobotTasksState {
  return normalizeState(reconcileSingleRobot(normalizeState(raw)));
}

function setState(next: RobotTasksState) {
  state = finalizeState(next);
  persist(state);
  emit();
}

function isTaskStatus(x: string): x is RobotTaskStatus {
  return x === "queued" || x === "in_progress" || x === "completed";
}

function taskFromUnknown(item: unknown): RobotTask | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.title !== "string" ||
    typeof o.description !== "string" ||
    typeof o.createdAt !== "string" ||
    !isTaskStatus(String(o.status))
  ) {
    return null;
  }
  const legacyAssignee = typeof o.assignee === "string" ? o.assignee.trim() : "";
  let queuedByName = typeof o.queuedByName === "string" ? o.queuedByName.trim() : "";
  if (!queuedByName && legacyAssignee) queuedByName = legacyAssignee;
  let queuedByInitials = typeof o.queuedByInitials === "string" ? String(o.queuedByInitials).trim().toUpperCase() : "";
  if (!queuedByInitials && queuedByName) queuedByInitials = displayNameToInitials(queuedByName);
  if (!queuedByName) {
    queuedByName = "Unknown";
    queuedByInitials = "?";
  }
  if (!queuedByInitials) queuedByInitials = "?";

  return {
    id: o.id,
    title: o.title,
    description: o.description,
    status: o.status as RobotTaskStatus,
    createdAt: o.createdAt,
    queuedByName,
    queuedByInitials,
    startedAt: typeof o.startedAt === "string" ? o.startedAt : undefined,
    source: o.source === "robot_api" || o.source === "manual" ? o.source : undefined,
    robotTaskId: typeof o.robotTaskId === "string" ? o.robotTaskId : undefined,
  };
}

function defaultState(): RobotTasksState {
  const now = Date.now();
  const t1: RobotTask = {
    id: `seed-${now}-1`,
    title: "Pick up book — Reserve hold desk",
    description: "Collect hold for patron pickup at desk B.",
    status: "queued",
    createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
    queuedByName: "Jordan Lee",
    queuedByInitials: "JL",
    source: "manual",
  };
  const t2: RobotTask = {
    id: `seed-${now}-2`,
    title: "Return bin pickup — Circulation",
    description: "Empty ground-floor return bin; deliver to sorting.",
    status: "in_progress",
    createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    startedAt: new Date(now - 40 * 60 * 1000).toISOString(),
    queuedByName: "Sam Rivera",
    queuedByInitials: "SR",
    source: "manual",
  };
  const t3: RobotTask = {
    id: `seed-${now}-3`,
    title: "Shelf reshelving — Stack A-12",
    description: "Reshelve cart items for fiction A–D.",
    status: "completed",
    createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    queuedByName: "Alex Kim",
    queuedByInitials: "AK",
    source: "manual",
  };
  return finalizeState({
    tasks: [t1, t2, t3],
    queueOrder: [t1.id],
  });
}

function migrateV1Legacy(arr: unknown[]): RobotTasksState {
  const tasks: RobotTask[] = [];
  const queueOrder: string[] = [];
  for (const item of arr) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as RobotTask).id !== "string" ||
      typeof (item as RobotTask).title !== "string" ||
      typeof (item as RobotTask).description !== "string" ||
      typeof (item as RobotTask).createdAt !== "string"
    ) {
      continue;
    }
    const raw = (item as { status?: string }).status;
    let status: RobotTaskStatus = "queued";
    if (raw === "todo") status = "queued";
    else if (raw === "in_progress") status = "in_progress";
    else if (raw === "completed") status = "completed";
    else if (isTaskStatus(raw ?? "")) status = raw as RobotTaskStatus;
    const id = (item as RobotTask).id;
    tasks.push({
      id,
      title: (item as RobotTask).title,
      description: (item as RobotTask).description,
      status,
      createdAt: (item as RobotTask).createdAt,
      queuedByName: "Unknown",
      queuedByInitials: "?",
      source: "manual",
    });
    if (status === "queued") queueOrder.push(id);
  }
  return finalizeState(normalizeState({ tasks, queueOrder }));
}

function loadInitialState(): RobotTasksState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { tasks?: unknown; queueOrder?: unknown };
      if (Array.isArray(p.tasks) && Array.isArray(p.queueOrder)) {
        const tasks: RobotTask[] = [];
        for (const item of p.tasks) {
          const t = taskFromUnknown(item);
          if (t) tasks.push(t);
        }
        return finalizeState(
          normalizeState({
            tasks,
            queueOrder: (p.queueOrder as string[]).filter((id) => typeof id === "string"),
          })
        );
      }
    }
    const leg = localStorage.getItem(LEGACY_KEY);
    if (leg) {
      const parsed = JSON.parse(leg) as unknown;
      if (Array.isArray(parsed) && parsed.length) {
        return migrateV1Legacy(parsed);
      }
    }
  } catch {
    /* fall through */
  }
  return defaultState();
}

export function useRobotTasksState() {
  return useSyncExternalStore(subscribeRobotTasks, getRobotTasksSnapshot, getRobotTasksSnapshot);
}

export function addRobotTaskToQueue(input: {
  title: string;
  description: string;
  queuedByName: string;
  queuedByInitials: string;
  source?: RobotTask["source"];
}) {
  const title = input.title.trim();
  if (!title) return;
  const id = crypto.randomUUID();
  const qbName = input.queuedByName.trim() || "Unknown";
  const task: RobotTask = {
    id,
    title,
    description: input.description.trim(),
    status: "queued",
    createdAt: new Date().toISOString(),
    queuedByName: qbName,
    queuedByInitials: (input.queuedByInitials.trim() || displayNameToInitials(qbName)).slice(0, 3).toUpperCase(),
    source: input.source ?? "manual",
  };
  setState({
    tasks: [task, ...state.tasks],
    queueOrder: [...state.queueOrder, id],
  });
}

export function enqueueRobotTaskFromTelemetry(payload: {
  taskId: string;
  taskType: string;
  destination: string;
}) {
  const { taskId, taskType, destination } = payload;
  if (!taskId || state.tasks.some((t) => t.robotTaskId === taskId)) return;
  const label = taskType.replace(/_/g, " ").trim() || "Robot task";
  const title = `${label} → ${destination || "destination TBD"}`;
  const id = crypto.randomUUID();
  const task: RobotTask = {
    id,
    title,
    description: `Auto-queued from robot telemetry (task ${taskId.slice(0, 8)}…).`,
    status: "queued",
    createdAt: new Date().toISOString(),
    queuedByName: TELEMETRY_QUEUED_BY.queuedByName,
    queuedByInitials: TELEMETRY_QUEUED_BY.queuedByInitials,
    source: "robot_api",
    robotTaskId: taskId,
  };
  setState({
    tasks: [task, ...state.tasks],
    queueOrder: [...state.queueOrder, id],
  });
}

export function reorderQueuedTasks(orderedIds: string[]) {
  const queued = new Set(state.tasks.filter((t) => t.status === "queued").map((t) => t.id));
  const next = orderedIds.filter((id) => queued.has(id));
  for (const id of queued) {
    if (!next.includes(id)) next.push(id);
  }
  setState({ ...state, queueOrder: next });
}

export function moveQueuedTask(id: string, direction: "up" | "down") {
  const q = [...state.queueOrder];
  const i = q.indexOf(id);
  if (i < 0) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= q.length) return;
  [q[i], q[j]] = [q[j], q[i]];
  setState({ ...state, queueOrder: q });
}

export function updateRobotTaskStatus(id: string, status: RobotTaskStatus) {
  let queueOrder = [...state.queueOrder];
  if (status !== "queued") {
    queueOrder = queueOrder.filter((x) => x !== id);
  } else if (!queueOrder.includes(id)) {
    queueOrder.push(id);
  }
  setState({
    tasks: state.tasks.map((t) => {
      if (t.id !== id) return t;
      const next: RobotTask = { ...t, status };
      if (status === "queued") {
        next.startedAt = undefined;
      }
      return next;
    }),
    queueOrder,
  });
}

export function removeRobotTask(id: string) {
  setState({
    tasks: state.tasks.filter((t) => t.id !== id),
    queueOrder: state.queueOrder.filter((x) => x !== id),
  });
}
