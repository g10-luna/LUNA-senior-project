export type RobotState = "IDLE" | "NAVIGATING" | "BUSY" | "ERROR" | "MAINTENANCE";

export interface RobotCurrentTask {
  taskId: string;
  taskType: string;
  destination: string;
}

export interface RobotStatus {
  state: RobotState;
  batteryPercent: number;
  locationLabel: string;
  currentTaskSummary?: string;
  /** When present, used to auto-queue work on the Requests tab */
  currentRobotTask?: RobotCurrentTask;
  lastHeartbeat: string;
}

