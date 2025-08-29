import * as React from 'react'

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({ checked, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
      {...props}
    />
  )
}
