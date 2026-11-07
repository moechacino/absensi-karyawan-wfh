import { SelectField } from './SelectField'
import type { SelectFieldProps } from './SelectField'

/** Searchable resource picker; features own remote results and pagination. */
export function Combobox({
  placeholder = 'Cari atau pilih…',
  ...props
}: SelectFieldProps) {
  return <SelectField {...props} placeholder={placeholder} />
}
