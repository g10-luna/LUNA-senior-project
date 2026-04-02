import { apiFetch } from './auth';

export interface TaskStatusEventItem {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  reason: string | null;
}

export type DeliveryTaskStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryTaskItem {
  id: string;
  request_id: string | null;
  return_id: string | null;
  task_type: string;
  status: DeliveryTaskStatus;
  source_location: string;
  destination_location: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  book_placed: boolean;
  book_placed_at: string | null;
  /** Included on task detail & request activity; omitted or empty on list endpoint. */
  status_history?: TaskStatusEventItem[];
}

export class DeliveryTasksApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryTasksApiError';
  }
}

function messageFromJson(res: Response, json: unknown): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const d = (json as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
  }
  return `Request failed (${res.status})`;
}

export async function listMyDeliveryTasks(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: DeliveryTaskItem[]; total: number; page: number; limit: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/deliveries/tasks?${q.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new DeliveryTasksApiError(messageFromJson(res, json));
  const data = json.data as Record<string, unknown> | undefined;
  if (!data || json.success === false) throw new DeliveryTasksApiError('Invalid response');
  const items = (data.items as DeliveryTaskItem[]) ?? [];
  const pagination = data.pagination as { total?: number; page?: number; limit?: number } | undefined;
  return {
    items,
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? page,
    limit: pagination?.limit ?? limit,
  };
}
