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
  sensor_data?: {
    cpu_usage_percent?: number;
    memory_usage_percent?: number;
    temperature_celsius?: number;
    navigation_accuracy_percent?: number;
  };
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

function fallbackStatus(): RobotStatus {
  return {
    state: "IDLE",
    batteryPercent: 90,
    locationLabel: "Dock",
    currentTaskSummary: "Charging",
    lastHeartbeat: new Date().toISOString(),
    cpuUsagePercent: 32,
    memoryUsagePercent: 54,
    temperatureCelsius: 41,
    navigationAccuracyPercent: 93,
  };
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
  const ct = dto.current_task;
  return {
    state: dto.status,
    batteryPercent: Math.round(dto.battery_level * 100),
    locationLabel: dto.current_location,
    currentTaskSummary: ct?.destination ?? undefined,
    currentRobotTask:
      ct?.task_id != null && String(ct.task_id).length > 0
        ? {
            taskId: String(ct.task_id),
            taskType: ct.task_type ?? "",
            destination: ct.destination ?? "",
          }
        : undefined,
    lastHeartbeat: dto.last_heartbeat,
    cpuUsagePercent: dto.sensor_data?.cpu_usage_percent,
    memoryUsagePercent: dto.sensor_data?.memory_usage_percent,
    temperatureCelsius: dto.sensor_data?.temperature_celsius,
    navigationAccuracyPercent: dto.sensor_data?.navigation_accuracy_percent,
  };
}

function normalizeStatuses(data: RobotStatusDto | RobotStatusDto[]): RobotStatus[] {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map(mapStatusDto);
}

export function createRobotServiceClient(): RobotServiceClient {
  const getAllStatuses: RobotServiceClient["getAllStatuses"] = async () => {
    const res = await apiFetch("/api/v1/robot/status");
    if (res.status === 404) {
      // Robot service may not be wired in some dev setups yet.
      return [fallbackStatus()];
    }
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
    if (res.status === 404) {
      return fallbackStatus();
    }
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

