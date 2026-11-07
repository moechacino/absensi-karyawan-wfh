import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { classes, focusRing } from './styles'

export interface TabItem {
  value: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export function Tabs({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly TabItem[]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const [focusedValue, setFocusedValue] = useState<string>()
  const enabled = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => !item.disabled)
  const activeFocus =
    enabled.find((item) => item.value === focusedValue)?.value ??
    enabled.find((item) => item.value === value)?.value ??
    enabled[0]?.value
  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-2 border-b border-border"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocusedValue(undefined)
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={value === item.value}
            aria-controls={`${id}-panel-${index}`}
            disabled={item.disabled}
            tabIndex={activeFocus === item.value ? 0 : -1}
            className={classes(
              'min-h-touch rounded-t-control border-b-2 px-4 py-3 font-medium disabled:text-text-muted',
              focusRing,
              value === item.value
                ? 'border-action text-action'
                : 'border-transparent text-text-muted',
            )}
            onFocus={() => setFocusedValue(item.value)}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
                return
              event.preventDefault()
              let next = enabled.findIndex(
                (candidate) => candidate.value === item.value,
              )
              if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = enabled.length - 1
              else
                next =
                  (next +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    enabled.length) %
                  enabled.length
              buttons.current[enabled[next]?.index]?.focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={value !== item.value}
          tabIndex={0}
          className={classes('py-4', focusRing)}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
