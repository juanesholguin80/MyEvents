export interface ApiError {
  detail: string;
  code: string;
  fields: Record<string, string> | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
