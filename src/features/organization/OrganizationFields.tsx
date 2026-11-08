import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { SelectField } from '../../shared/forms/SelectField'
import { ErrorState } from '../../shared/ui/Feedback'
import { organizationApi } from './api'
import { changeDivision, retainedLabel } from './model'
import type { MasterSummary } from './model'

interface OrganizationFieldsProps {
  divisionId: string
  positionId?: string
  onChange: (value: { divisionId: string; positionId: string }) => void
  existingDivision?: MasterSummary
  existingPosition?: MasterSummary
  disabled?: boolean
  divisionOnly?: boolean
  errors?: { divisionId?: string; positionId?: string }
}

export function OrganizationFields({
  divisionId,
  positionId = '',
  onChange,
  existingDivision,
  existingPosition,
  disabled,
  divisionOnly,
  errors,
}: OrganizationFieldsProps) {
  const api = useApi()
  const { profile } = useSession()
  const [divisionSearch, setDivisionSearch] = useState('')
  const [positionSearch, setPositionSearch] = useState('')
  const services = organizationApi(api)
  const divisions = useInfiniteQuery({
    queryKey: [
      'private',
      profile?.id,
      'organization',
      'division-options',
      divisionSearch,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      services.divisions(
        {
          q: divisionSearch || undefined,
          status: 'ACTIVE',
          page: pageParam,
          pageSize: 20,
        },
        signal,
      ),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    enabled: Boolean(profile),
  })
  const positions = useInfiniteQuery({
    queryKey: [
      'private',
      profile?.id,
      'organization',
      'position-options',
      divisionId,
      positionSearch,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      services.positions(
        {
          q: positionSearch || undefined,
          divisionId,
          status: 'ACTIVE',
          page: pageParam,
          pageSize: 20,
        },
        signal,
      ),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    enabled: Boolean(profile && divisionId && !divisionOnly),
  })
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <SelectField
          label="Divisi"
          required
          value={divisionId}
          options={
            divisions.data?.pages
              .flatMap((page) => page.items)
              .map((row) => ({
                value: row.id,
                label: `${row.name} · ${row.code}`,
              })) ?? []
          }
          selectedLabel={
            divisionId === existingDivision?.id
              ? retainedLabel(existingDivision)
              : undefined
          }
          disabled={disabled}
          onSearch={setDivisionSearch}
          loading={divisions.isFetching}
          hasMore={divisions.hasNextPage}
          onLoadMore={() => void divisions.fetchNextPage()}
          error={errors?.divisionId}
          hint="Penetapan baru menggunakan divisi aktif."
          onChange={(id) => {
            setPositionSearch('')
            onChange(changeDivision(id))
          }}
        />
        {divisions.isError && (
          <ErrorState
            title="Pilihan divisi belum tersedia"
            onRetry={() => void divisions.refetch()}
          />
        )}
      </div>
      {!divisionOnly && (
        <div className="min-w-0 space-y-2">
          <SelectField
            label="Posisi"
            required
            value={positionId}
            options={
              positions.data?.pages
                .flatMap((page) => page.items)
                .map((row) => ({
                  value: row.id,
                  label: `${row.name} · ${row.code}`,
                })) ?? []
            }
            selectedLabel={
              positionId === existingPosition?.id
                ? retainedLabel(existingPosition)
                : undefined
            }
            disabled={disabled || !divisionId}
            onSearch={setPositionSearch}
            loading={positions.isFetching}
            hasMore={positions.hasNextPage}
            onLoadMore={() => void positions.fetchNextPage()}
            error={errors?.positionId}
            hint={
              divisionId
                ? 'Posisi aktif dari divisi yang dipilih.'
                : 'Pilih divisi terlebih dahulu.'
            }
            onChange={(id) => onChange({ divisionId, positionId: id })}
          />
          {positions.isError && (
            <ErrorState
              title="Pilihan posisi belum tersedia"
              onRetry={() => void positions.refetch()}
            />
          )}
        </div>
      )}
    </div>
  )
}
