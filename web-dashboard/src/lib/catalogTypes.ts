export type BookStatus = "AVAILABLE" | "UNAVAILABLE" | "CHECKED_OUT" | "RESERVED" | "LOW_STOCK";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: BookStatus;
  shelf_location: string;
  total_copies?: number;
  available_copies?: number;
}

export type CatalogFilter = "all" | "available" | "unavailable" | "low_stock" | "custom";