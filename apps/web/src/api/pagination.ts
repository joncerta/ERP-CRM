export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageParams {
  page: number
  pageSize: number
  search?: string
  sortBy?: string
  sortDir?: 'ASC' | 'DESC'
}
