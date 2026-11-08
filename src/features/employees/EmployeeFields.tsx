import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import { OrganizationFields } from '../organization/OrganizationFields'
import type { Employee, EmployeeDraft, EmployeeErrors } from './model'

export function EmployeeFields({
  draft,
  onChange,
  errors,
  disabled,
  existing,
  includeRole = true,
}: {
  draft: EmployeeDraft
  onChange: (patch: Partial<EmployeeDraft>) => void
  errors: EmployeeErrors
  disabled?: boolean
  existing?: Employee
  includeRole?: boolean
}) {
  return (
    <div className="space-y-4">
      <TextField
        label="Nama lengkap"
        value={draft.fullName}
        required
        maxLength={160}
        disabled={disabled}
        error={errors.fullName}
        onChange={(event) => onChange({ fullName: event.target.value })}
      />
      <TextField
        label="Email kantor"
        type="email"
        value={draft.email}
        required
        maxLength={254}
        disabled={disabled}
        error={errors.email}
        onChange={(event) => onChange({ email: event.target.value })}
      />
      <OrganizationFields
        divisionId={draft.divisionId}
        positionId={draft.positionId}
        onChange={onChange}
        existingDivision={existing?.division}
        existingPosition={existing?.position}
        errors={errors}
        disabled={disabled}
      />
      <SelectField
        label="Status akun"
        value={draft.status}
        disabled={disabled}
        options={[
          { value: 'ACTIVE', label: 'Aktif' },
          { value: 'INACTIVE', label: 'Nonaktif' },
        ]}
        onChange={(status) =>
          onChange({ status: status as EmployeeDraft['status'] })
        }
      />
      {includeRole && (
        <SelectField
          label="Peran akun"
          value={draft.role}
          disabled={disabled}
          options={[
            { value: 'EMPLOYEE', label: 'Karyawan' },
            { value: 'HRD', label: 'HRD' },
          ]}
          onChange={(role) => onChange({ role: role as EmployeeDraft['role'] })}
        />
      )}
    </div>
  )
}
