import { AppError } from './errors'

export function enforceCompany<T extends { company_id: string }>(
  jwtCompany: string,
  row: T
): void {
  if (row.company_id !== jwtCompany) {
    throw new ForbiddenError('Cross-company access attempted')
  }
}

export function scopeToCompany(companyId: string, query: string): string {
  return query.replace(/WHERE/i, `WHERE company_id = '${companyId}' AND`)
}