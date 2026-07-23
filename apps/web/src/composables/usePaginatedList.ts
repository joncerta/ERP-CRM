import { ref, reactive, computed, type Ref } from 'vue'
import { getErrorMessage } from '@/api/error'
import type { Paginated, PageParams } from '@/api/pagination'

/** Shared state machine behind every paginated grid: page/search/sort/
 * filters live here, the view only supplies the fetch function and reads
 * back items/total/loading/error. Mirrors the server-side contract in
 * TenantScopedService.findPaginatedForTenant so every list screen behaves
 * the same way. */
export function usePaginatedList<T, F extends object = Record<string, never>>(
  fetcher: (params: PageParams & F) => Promise<Paginated<T>>,
  options: { pageSize?: number; initialFilters?: F; defaultSortBy?: string } = {},
) {
  const items = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(1)
  const pageSize = options.pageSize ?? 25
  const loading = ref(true)
  const error = ref('')
  const search = ref('')
  const sortBy = ref<string | undefined>(options.defaultSortBy)
  const sortDir = ref<'ASC' | 'DESC'>('DESC')
  const filters = reactive<F>((options.initialFilters ?? {}) as F)

  const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const params = {
        page: page.value,
        pageSize,
        search: search.value.trim() || undefined,
        sortBy: sortBy.value,
        sortDir: sortDir.value,
        ...filters,
      } as PageParams & F
      const result = await fetcher(params)
      items.value = result.items
      total.value = result.total
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  /** Any change to search/filters/sort resets to page 1 — staying on page
   * 7 of a now-3-page result set would just show an empty table. */
  function applyAndReload() {
    page.value = 1
    return load()
  }

  function goToPage(next: number) {
    if (next < 1 || next > totalPages.value || next === page.value) return
    page.value = next
    return load()
  }

  function toggleSort(column: string) {
    if (sortBy.value === column) {
      sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
    } else {
      sortBy.value = column
      sortDir.value = 'ASC'
    }
    return applyAndReload()
  }

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    search,
    sortBy,
    sortDir,
    filters,
    load,
    applyAndReload,
    goToPage,
    toggleSort,
  }
}
