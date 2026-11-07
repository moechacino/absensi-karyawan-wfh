import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TextField, TextAreaField } from '../TextField'
import { PasswordField } from '../PasswordField'
import { SelectField } from '../SelectField'
import { DateRangeField } from '../DateRangeField'
import { FileField } from '../FileField'

describe('labeled fields', () => {
  it('associates label, hint, external description, and error without losing a ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(
      <>
        <p id="external">Petunjuk tambahan</p>
        <TextField
          ref={ref}
          label="Email"
          hint="Gunakan email kantor."
          error="Email tidak valid."
          aria-describedby="external"
          required
        />
      </>,
    )
    const field = screen.getByRole('textbox', { name: /Email/ })
    expect(ref.current).toBe(field)
    expect(field).toBeRequired()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(
      'Petunjuk tambahan Gunakan email kantor. Email tidak valid.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Email tidak valid.')
  })

  it('removes a resolved error association while preserving the hint and input', () => {
    const { rerender } = render(
      <TextField
        label="Nama"
        hint="Nama lengkap"
        error="Wajib diisi"
        defaultValue="Contoh"
      />,
    )
    rerender(
      <TextField label="Nama" hint="Nama lengkap" defaultValue="Contoh" />,
    )
    expect(screen.getByLabelText('Nama')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Nama')).toHaveAccessibleDescription(
      'Nama lengkap',
    )
    expect(screen.getByLabelText('Nama')).toHaveValue('Contoh')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps textarea semantics and exposes controlled select values', () => {
    const change = vi.fn()
    render(
      <>
        <TextAreaField label="Alasan" hint="Jelaskan kebutuhan" />
        <SelectField
          label="Divisi"
          onChange={change}
          value="a"
          options={[
            { value: 'a', label: 'Aktif' },
            { value: 'b', label: 'Nonaktif', disabled: true },
          ]}
        />
      </>,
    )
    expect(
      screen.getByRole('textbox', { name: 'Alasan' }),
    ).toHaveAccessibleDescription('Jelaskan kebutuhan')
    fireEvent.focus(screen.getByRole('combobox', { name: 'Divisi' }))
    expect(screen.getByRole('option', { name: 'Nonaktif' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    fireEvent.click(screen.getByRole('option', { name: 'Aktif' }))
    expect(change).toHaveBeenCalledWith('a')
  })

  it('changes password visibility without changing or normalizing its value', () => {
    render(
      <PasswordField
        label="Kata sandi"
        defaultValue="  kalimat sandi  "
        autoComplete="current-password"
      />,
    )
    const input = screen.getByLabelText('Kata sandi')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(
      screen.getByRole('button', { name: 'Tampilkan kata sandi' }),
    )
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('  kalimat sandi  ')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
    expect(
      screen.getByRole('button', { name: 'Sembunyikan kata sandi' }),
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(
      screen.getByRole('button', { name: 'Sembunyikan kata sandi' }),
    )
    expect(input).toHaveAttribute('type', 'password')
  })

  it('preserves the other date and does not impose a today restriction', () => {
    const change = vi.fn()
    render(
      <DateRangeField
        value={{ startDate: '2025-12-01', endDate: '2025-12-03' }}
        onChange={change}
      />,
    )
    const start = screen.getByLabelText('Tanggal mulai')
    fireEvent.change(start, { target: { value: '2025-11-30' } })
    expect(change).toHaveBeenCalledWith({
      startDate: '2025-11-30',
      endDate: '2025-12-03',
    })
    expect(start).not.toHaveAttribute('min')
  })
})

describe('local file selection', () => {
  const file = new File(['sample'], 'bukti-dengan-nama-panjang.pdf', {
    type: 'application/pdf',
  })

  it('returns selected bytes and permits reselecting the same file without uploading', () => {
    const change = vi.fn()
    render(
      <FileField
        label="Lampiran"
        file={null}
        onChange={change}
        accept="application/pdf"
      />,
    )
    const input = screen.getByLabelText('Lampiran')
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [file] } })
    expect(change).toHaveBeenCalledTimes(2)
    expect(change).toHaveBeenLastCalledWith(file)
    expect(input).toHaveValue('')
  })

  it('does not clear an existing selection when the picker is cancelled', () => {
    const change = vi.fn()
    render(<FileField label="Lampiran" file={file} onChange={change} />)
    fireEvent.change(screen.getByLabelText('Lampiran'), {
      target: { files: [] },
    })
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByText(file.name)).toBeInTheDocument()
  })

  it('removes only the file while preserving other parent-owned fields', () => {
    function Example() {
      const [selected, setSelected] = useState<File | null>(file)
      const [reason, setReason] = useState('Alasan tetap tersimpan')
      return (
        <>
          <TextField
            label="Alasan"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <FileField label="Lampiran" file={selected} onChange={setSelected} />
        </>
      )
    }
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: `Hapus ${file.name}` }))
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Alasan')).toHaveValue(
      'Alasan tetap tersimpan',
    )
  })

  it('disables selection/removal while pending and associates server errors', () => {
    const change = vi.fn()
    render(
      <FileField
        label="Lampiran"
        file={file}
        onChange={change}
        busy
        error="File tidak diterima"
      />,
    )
    expect(screen.getByLabelText('Lampiran')).toBeDisabled()
    expect(screen.getByLabelText('Lampiran')).toHaveAccessibleDescription(
      'File tidak diterima',
    )
    fireEvent.click(screen.getByRole('button', { name: `Hapus ${file.name}` }))
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Mengirim pengajuan')
  })
})
