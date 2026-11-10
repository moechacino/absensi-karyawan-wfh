import type {
  Division,
  DivisionCreate,
  DivisionPage,
  DivisionPatch,
  Position,
  PositionCreate,
  PositionPage,
  PositionPatch,
} from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
import type { MasterFilters, MasterKind } from './model'

export function organizationApi(api: ApiClient) {
  return {
    divisions: (filters: MasterFilters, signal?: AbortSignal) =>
      api.request<DivisionPage>({
        path: '/hr/divisions',
        params: { ...filters, divisionId: undefined },
        signal,
      }),
    positions: (filters: MasterFilters, signal?: AbortSignal) =>
      api.request<PositionPage>({
        path: '/hr/positions',
        params: filters,
        signal,
      }),
    createDivision: (
      data: DivisionCreate,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<Division>({
        path: '/hr/divisions',
        method: 'POST',
        data,
        idempotencyKey: key,
        signal,
      }),
    createPosition: (
      data: PositionCreate,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<Position>({
        path: '/hr/positions',
        method: 'POST',
        data,
        idempotencyKey: key,
        signal,
      }),
    updateDivision: (
      id: string,
      data: DivisionPatch,
      signal?: AbortSignal,
    ) =>
      api.request<Division>({
        path: `/hr/divisions/${encodeURIComponent(id)}`,
        method: 'PATCH',
        data,
        signal,
      }),
    updatePosition: (
      id: string,
      data: PositionPatch,
      signal?: AbortSignal,
    ) =>
      api.request<Position>({
        path: `/hr/positions/${encodeURIComponent(id)}`,
        method: 'PATCH',
        data,
        signal,
      }),
  }
}

/** Masters have no detail GET. Resolve the latest row from their paginated list. */
export async function latestMaster(
  api: ApiClient,
  kind: MasterKind,
  id: string,
  code: string,
) {
  const services = organizationApi(api)
  let page = 1
  while (true) {
    const result = await services[kind]({ q: code, page, pageSize: 100 })
    const row = result.items.find((item) => item.id === id)
    if (row) return row
    if (page >= result.pagination.totalPages) return undefined
    page += 1
  }
}
