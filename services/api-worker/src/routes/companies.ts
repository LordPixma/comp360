import { Hono } from 'hono'
import { z } from 'zod'
import { requireRole } from '@shared/auth'
import { generateId } from '@shared/crypto'
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/errors'
import type { Env } from '../index'

export const companiesRoutes = new Hono<{ Bindings: Env }>()

// Schema for updating company details
const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  region: z.enum(['EU', 'UK', 'US']).optional()
})

// Schema for inviting users
const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'contributor', 'auditor'])
})

// Middleware to check company access and role
async function checkCompanyAccess(c: any, requiredRoles: string[] = []) {
  const companyId = c.req.param('companyId')
  const userCompany = c.get('tenant') // This comes from JWT - represents user's company
  const userRole = c.get('role')
  
  // Ensure user can only access their own company
  if (companyId !== userCompany) {
    throw new ForbiddenError('Cannot access other companies')
  }
  
  // Check role if specified
  if (requiredRoles.length > 0 && requiredRoles.indexOf(userRole) === -1) {
    throw new ForbiddenError('Insufficient permissions')
  }
  
  return companyId
}

// GET /companies/{companyId} - Retrieve details of a specific company
companiesRoutes.get('/:companyId', async (c) => {
  const companyId = await checkCompanyAccess(c)
  
  const company = await c.env.DB.prepare(
    'SELECT id, name, region, created_at FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  if (!company) {
    throw new NotFoundError('Company not found')
  }
  
  return c.json({ company })
})

// PUT /companies/{companyId} - Update a company's details (company admin only)
companiesRoutes.put('/:companyId', async (c) => {
  const companyId = await checkCompanyAccess(c, ['owner', 'admin'])
  
  const body = await c.req.json()
  const data = UpdateCompanySchema.parse(body)
  
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided for update')
  }
  
  // Build dynamic update query
  const updates: string[] = []
  const values: any[] = []
  
  if (data.name) {
    updates.push('name = ?')
    values.push(data.name)
  }
  
  if (data.region) {
    updates.push('region = ?')
    values.push(data.region)
  }
  
  values.push(companyId)
  
  await c.env.DB.prepare(
    `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    companyId,
    c.get('user').sub,
    'company.update',
    companyId,
    new Date().toISOString(),
    JSON.stringify(data)
  ).run()
  
  // Return updated company
  const updatedCompany = await c.env.DB.prepare(
    'SELECT id, name, region, created_at FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  return c.json({ company: updatedCompany })
})

// GET /companies/{companyId}/users - List all users within a company
companiesRoutes.get('/:companyId/users', async (c) => {
  const companyId = await checkCompanyAccess(c)
  
  const users = await c.env.DB.prepare(`
    SELECT 
      u.id,
      u.email,
      u.name,
      u.created_at,
      m.role,
      m.added_at
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.tenant_id = ?
    ORDER BY m.added_at ASC
  `).bind(companyId).all()
  
  return c.json({ users: users.results })
})

// POST /companies/{companyId}/users - Invite a new user to a company
companiesRoutes.post('/:companyId/users', async (c) => {
  const companyId = await checkCompanyAccess(c, ['owner', 'admin'])
  
  const body = await c.req.json()
  const data = InviteUserSchema.parse(body)
  
  // Check if user already exists
  let user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(data.email).first()
  
  if (!user) {
    // Create new user
    const userId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(userId, data.email, new Date().toISOString()).run()
    
    user = { id: userId, email: data.email, name: null, created_at: new Date().toISOString() }
  }
  
  // Check if user is already a member of this company
  const existingMembership = await c.env.DB.prepare(
    'SELECT * FROM memberships WHERE tenant_id = ? AND user_id = ?'
  ).bind(companyId, user.id).first()
  
  if (existingMembership) {
    throw new ValidationError('User is already a member of this company')
  }
  
  // Add user to company
  await c.env.DB.prepare(
    'INSERT INTO memberships (tenant_id, user_id, role, added_at) VALUES (?, ?, ?, ?)'
  ).bind(companyId, user.id, data.role, new Date().toISOString()).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    companyId,
    c.get('user').sub,
    'user.invite',
    user.id,
    new Date().toISOString(),
    JSON.stringify({ email: data.email, role: data.role })
  ).run()
  
  // Return the user with membership info
  const userWithMembership = {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    role: data.role,
    added_at: new Date().toISOString()
  }
  
  return c.json({ user: userWithMembership }, 201)
})

// DELETE /companies/{companyId}/users/{userId} - Remove a user from a company
companiesRoutes.delete('/:companyId/users/:userId', async (c) => {
  const companyId = await checkCompanyAccess(c, ['owner', 'admin'])
  const userId = c.req.param('userId')
  const currentUserId = c.get('user').sub
  
  // Prevent users from removing themselves
  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot remove yourself from the company')
  }
  
  // Check if the user is a member of this company
  const membership = await c.env.DB.prepare(
    'SELECT * FROM memberships WHERE tenant_id = ? AND user_id = ?'
  ).bind(companyId, userId).first()
  
  if (!membership) {
    throw new NotFoundError('User is not a member of this company')
  }
  
  // Prevent removal of company owners (unless done by another owner)
  const currentUserRole = c.get('role')
  if (membership.role === 'owner' && currentUserRole !== 'owner') {
    throw new ForbiddenError('Only owners can remove other owners')
  }
  
  // Remove the membership
  await c.env.DB.prepare(
    'DELETE FROM memberships WHERE tenant_id = ? AND user_id = ?'
  ).bind(companyId, userId).run()
  
  // Get user info for audit log
  const user = await c.env.DB.prepare(
    'SELECT email FROM users WHERE id = ?'
  ).bind(userId).first()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    companyId,
    currentUserId,
    'user.remove',
    userId,
    new Date().toISOString(),
    JSON.stringify({ email: user?.email, role: membership.role })
  ).run()
  
  return c.json({ success: true })
})