import type { RobotState } from "./robotTypes";

export function getRobotStateLabel(state: RobotState): string {
  switch (state) {
    case "IDLE":
      return "Idle";
    case "NAVIGATING":
      return "Navigating";
    case "BUSY":
      return "Active";
    case "MAINTENANCE":
      return "Maintenance";
    case "ERROR":
    default:
      return "Error";
  }
}

export function getRobotStateBadgeColor(state: RobotState): string {
  switch (state) {
    case "IDLE":
      return "bg-muted text-muted-foreground";
    case "NAVIGATING":
    case "BUSY":
      return "bg-success text-success-foreground";
    case "MAINTENANCE":
      return "bg-warning text-warning-foreground";
    case "ERROR":
    default:
      return "bg-destructive text-destructive-foreground";
  }
}

