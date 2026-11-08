import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { getHolidayCalendar } from './api'
import { useHome } from '../home/api'
import { formatDate } from '../../shared/dates/format'
import { EmptyState, LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { TextField } from '../../shared/forms/TextField'

export default function HolidayCalendarPage() {
  const api = useApi(),
    { profile } = useSession(),
    home = useHome()
  const [params, setParams] = useSearchParams()
  const fallback = home.data
    ? Number(home.data.companyDate.slice(0, 4))
    : undefined
  const raw = params.get('year'),
    year = raw ? Number(raw) : fallback
  const valid =
    year !== undefined && Number.isInteger(year) && year >= 1970 && year <= 9999
  const query = useQuery({
    queryKey: ['private', profile?.id, 'holidays', year],
    queryFn: ({ signal }) => getHolidayCalendar(api, year!, signal),
    enabled: valid,
  })
  return (
    <div className="space-y-5">
      <Link to="/app" className="text-action underline">
        Beranda
      </Link>
      <h1 className="text-heading font-medium">Kalender hari libur</h1>
      <TextField
        label="Tahun"
        type="number"
        min={1970}
        max={9999}
        value={raw ?? fallback ?? ''}
        onChange={(event) => setParams({ year: event.target.value })}
        error={raw && !valid ? 'Masukkan tahun 1970–9999.' : undefined}
      />
      {!year && home.isError ? (
        <QueryError error={home.error} retry={() => void home.refetch()} />
      ) : !valid ? (
        <p className="text-text-muted">Pilih tahun yang valid.</p>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.items.length ? (
        <EmptyState title="Tidak ada hari libur">
          Belum ada hari libur perusahaan pada tahun {year}.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {query.data.items.map((holiday) => (
            <li
              key={holiday.date}
              className="flex flex-wrap justify-between gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium">{holiday.name}</p>
                <p className="text-small text-text-muted">
                  {
                    {
                      PUBLIC: 'Nasional',
                      COMPANY: 'Perusahaan',
                      OTHER: 'Lainnya',
                    }[holiday.category]
                  }
                </p>
              </div>
              <p>{formatDate(holiday.date)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
