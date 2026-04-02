import { apiFetch } from './auth';
import type { DeliveryTaskItem } from './deliveryTasks';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookRequestItem {
  id: string;
  user_id: string;
  book_id: string;
  request_location: string;
  status: RequestStatus;
  requested_at: string;
  /** Set when staff approves (server timestamps). */
  approved_at?: string | null;
  /** Set when a delivery task is created (pickup workflow started). */
  in_progress_at?: string | null;
  completed_at: string | null;
  notes: string | null;
}

export class BookRequestApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookRequestApiError';
  }
}

function messageFromJson(res: Response, json: unknown): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const d = (json as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
  }
  return `Request failed (${res.status})`;
}

export async function listMyBookRequests(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: BookRequestItem[]; total: number; page: number; limit: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/requests/?${q.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookRequestApiError(messageFromJson(res, json));
  const data = json.data as Record<string, unknown> | undefined;
  if (!data || json.success === false) throw new BookRequestApiError('Invalid response');
  const items = (data.items as BookRequestItem[]) ?? [];
  const pagination = data.pagination as { total?: number; page?: number; limit?: number } | undefined;
  return {
    items,
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? page,
    limit: pagination?.limit ?? limit,
  };
}

export interface RequestActivityPayload {
  request: BookRequestItem;
  task: DeliveryTaskItem | null;
}

/** Request + linked task and full status history for the delivery timeline (single round-trip). */
export async function fetchRequestActivity(requestId: string): Promise<RequestActivityPayload> {
  const res = await apiFetch(`/api/v1/requests/${encodeURIComponent(requestId)}/activity`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookRequestApiError(messageFromJson(res, json));
  const data = json.data as
    | { request?: BookRequestItem; task?: DeliveryTaskItem | null }
    | undefined;
  if (!data?.request || json.success === false) throw new BookRequestApiError('Invalid response');
  const task = data.task === undefined ? null : data.task;
  return { request: data.request, task };
}

export async function getBookRequest(requestId: string): Promise<BookRequestItem> {
  const res = await apiFetch(`/api/v1/requests/${encodeURIComponent(requestId)}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookRequestApiError(messageFromJson(res, json));
  const data = json.data as { request?: BookRequestItem } | undefined;
  if (!data?.request || json.success === false) throw new BookRequestApiError('Invalid response');
  return data.request;
}

export async function createBookRequest(input: {
  bookId: string;
  requestLocation: string;
  notes?: string | null;
}): Promise<BookRequestItem> {
  const res = await apiFetch('/api/v1/requests/', {
    method: 'POST',
    body: JSON.stringify({
      book_id: input.bookId,
      request_location: input.requestLocation,
      notes: input.notes ?? null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookRequestApiError(messageFromJson(res, json));
  const data = json.data as { request?: BookRequestItem } | undefined;
  if (!data?.request || json.success === false) throw new BookRequestApiError('Invalid response');
  return data.request;
}

export function formatRequestStatus(status: RequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}
