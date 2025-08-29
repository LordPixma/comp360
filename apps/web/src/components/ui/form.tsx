import * as React from 'react'
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from 'react-hook-form'

export const Form = FormProvider

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>,
) {
  return <Controller {...props} />
}

export function FormItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={['space-y-2', className].filter(Boolean).join(' ')}>{children}</div>
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-700">{children}</label>
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const { formState } = useFormContext()
  // When used inside Controller render, children can be undefined; keep placeholder for spacing
  return (
    <p className="text-xs text-red-600 min-h-[1rem]">
      {children ?? formState.errors?.root?.message?.toString?.()}
    </p>
  )
}
