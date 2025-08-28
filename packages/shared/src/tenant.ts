export function enforceTenant<T extends { tenant_id: string }>(
  jwtTenant: string,
  row: T
): void {
  if (row.tenant_id !== jwtTenant) {
    throw new ForbiddenError('Cross-tenant access attempted')
  }
}

export function scopeToTenant(tenantId: string, query: string): string {
  return query.replace(/WHERE/i, `WHERE tenant_id = '${tenantId}' AND`)
}