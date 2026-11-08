import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { organizationApi } from '../organization/api'
import { SelectField } from '../../shared/forms/SelectField'
export function DivisionFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const api = useApi(),
    { profile } = useSession(),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<{ value: string; label: string } | null>(
      null,
    )
  const query = useInfiniteQuery({
    queryKey: [
      'private',
      profile?.id,
      'organization',
      'monitoring-divisions',
      search,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      organizationApi(api).divisions(
        { page: pageParam, pageSize: 20, q: search || undefined },
        signal,
      ),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
  })
  const options = [
    { value: '', label: 'Semua divisi' },
    ...(query.data?.pages.flatMap((page) =>
      page.items.map((item) => ({ value: item.id, label: item.name })),
    ) ?? []),
  ]
  return (
    <SelectField
      label="Divisi"
      value={value}
      options={options}
      selectedLabel={
        selected?.value === value ? selected.label : 'Divisi terpilih'
      }
      onChange={(next) => {
        setSelected(options.find((option) => option.value === next) ?? null)
        onChange(next)
      }}
      onSearch={setSearch}
      loading={query.isFetching}
      hasMore={query.hasNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      error={
        query.isError
          ? 'Pilihan divisi belum dapat dimuat; coba ketik lagi.'
          : undefined
      }
    />
  )
}
