import { useState } from 'react'
import { TextField } from './TextField'
import type { TextFieldProps } from './TextField'
import { IconButton } from '../ui/Button'

export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <IconButton
          icon="eye"
          label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${props.label.toLocaleLowerCase('id-ID')}`}
          aria-pressed={visible}
          disabled={props.disabled}
          onClick={() => setVisible((value) => !value)}
        />
      }
    />
  )
}
