import * as React from 'react'

const DialogCtx = React.createContext<{ setOpen: (v: boolean) => void } | null>(null)

type DialogProps = React.PropsWithChildren<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}>

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(!!open)
  React.useEffect(() => setIsOpen(!!open), [open])
  const setOpen = (v: boolean) => {
    setIsOpen(v)
    onOpenChange?.(v)
  }
  return (
    <DialogCtx.Provider value={{ setOpen }}>
      <div aria-hidden={!isOpen} className={isOpen ? '' : 'hidden'}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {children}
        </div>
      </div>
    </DialogCtx.Provider>
  )
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(DialogCtx)
  const onClick = (e: React.MouseEvent) => {
    if (ctx) ctx.setOpen(true)
    if (React.isValidElement(children)) {
      // @ts-expect-error runtime invoke if present
      children.props?.onClick?.(e)
    }
  }
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { onClick })
  }
  return <button onClick={onClick}>{children}</button>
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={['bg-white rounded-lg shadow-lg w-full max-w-lg', className].filter(Boolean).join(' ')}>{children}</div>
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-b border-slate-200">{children}</div>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-t border-slate-200 flex justify-end gap-2">{children}</div>
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={["text-xl font-semibold", className].filter(Boolean).join(' ')}>{children}</h2>
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-600 text-sm mt-1">{children}</p>
}
