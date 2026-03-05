import { apiFetch } from "./api";
import type { RobotState, RobotStatus } from "./robotTypes";

interface RobotStatusDto {
  id: string;
  robot_name: string;
  status: RobotState;
  current_location: string;
  battery_level: number;
  current_task?:
    | {
        task_id: string;
        task_type: string;
        destination: string;
      }
    | null;
  last_heartbeat: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export interface RobotServiceClient {
  /**
   * Overall status view.
   * Wraps GET /api/v1/robot/status, which may return a single object or an array.
   */
  getAllStatuses(): Promise<RobotStatus[]>;

  /**
   * Status for a specific robot.
   * Wraps GET /api/v1/robot/status/{robot_id}.
   */
  getStatus(robotId: string): Promise<RobotStatus>;

  /**
   * Optional polling-based subscription for all robot statuses.
   * Implementation uses getAllStatuses() under the hood.
   */
  subscribeAllStatuses?(onUpdate: (statuses: RobotStatus[]) => void): () => void;
}

function mapStatusDto(dto: RobotStatusDto): RobotStatus {
  return {
    state: dto.status,
    batteryPercent: Math.round(dto.battery_level * 100),
    locationLabel: dto.current_location,
    currentTaskSummary: dto.current_task?.destination ?? undefined,
    lastHeartbeat: dto.last_heartbeat,
  };
}

function normalizeStatuses(data: RobotStatusDto | RobotStatusDto[]): RobotStatus[] {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map(mapStatusDto);
}

export function createRobotServiceClient(): RobotServiceClient {
  const getAllStatuses: RobotServiceClient["getAllStatuses"] = async () => {
    const res = await apiFetch("/api/v1/robot/status");
    if (!res.ok) {
      throw new Error(`Failed to fetch robot statuses (${res.status})`);
    }
    const json = (await res.json()) as Envelope<RobotStatusDto | RobotStatusDto[]>;
    if (!json.success || !json.data) {
      throw new Error("Robot status response missing data");
    }
    return normalizeStatuses(json.data);
  };

  const getStatus: RobotServiceClient["getStatus"] = async (robotId) => {
    const res = await apiFetch(`/api/v1/robot/status/${encodeURIComponent(robotId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch robot status for ${robotId} (${res.status})`);
    }
    const json = (await res.json()) as Envelope<RobotStatusDto>;
    if (!json.success || !json.data) {
      throw new Error("Robot status response missing data");
    }
    return mapStatusDto(json.data);
  };

  const subscribeAllStatuses: RobotServiceClient["subscribeAllStatuses"] = (onUpdate) => {
    const poll = async () => {
      try {
        const statuses = await getAllStatuses();
        onUpdate(statuses);
      } catch {
        // Optional: route errors to a central error handler or toast.
      }
    };

    void poll();
    const id = window.setInterval(poll, 5000);
    return () => window.clearInterval(id);
  };

  return { getAllStatuses, getStatus, subscribeAllStatuses };
}

