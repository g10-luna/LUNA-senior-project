export type RobotState = "IDLE" | "NAVIGATING" | "BUSY" | "ERROR" | "MAINTENANCE";

export interface RobotStatus {
  state: RobotState;
  batteryPercent: number;
  locationLabel: string;
  currentTaskSummary?: string;
  lastHeartbeat: string;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  temperatureCelsius?: number;
  navigationAccuracyPercent?: number;
}

