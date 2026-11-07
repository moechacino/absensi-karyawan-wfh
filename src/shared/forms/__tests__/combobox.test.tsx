import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox } from '../Combobox'

const options = [
  { value: 'a', label: 'WIB · Jakarta' },
  { value: 'disabled', label: 'Tidak aktif', disabled: true },
  { value: 'b', label: 'WITA · Makassar' },
]

describe('Combobox', () => {
  it('filters locally, selects a value, and exposes listbox relationships', () => {
    const change = vi.fn()
    render(
      <Combobox label="Zona" options={options} value="a" onChange={change} />,
    )
    const input = screen.getByRole('combobox', { name: 'Zona' })
    fireEvent.change(input, { target: { value: 'WITA' } })
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute(
      'aria-controls',
      screen.getByRole('listbox').id,
    )
    expect(
      screen.queryByRole('option', { name: /WIB/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'WITA · Makassar' }))
    expect(change).toHaveBeenCalledWith('b')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports keyboard navigation without selecting disabled choices', () => {
    const change = vi.fn()
    render(
      <Combobox label="Zona" options={options} value="a" onChange={change} />,
    )
    const input = screen.getByRole('combobox')
    act(() => input.focus())
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Home' })
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: /WIB/ }).id,
    )
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(change).toHaveBeenCalledWith('b')
    expect(input).toHaveFocus()
  })

  it('closes Escape before bubbling it and restores the selected label', () => {
    const parentKey = vi.fn()
    const change = vi.fn()
    render(
      <div onKeyDown={parentKey}>
        <Combobox label="Zona" options={options} value="a" onChange={change} />
      </div>,
    )
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'teks bebas' } })
    expect(
      screen.getByText('Tidak ada pilihan yang cocok.'),
    ).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('')
    expect(screen.getByText('WIB · Jakarta')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(change).not.toHaveBeenCalled()
    expect(parentKey).not.toHaveBeenCalled()
  })

  it('does not commit arbitrary typed text or disabled options', () => {
    const change = vi.fn()
    render(
      <>
        <Combobox label="Zona" options={options} value="a" onChange={change} />
        <button>Di luar</button>
      </>,
    )
    const input = screen.getByRole('combobox')
    act(() => input.focus())
    fireEvent.click(screen.getByRole('option', { name: 'Tidak aktif' }))
    fireEvent.change(input, { target: { value: 'Bebas' } })
    fireEvent.blur(input, {
      relatedTarget: screen.getByRole('button', { name: 'Di luar' }),
    })
    expect(change).not.toHaveBeenCalled()
    expect(input).toHaveValue('')
    expect(screen.getByText('WIB · Jakarta')).toBeInTheDocument()
  })

  it('delegates remote search/pagination and keeps a supplied selected label', () => {
    const search = vi.fn(),
      more = vi.fn()
    render(
      <Combobox
        label="Karyawan"
        options={[]}
        value="employee-id"
        selectedLabel="Contoh karyawan"
        onChange={vi.fn()}
        onSearch={search}
        onLoadMore={more}
        hasMore
      />,
    )
    const input = screen.getByRole('combobox')
    expect(screen.getByText('Contoh karyawan')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Baru' } })
    expect(search).toHaveBeenCalledWith('Baru')
    fireEvent.click(
      screen.getByRole('button', { name: 'Muat pilihan lainnya' }),
    )
    expect(more).toHaveBeenCalledOnce()
  })

  it('announces loading and prevents selection when disabled', () => {
    const { rerender } = render(
      <Combobox
        label="Zona"
        options={[]}
        value=""
        loading
        onChange={vi.fn()}
      />,
    )
    act(() => screen.getByRole('combobox').focus())
    expect(screen.getByText('Memuat pilihan…')).toBeInTheDocument()
    rerender(
      <Combobox
        label="Zona"
        options={[]}
        value=""
        disabled
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Zona')).toBeDisabled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
  it('links hints/errors and forwards a focus ref and blur callback for form controllers', () => {
    const ref = {
      current: null as
        | import('react-select').SelectInstance<
            import('../SelectField').SelectOption,
            false
          >
        | null,
    }
    const blur = vi.fn()
    render(
      <Combobox
        label="Divisi"
        value="a"
        options={options}
        onChange={vi.fn()}
        hint="Pilih divisi aktif"
        error="Divisi wajib diisi"
        ref={ref}
        onBlur={blur}
        required
      />,
    )
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAccessibleDescription(
      'Pilih divisi aktif Divisi wajib diisi',
    )
    act(() => ref.current?.focus())
    expect(input).toHaveFocus()
    fireEvent.blur(input)
    expect(blur).toHaveBeenCalledOnce()
  })

  it('keeps remote results unfiltered and resets search when the menu closes', () => {
    const search = vi.fn()
    render(
      <Combobox
        label="Zona"
        value="a"
        options={options}
        onChange={vi.fn()}
        onSearch={search}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'query server' } })
    expect(
      screen.getByRole('option', { name: 'WITA · Makassar' }),
    ).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(search).toHaveBeenLastCalledWith('')
  })
})
