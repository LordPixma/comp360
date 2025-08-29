import * as React from 'react'
import { clsx } from 'clsx'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2',
          variant === 'outline'
            ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
            : 'bg-slate-900 text-white hover:bg-slate-800',
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
