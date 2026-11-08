import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { SelectField } from '../../shared/forms/SelectField'
import { Button } from '../../shared/ui/Button'
import { ErrorState } from '../../shared/ui/Feedback'
import { organizationApi } from '../organization/api'

export function DivisionFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const api = useApi(),
    { profile } = useSession()
  const [q, setQ] = useState('')
  const query = useInfiniteQuery({
    queryKey: ['private', profile?.id, 'organization', 'division-filter', q],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      organizationApi(api).divisions(
        { q: q || undefined, page: pageParam, pageSize: 20 },
        signal,
      ),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
    enabled: Boolean(profile),
  })
  return (
    <div className="min-w-0 space-y-2">
      <SelectField
        label="Filter divisi"
        value={value}
        selectedLabel={value ? 'Divisi dari filter tersimpan' : undefined}
        options={
          query.data?.pages
            .flatMap((page) => page.items)
            .map((row) => ({
              value: row.id,
              label: `${row.name}${row.status === 'INACTIVE' ? ' (nonaktif)' : ''}`,
            })) ?? []
        }
        onChange={onChange}
        onSearch={setQ}
        loading={query.isFetching}
        hasMore={query.hasNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
      {value && (
        <Button variant="ghost" onClick={() => onChange('')}>
          Semua divisi
        </Button>
      )}
      {query.isError && (
        <ErrorState
          title="Filter divisi belum dimuat"
          onRetry={() => void query.refetch()}
        />
      )}
    </div>
  )
}
