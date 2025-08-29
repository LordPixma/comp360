import * as React from 'react'
import { clsx } from 'clsx'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-6 border-b border-slate-200">{children}</div>
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={clsx('text-lg font-semibold', className)}>{children}</h3>
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 mt-1">{children}</p>
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>
}
