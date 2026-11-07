import { createContext, useContext, useId, useRef } from 'react'
import type { FocusEventHandler, Ref } from 'react'
import Select, { components } from 'react-select'
import type { InputProps, SelectInstance } from 'react-select'
import { Field } from './Field'
import { describedBy } from './fieldMetadata'
import type { FieldMetadata } from './fieldMetadata'
import { Button } from '../ui/Button'
import { classes } from '../ui/styles'
import { Icon } from '../icons/Icon'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectFieldProps extends FieldMetadata {
  options: readonly SelectOption[]
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  disabled?: boolean
  required?: boolean
  placeholder?: string
  selectedLabel?: string
  id?: string
  name?: string
  onBlur?: FocusEventHandler<HTMLInputElement>
  ref?: Ref<SelectInstance<SelectOption, false>>
  'aria-describedby'?: string
}

const FieldContext = createContext<{
  description?: string
}>({})

function SelectInput(props: InputProps<SelectOption, false>) {
  const { description } = useContext(FieldContext)
  return (
    <components.Input
      {...props}
      aria-describedby={
        [props['aria-describedby'], description].filter(Boolean).join(' ') ||
        undefined
      }
    />
  )
}

export function SelectField({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  onSearch,
  onLoadMore,
  hasMore,
  loading,
  disabled,
  required,
  selectedLabel,
  placeholder = 'Pilih…',
  id: suppliedId,
  name,
  onBlur,
  ref,
  'aria-describedby': description,
}: SelectFieldProps) {
  const menuOpen = useRef(false)
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const selected =
    options.find((option) => option.value === value) ??
    (value && selectedLabel ? { value, label: selectedLabel } : null)

  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <FieldContext.Provider
        value={{
          description: describedBy(id, hint, error, description),
        }}
      >
        <Select<SelectOption, false>
          ref={ref}
          inputId={id}
          instanceId={id}
          name={name}
          value={selected}
          options={options}
          onChange={(option) => onChange(option?.value ?? '')}
          onInputChange={(query, meta) => {
            if (meta.action === 'input-change' || meta.action === 'menu-close')
              onSearch?.(query)
          }}
          onBlur={onBlur}
          onMenuOpen={() => {
            menuOpen.current = true
          }}
          onMenuClose={() => {
            menuOpen.current = false
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menuOpen.current)
              event.stopPropagation()
          }}
          isOptionDisabled={(option) => Boolean(option.disabled)}
          filterOption={onSearch ? null : undefined}
          isDisabled={disabled}
          isLoading={loading}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          isClearable={false}
          openMenuOnFocus
          tabSelectsValue={false}
          blurInputOnSelect={false}
          menuIsOpen={disabled ? false : undefined}
          menuPlacement="auto"
          maxMenuHeight={240}
          unstyled
          components={{
            Input: SelectInput,
            IndicatorSeparator: null,
            DropdownIndicator: (props) => (
              <components.DropdownIndicator {...props}>
                <Icon
                  name="down"
                  className={props.selectProps.menuIsOpen ? 'rotate-180' : ''}
                />
              </components.DropdownIndicator>
            ),
          }}
          noOptionsMessage={() => 'Tidak ada pilihan yang cocok.'}
          loadingMessage={() => 'Memuat pilihan…'}
          screenReaderStatus={({ count }) => `${count} pilihan tersedia.`}
          ariaLiveMessages={{
            guidance: ({ context }) =>
              context === 'menu'
                ? 'Gunakan panah untuk menelusuri, Enter untuk memilih, Escape untuk menutup.'
                : 'Ketik untuk mencari. Gunakan panah untuk membuka pilihan.',
            onChange: ({ label: optionLabel }) =>
              `${optionLabel ?? ''} dipilih.`,
            onFocus: ({ focused }) => (focused ? focused.label : ''),
            onFilter: ({ resultsMessage }) => resultsMessage,
          }}
          classNames={{
            container: () => 'min-w-0 text-body',
            control: ({ isFocused, isDisabled }) =>
              classes(
                'min-h-13! rounded-control border px-4 py-2',
                error ? 'border-danger' : 'border-control-border',
                isFocused && 'outline-2! outline-offset-2! outline-forest!',
                isDisabled
                  ? 'cursor-not-allowed bg-surface-muted text-text-muted'
                  : 'bg-surface text-ink',
              ),
            valueContainer: () => 'gap-1',
            input: () => 'text-ink',
            singleValue: () => 'truncate',
            placeholder: () => 'text-text-muted',
            dropdownIndicator: () => 'ml-2 text-text-muted',
            loadingIndicator: () => 'mr-2 text-action',
            menu: () =>
              'z-30! my-2 overflow-hidden rounded-card border border-control-border bg-surface p-1 shadow-lg',
            menuList: () => 'space-y-1',
            option: ({ isFocused, isSelected, isDisabled }) =>
              classes(
                'min-h-touch rounded-control px-3 py-3 [overflow-wrap:anywhere]',
                isDisabled
                  ? 'cursor-not-allowed text-text-muted'
                  : 'cursor-pointer',
                isSelected
                  ? 'bg-action font-medium text-on-action'
                  : isFocused && 'bg-success-soft text-ink',
              ),
            noOptionsMessage: () => 'px-3 py-3 text-small text-text-muted',
            loadingMessage: () => 'px-3 py-3 text-small text-text-muted',
          }}
        />
      </FieldContext.Provider>
      {loading && options.length > 0 && (
        <p role="status" className="mt-2 text-small text-text-muted">
          Memuat pilihan…
        </p>
      )}
      {hasMore && onLoadMore && (
        <Button
          variant="ghost"
          disabled={disabled}
          busy={loading}
          className="mt-2"
          onClick={onLoadMore}
        >
          Muat pilihan lainnya
        </Button>
      )}
    </Field>
  )
}
