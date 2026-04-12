import { useEffect, useRef } from "react";
import { enqueueRobotTaskFromTelemetry } from "../../lib/robotTasksStore";
import { useRobotStatus } from "../../lib/useRobotStatus";

/**
 * Subscribes to robot status and auto-enqueues new current_task payloads into the Requests queue.
 */
export default function AutoRobotTaskIngest() {
  const { statuses } = useRobotStatus();
  const lastIngestedId = useRef<string | null>(null);

  useEffect(() => {
    const robot = statuses?.[0];
    const task = robot?.currentRobotTask;
    if (!task?.taskId) return;
    if (lastIngestedId.current === task.taskId) return;
    lastIngestedId.current = task.taskId;
    enqueueRobotTaskFromTelemetry({
      taskId: task.taskId,
      taskType: task.taskType,
      destination: task.destination,
    });
  }, [statuses]);

  return null;
}
