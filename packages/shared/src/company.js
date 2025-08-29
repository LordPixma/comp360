export function enforceCompany(jwtCompany, row) {
    if (row.company_id !== jwtCompany) {
        throw new ForbiddenError('Cross-company access attempted');
    }
}
export function scopeToCompany(companyId, query) {
    return query.replace(/WHERE/i, `WHERE company_id = '${companyId}' AND`);
}
