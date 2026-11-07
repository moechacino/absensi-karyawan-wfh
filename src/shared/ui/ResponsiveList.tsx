import type { ReactNode } from 'react'
import { focusRing } from './styles'

export interface ListColumn<T> {
  key: string
  heading: string
  render: (item: T) => ReactNode
}

export function ResponsiveList<T>({
  label,
  items,
  columns,
  rowKey,
  renderCard,
  empty,
}: {
  label: string
  items: readonly T[]
  columns: readonly ListColumn<T>[]
  rowKey: (item: T) => string
  renderCard: (item: T) => ReactNode
  empty: ReactNode
}) {
  if (!items.length) return <>{empty}</>
  return (
    <>
      <div
        role="region"
        aria-label={`${label}, tabel`}
        tabIndex={0}
        className={`hidden overflow-x-auto rounded-card border border-border md:block ${focusRing}`}
      >
        <table className="w-full table-fixed text-left text-small">
          <caption className="sr-only">{label}</caption>
          <thead className="bg-canvas">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {items.map((item) => (
              <tr key={rowKey(item)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-4 align-top [overflow-wrap:anywhere]"
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label={label} className="space-y-3 md:hidden">
        {items.map((item) => (
          <li
            key={rowKey(item)}
            className="min-w-0 rounded-card border border-border bg-surface p-4 [overflow-wrap:anywhere]"
          >
            {renderCard(item)}
          </li>
        ))}
      </ul>
    </>
  )
}
