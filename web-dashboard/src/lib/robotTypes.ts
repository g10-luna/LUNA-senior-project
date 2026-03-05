export type RobotState = "IDLE" | "NAVIGATING" | "BUSY" | "ERROR" | "MAINTENANCE";

export interface RobotStatus {
  state: RobotState;
  batteryPercent: number;
  locationLabel: string;
  currentTaskSummary?: string;
  lastHeartbeat: string;
}

