export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
