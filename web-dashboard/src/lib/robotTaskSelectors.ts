import type { RobotTask, RobotTasksState } from "./robotTasksStore";

/** Pure projection of store → ordered waiting list (queue priority, queued-only). */
export function selectQueuedOrderedTasks(state: RobotTasksState): RobotTask[] {
  const byId = new Map(state.tasks.map((t) => [t.id, t]));
  return state.queueOrder.map((id) => byId.get(id)).filter((t): t is RobotTask => !!t && t.status === "queued");
}

export function selectInProgressTasks(state: RobotTasksState): RobotTask[] {
  return state.tasks.filter((t) => t.status === "in_progress");
}

export function selectCompletedTasks(state: RobotTasksState): RobotTask[] {
  return state.tasks.filter((t) => t.status === "completed");
}

export function formatRobotTaskCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
