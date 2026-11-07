import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button, IconButton } from '../Button'
import { Icon } from '../../icons/Icon'
import { Pagination } from '../Pagination'
import { Tabs } from '../Tabs'
import { Alert, ErrorState, LoadingState } from '../Feedback'
import { ResponsiveList } from '../ResponsiveList'

describe('buttons and icons', () => {
  it('does not submit a form unless the caller requests submit', () => {
    const submit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={submit}>
        <Button>Opsi</Button>
        <Button type="submit">Kirim</Button>
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Opsi' }))
    expect(submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(submit).toHaveBeenCalledOnce()
  })

  it('prevents duplicate clicks while busy and labels icon-only actions', () => {
    const click = vi.fn()
    render(
      <>
        <Button busy busyLabel="Mengirim…" onClick={click}>
          Simpan
        </Button>
        <IconButton icon="close" label="Tutup panel" />
        <Icon name="info" label="Informasi" />
      </>,
    )
    const button = screen.getByRole('button', { name: 'Mengirim…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(click).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Tutup panel' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Informasi' })).toBeInTheDocument()
  })
})

describe('pagination', () => {
  it('emits valid page changes and disables boundary controls', () => {
    const change = vi.fn()
    const { rerender } = render(
      <Pagination page={1} totalPages={3} onPageChange={change} />,
    )
    expect(
      screen.getByRole('button', { name: 'Halaman sebelumnya' }),
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }))
    expect(change).toHaveBeenLastCalledWith(2)
    rerender(<Pagination page={3} totalPages={3} onPageChange={change} />)
    expect(
      screen.getByRole('button', { name: 'Halaman berikutnya' }),
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Halaman sebelumnya' }))
    expect(change).toHaveBeenLastCalledWith(2)
  })

  it('handles an empty result and in-flight page without emitting changes', () => {
    const change = vi.fn()
    const { rerender } = render(
      <Pagination page={1} totalPages={0} onPageChange={change} />,
    )
    expect(screen.getByText('Tidak ada halaman')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button')
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true)
    rerender(<Pagination page={2} totalPages={3} onPageChange={change} busy />)
    fireEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }))
    expect(change).not.toHaveBeenCalled()
  })
})

describe('tabs', () => {
  const items = [
    { value: 'a', label: 'Pengajuan', content: 'Isi pengajuan' },
    {
      value: 'disabled',
      label: 'Nonaktif',
      content: 'Tidak tersedia',
      disabled: true,
    },
    { value: 'b', label: 'Saldo', content: 'Isi saldo' },
  ]

  it('roves focus across enabled tabs without activating panels prematurely', () => {
    const change = vi.fn()
    const { rerender } = render(
      <Tabs label="Kategori" items={items} value="a" onChange={change} />,
    )
    const first = screen.getByRole('tab', { name: 'Pengajuan' }),
      last = screen.getByRole('tab', { name: 'Saldo' })
    act(() => first.focus())
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(last).toHaveFocus()
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(last, { key: 'Home' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'End' })
    expect(last).toHaveFocus()
    fireEvent.click(last)
    expect(change).toHaveBeenCalledWith('b')
    rerender(
      <Tabs label="Kategori" items={items} value="b" onChange={change} />,
    )
    const panel = screen.getByRole('tabpanel', { name: 'Saldo' })
    expect(panel).toHaveTextContent('Isi saldo')
    expect(last).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('tab', { name: 'Nonaktif' })).toBeDisabled()
  })

  it('retains an enabled tab stop if the selected item becomes unavailable', () => {
    render(
      <Tabs
        label="Kategori"
        items={items}
        value="disabled"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Pengajuan' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })
})

describe('feedback and responsive content', () => {
  it('announces errors separately from ordinary status and loading', () => {
    const retry = vi.fn()
    render(
      <>
        <Alert title="Peringatan" tone="warning">
          Periksa data
        </Alert>
        <ErrorState onRetry={retry}>Koneksi terputus</ErrorState>
        <LoadingState label="Memuat riwayat…" />
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Koneksi terputus')
    expect(screen.getAllByRole('status')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('exposes table headers/caption and separate mobile cards without nested actions', () => {
    render(
      <ResponsiveList
        label="Daftar contoh"
        items={[{ id: '1', name: 'Karyawan contoh' }]}
        rowKey={(item) => item.id}
        columns={[
          {
            key: 'name',
            heading: 'Nama',
            render: (item) => <a href="#detail">{item.name}</a>,
          },
        ]}
        renderCard={(item) => <a href="#detail">{item.name}</a>}
        empty="Kosong"
      />,
    )
    const table = screen.getByRole('table', { name: 'Daftar contoh' })
    expect(
      within(table).getByRole('columnheader', { name: 'Nama' }),
    ).toHaveAttribute('scope', 'col')
    expect(within(table).getByRole('link')).toHaveTextContent('Karyawan contoh')
    expect(
      within(screen.getByRole('list', { name: 'Daftar contoh' })).getByRole(
        'link',
      ),
    ).toHaveTextContent('Karyawan contoh')
  })

  it('uses an explicit empty state instead of inventing a table row', () => {
    render(
      <ResponsiveList
        label="Daftar"
        items={[]}
        rowKey={() => ''}
        columns={[]}
        renderCard={() => null}
        empty={<p>Belum ada data.</p>}
      />,
    )
    expect(screen.getByText('Belum ada data.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
