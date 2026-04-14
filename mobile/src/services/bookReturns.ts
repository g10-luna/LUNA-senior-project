import { apiFetch } from './auth';
import type { Book } from './books';
import type { DeliveryTaskItem } from './deliveryTasks';

export type BookReturnStatus =
  | 'PENDING'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'AWAITING_STUDENT_LOAD'
  | 'READY_FOR_RETURN_LEG'
  | 'RETURN_IN_TRANSIT'
  | 'AWAITING_ADMIN_CONFIRM'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookReturnItem {
  id: string;
  user_id: string;
  book_id: string;
  pickup_location: string;
  status: BookReturnStatus;
  initiated_at: string;
  picked_up_at?: string | null;
  completed_at: string | null;
  student_confirmed_at?: string | null;
  student_book_loaded_at?: string | null;
  admin_receipt_confirmed_at?: string | null;
  auto_closed_without_confirm_at?: string | null;
  book_title?: string | null;
}

export class BookReturnApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookReturnApiError';
  }
}

function messageFromJson(res: Response, json: unknown): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const d = (json as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
  }
  return `Request failed (${res.status})`;
}

export interface ReturnActivityPayload {
  ret: BookReturnItem;
  task: DeliveryTaskItem | null;
  tasks: DeliveryTaskItem[];
}

/** Books delivered to you (confirmed) and checked out — eligible to start a return. */
export async function listReturnableBooks(): Promise<{ items: Book[]; count: number }> {
  const res = await apiFetch('/api/v1/returns/returnable-books');
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookReturnApiError(messageFromJson(res, json));
  const data = json.data as Record<string, unknown> | undefined;
  if (!data || json.success === false) throw new BookReturnApiError('Invalid response');
  const items = (data.items as Book[]) ?? [];
  const count = typeof data.count === 'number' ? data.count : items.length;
  return { items, count };
}

export async function listMyBookReturns(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: BookReturnItem[]; total: number; page: number; limit: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/returns/?${q.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookReturnApiError(messageFromJson(res, json));
  const data = json.data as Record<string, unknown> | undefined;
  if (!data || json.success === false) throw new BookReturnApiError('Invalid response');
  const items = (data.items as BookReturnItem[]) ?? [];
  const pagination = data.pagination as { total?: number; page?: number; limit?: number } | undefined;
  return {
    items,
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? page,
    limit: pagination?.limit ?? limit,
  };
}

export async function fetchReturnActivity(returnId: string): Promise<ReturnActivityPayload> {
  const res = await apiFetch(`/api/v1/returns/${encodeURIComponent(returnId)}/activity`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookReturnApiError(messageFromJson(res, json));
  const data = json.data as {
    return?: BookReturnItem;
    task?: DeliveryTaskItem | null;
    tasks?: DeliveryTaskItem[];
  } | undefined;
  if (!data?.return || json.success === false) throw new BookReturnApiError('Invalid response');
  const task = data.task === undefined ? null : data.task;
  const tasks = Array.isArray(data.tasks) ? data.tasks : task ? [task] : [];
  return { ret: data.return, task, tasks };
}

export async function createBookReturn(input: {
  bookId: string;
  pickupLocation: string;
}): Promise<BookReturnItem> {
  const res = await apiFetch('/api/v1/returns/', {
    method: 'POST',
    body: JSON.stringify({
      book_id: input.bookId,
      pickup_location: input.pickupLocation,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookReturnApiError(messageFromJson(res, json));
  const data = json.data as { return?: BookReturnItem } | undefined;
  if (!data?.return || json.success === false) throw new BookReturnApiError('Invalid response');
  return data.return;
}

export async function confirmReturnHandoff(returnId: string): Promise<BookReturnItem> {
  const res = await apiFetch(`/api/v1/returns/${encodeURIComponent(returnId)}/confirm-handoff`, {
    method: 'POST',
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new BookReturnApiError(messageFromJson(res, json));
  const data = json.data as { return?: BookReturnItem } | undefined;
  if (!data?.return || json.success === false) throw new BookReturnApiError('Invalid response');
  return data.return;
}

export function formatReturnListLabel(ret: BookReturnItem): string {
  if (ret.status === 'COMPLETED' && ret.auto_closed_without_confirm_at) {
    return 'Return not completed';
  }
  if (ret.status === 'COMPLETED') {
    return 'Returned';
  }
  switch (ret.status) {
    case 'PENDING':
      return 'Return pending';
    case 'PICKUP_SCHEDULED':
      return 'Return scheduled';
    case 'PICKED_UP':
      return 'Confirm handoff';
    case 'AWAITING_STUDENT_LOAD':
      return 'Confirm book on robot';
    case 'READY_FOR_RETURN_LEG':
      return 'Robot return queued';
    case 'RETURN_IN_TRANSIT':
      return 'Robot to desk';
    case 'AWAITING_ADMIN_CONFIRM':
      return 'Awaiting desk receipt';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return ret.status;
  }
}

export function getReturnPillColors(ret: BookReturnItem): { bg: string; text: string } {
  if (ret.status === 'COMPLETED' && ret.auto_closed_without_confirm_at) {
    return { bg: '#fef3c7', text: '#b45309' };
  }
  if (ret.status === 'COMPLETED') {
    return { bg: '#dcfce7', text: '#15803d' };
  }
  switch (ret.status) {
    case 'PENDING':
      return { bg: '#fef3c7', text: '#b45309' };
    case 'PICKUP_SCHEDULED':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'PICKED_UP':
      return { bg: '#ede9fe', text: '#6d28d9' };
    case 'AWAITING_STUDENT_LOAD':
      return { bg: '#fef3c7', text: '#b45309' };
    case 'READY_FOR_RETURN_LEG':
    case 'RETURN_IN_TRANSIT':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'AWAITING_ADMIN_CONFIRM':
      return { bg: '#e0e7ff', text: '#4338ca' };
    case 'CANCELLED':
      return { bg: '#f1f5f9', text: '#64748b' };
    default:
      return { bg: '#e0f2fe', text: '#0369a1' };
  }
}
