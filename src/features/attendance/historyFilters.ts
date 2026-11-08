import { isDateOnly } from '../../shared/dates/format'
export function historyFilters(params: URLSearchParams, companyDate?: string) {
  const from =
      params.get('from') ??
      (companyDate ? `${companyDate.slice(0, 7)}-01` : ''),
    to = params.get('to') ?? companyDate ?? ''
  const page = Number(params.get('page') ?? 1),
    pageSize = Number(params.get('pageSize') ?? 20)
  const valid =
    isDateOnly(from) &&
    isDateOnly(to) &&
    from <= to &&
    Number.isInteger(page) &&
    page >= 1 &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= 100
  return { from, to, page, pageSize, valid }
}
export function updateFilter(
  params: URLSearchParams,
  name: string,
  value: string,
  resetPage = true,
) {
  const next = new URLSearchParams(params)
  if (value) next.set(name, value)
  else next.delete(name)
  if (resetPage) next.set('page', '1')
  return next
}
export function isRecordId(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
  )
}
