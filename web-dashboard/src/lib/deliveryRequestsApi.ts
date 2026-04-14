import { apiFetch } from "./api";

export type BookRequestStatus = "PENDING" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface BookRequestRow {
  id: string;
  user_id: string;
  book_id: string;
  request_location: string;
  status: BookRequestStatus;
  requested_at: string;
  approved_at?: string | null;
  in_progress_at?: string | null;
  completed_at: string | null;
  notes: string | null;
  student_confirmed_at?: string | null;
  auto_closed_without_confirm_at?: string | null;
  student_display_name?: string | null;
  student_email?: string | null;
  book_title?: string | null;
}

export type DeliveryTaskStatus =
  | "PENDING"
  | "QUEUED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface DeliveryTaskRow {
  id: string;
  request_id: string | null;
  return_id?: string | null;
  task_type?: string;
  status: DeliveryTaskStatus;
  source_location: string;
  destination_location: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  book_placed: boolean;
  book_placed_at: string | null;
  delivery_eta_at: string | null;
  student_confirm_deadline_at?: string | null;
  return_pickup_leg?: string | null;
}

export type BookReturnStatus =
  | "PENDING"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "AWAITING_STUDENT_LOAD"
  | "READY_FOR_RETURN_LEG"
  | "RETURN_IN_TRANSIT"
  | "AWAITING_ADMIN_CONFIRM"
  | "COMPLETED"
  | "CANCELLED";

export interface BookReturnRow {
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
  student_display_name?: string | null;
  student_email?: string | null;
  book_title?: string | null;
}

function readDetail(json: unknown): string {
  if (json && typeof json === "object" && "detail" in json) {
    const d = (json as { detail: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(readDetail(json));
  const data = json.data as T | undefined;
  if (!data || json.success === false) throw new Error("Invalid response");
  return data;
}

export async function listBookRequestsForStaff(params?: { page?: number; limit?: number }): Promise<{
  items: BookRequestRow[];
  total: number;
}> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/requests/?${q.toString()}`);
  const data = await parseEnvelope<{ items: BookRequestRow[]; pagination: { total: number } }>(res);
  return { items: data.items ?? [], total: data.pagination?.total ?? 0 };
}

export async function listDeliveryTasksForStaff(params?: { page?: number; limit?: number }): Promise<{
  items: DeliveryTaskRow[];
}> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 100;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/deliveries/tasks?${q.toString()}`);
  const data = await parseEnvelope<{ items: DeliveryTaskRow[] }>(res);
  return { items: data.items ?? [] };
}

export async function approveStudentRequest(requestId: string): Promise<BookRequestRow> {
  const res = await apiFetch(`/api/v1/requests/${encodeURIComponent(requestId)}/approve`, { method: "POST" });
  const data = await parseEnvelope<{ request: BookRequestRow }>(res);
  return data.request;
}

export async function createPickupTask(requestId: string): Promise<DeliveryTaskRow> {
  const res = await apiFetch("/api/v1/deliveries/tasks", {
    method: "POST",
    body: JSON.stringify({ request_id: requestId }),
  });
  const data = await parseEnvelope<{ task: DeliveryTaskRow }>(res);
  return data.task;
}

export async function listBookReturnsForStaff(params?: { page?: number; limit?: number }): Promise<{
  items: BookReturnRow[];
  total: number;
}> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 80;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/v1/returns/?${q.toString()}`);
  const data = await parseEnvelope<{ items: BookReturnRow[]; pagination: { total: number } }>(res);
  return { items: data.items ?? [], total: data.pagination?.total ?? 0 };
}

export async function approveStudentReturn(returnId: string): Promise<BookReturnRow> {
  const res = await apiFetch(`/api/v1/returns/${encodeURIComponent(returnId)}/approve`, { method: "POST" });
  const data = await parseEnvelope<{ return: BookReturnRow }>(res);
  return data.return;
}

export async function createReturnPickupTask(returnId: string): Promise<DeliveryTaskRow> {
  const res = await apiFetch("/api/v1/deliveries/tasks", {
    method: "POST",
    body: JSON.stringify({ return_id: returnId }),
  });
  const data = await parseEnvelope<{ task: DeliveryTaskRow }>(res);
  return data.task;
}

export async function confirmBookPlacedOnRobot(taskId: string): Promise<DeliveryTaskRow> {
  const res = await apiFetch(`/api/v1/deliveries/tasks/${encodeURIComponent(taskId)}/book-placed`, {
    method: "POST",
  });
  const data = await parseEnvelope<{ task: DeliveryTaskRow }>(res);
  return data.task;
}

export async function startDeliveryRun(taskId: string): Promise<DeliveryTaskRow> {
  const res = await apiFetch(`/api/v1/deliveries/tasks/${encodeURIComponent(taskId)}/simulate-run`, {
    method: "POST",
  });
  const data = await parseEnvelope<{ task: DeliveryTaskRow }>(res);
  return data.task;
}

export async function confirmAdminReturnReceipt(returnId: string): Promise<BookReturnRow> {
  const res = await apiFetch(`/api/v1/returns/${encodeURIComponent(returnId)}/confirm-receipt`, {
    method: "POST",
  });
  const data = await parseEnvelope<{ return: BookReturnRow }>(res);
  return data.return;
}
