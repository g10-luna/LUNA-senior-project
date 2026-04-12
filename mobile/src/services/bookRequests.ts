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
  /** Set when the student taps “I received my book” within the window. */
  student_confirmed_at?: string | null;
  /** Set when the 5-minute window expired without confirmation. */
  auto_closed_without_confirm_at?: string | null;
  /** Populated in some responses when catalog joins are available. */
  book_title?: string | null;
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

/** Student confirms they picked up the book after the robot run completed. */
export async function confirmDeliveryReceipt(requestId: string): Promise<BookRequestItem> {
  const res = await apiFetch(`/api/v1/requests/${encodeURIComponent(requestId)}/confirm-delivery`, {
    method: 'POST',
  });
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

/** List/detail badge label: distinguishes successful pickup vs auto-closed without confirmation. */
export function formatRequestListLabel(req: BookRequestItem): string {
  if (req.status === 'COMPLETED' && req.auto_closed_without_confirm_at) {
    return 'Not picked up';
  }
  if (req.status === 'COMPLETED' && req.student_confirmed_at) {
    return 'Picked up';
  }
  return formatRequestStatus(req.status);
}

/** Background/text colors for the status pill (list + detail). */
export function getRequestPillColors(req: BookRequestItem): { bg: string; text: string } {
  if (req.status === 'COMPLETED' && req.auto_closed_without_confirm_at) {
    return { bg: '#fef3c7', text: '#b45309' };
  }
  if (req.status === 'COMPLETED') {
    return { bg: '#dcfce7', text: '#15803d' };
  }
  switch (req.status) {
    case 'PENDING':
      return { bg: '#fef3c7', text: '#b45309' };
    case 'APPROVED':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'IN_PROGRESS':
      return { bg: '#ede9fe', text: '#6d28d9' };
    case 'CANCELLED':
      return { bg: '#f1f5f9', text: '#64748b' };
    default:
      return { bg: '#e0f2fe', text: '#0369a1' };
  }
}
