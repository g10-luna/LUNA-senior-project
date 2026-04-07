export type BookStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "CHECKED_OUT"
  | "RESERVED"
  | "LOW_STOCK"
  | string;

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  status?: BookStatus;
  shelf_location?: string | null;
  location?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  total_copies?: number;
  available_copies?: number;
  available?: boolean;
  category?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CatalogFilter = "all" | "available" | "unavailable" | "low_stock" | "custom";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface CatalogQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  status?: string;
}