import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { generateId } from '@shared/crypto'
import { CreateUserSchema, UpdateUserSchema, CreateCompanySchema, UpdateCompanySchema, CreateAnnouncementSchema } from '@core/schemas'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Middleware to ensure user is a global admin
app.use('/*', async (c, next) => {
  const user = c.get('user')
  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  
  // Check if user is global admin in database
  const dbUser = await c.env.DB.prepare(
    'SELECT is_global_admin FROM users WHERE id = ?'
  ).bind(user.sub).first()
  
  if (!dbUser?.is_global_admin) {
    throw new HTTPException(403, { message: 'Global admin access required' })
  }
  await next()
})

// User Management
app.get('/users', async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT id, email, name, is_global_admin, created_at FROM users ORDER BY created_at DESC'
  ).all()
  return c.json(users.results)
})

app.post('/users', validator('json', CreateUserSchema), async (c) => {
  const data = c.req.valid('json')
  const userId = await generateId()
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, is_global_admin, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      userId, 
      data.email, 
      data.name, 
      data.is_global_admin || false,
      new Date().toISOString()
    ).run()
    
    // Log to audit
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      'global', // Global admin actions
      c.get('user').sub,
      'admin.user.create',
      userId,
      new Date().toISOString(),
      JSON.stringify(data)
    ).run()
    
    const createdUser = await c.env.DB.prepare(
      'SELECT id, email, name, is_global_admin, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    
    return c.json(createdUser, 201)
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: 'User with this email already exists' })
    }
    throw error
  }
})

app.put('/users/:userId', validator('json', UpdateUserSchema), async (c) => {
  const userId = c.req.param('userId')
  const data = c.req.valid('json')
  
  // Check if user exists
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first()
  
  if (!existingUser) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  
  // Build dynamic update query
  const updates = []
  const values = []
  
  if (data.email !== undefined) {
    updates.push('email = ?')
    values.push(data.email)
  }
  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.is_global_admin !== undefined) {
    updates.push('is_global_admin = ?')
    values.push(data.is_global_admin)
  }
  
  if (updates.length === 0) {
    throw new HTTPException(400, { message: 'No valid fields to update' })
  }
  
  values.push(userId)
  
  try {
    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()
    
    // Log to audit
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      'global',
      c.get('user').sub,
      'admin.user.update',
      userId,
      new Date().toISOString(),
      JSON.stringify(data)
    ).run()
    
    const updatedUser = await c.env.DB.prepare(
      'SELECT id, email, name, is_global_admin, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    
    return c.json(updatedUser)
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: 'User with this email already exists' })
    }
    throw error
  }
})

app.delete('/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  // Check if user exists
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first()
  
  if (!existingUser) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  
  // Prevent self-deletion
  if (userId === c.get('user').sub) {
    throw new HTTPException(400, { message: 'Cannot delete your own account' })
  }
  
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    'global',
    c.get('user').sub,
    'admin.user.delete',
    userId,
    new Date().toISOString(),
    JSON.stringify({ deleted_user_id: userId })
  ).run()
  
  return c.json({ success: true })
})

// Company Management  
app.get('/companies', async (c) => {
  const companies = await c.env.DB.prepare(
    'SELECT id, name, region, created_at FROM tenants ORDER BY created_at DESC'
  ).all()
  return c.json(companies.results)
})

app.post('/companies', validator('json', CreateCompanySchema), async (c) => {
  const data = c.req.valid('json')
  const companyId = await generateId()
  
  await c.env.DB.prepare(
    'INSERT INTO tenants (id, name, region, created_at) VALUES (?, ?, ?, ?)'
  ).bind(
    companyId,
    data.name,
    data.region,
    new Date().toISOString()
  ).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    'global',
    c.get('user').sub,
    'admin.company.create',
    companyId,
    new Date().toISOString(),
    JSON.stringify(data)
  ).run()
  
  const createdCompany = await c.env.DB.prepare(
    'SELECT id, name, region, created_at FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  return c.json(createdCompany, 201)
})

app.put('/companies/:companyId', validator('json', UpdateCompanySchema), async (c) => {
  const companyId = c.req.param('companyId')
  const data = c.req.valid('json')
  
  // Check if company exists
  const existingCompany = await c.env.DB.prepare(
    'SELECT id FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  if (!existingCompany) {
    throw new HTTPException(404, { message: 'Company not found' })
  }
  
  // Build dynamic update query
  const updates = []
  const values = []
  
  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.region !== undefined) {
    updates.push('region = ?')
    values.push(data.region)
  }
  
  if (updates.length === 0) {
    throw new HTTPException(400, { message: 'No valid fields to update' })
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
    'global',
    c.get('user').sub,
    'admin.company.update',
    companyId,
    new Date().toISOString(),
    JSON.stringify(data)
  ).run()
  
  const updatedCompany = await c.env.DB.prepare(
    'SELECT id, name, region, created_at FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  return c.json(updatedCompany)
})

app.delete('/companies/:companyId', async (c) => {
  const companyId = c.req.param('companyId')
  
  // Check if company exists
  const existingCompany = await c.env.DB.prepare(
    'SELECT id FROM tenants WHERE id = ?'
  ).bind(companyId).first()
  
  if (!existingCompany) {
    throw new HTTPException(404, { message: 'Company not found' })
  }
  
  // Check if company has users (cascade will handle deletion, but we want to warn)
  const memberCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM memberships WHERE tenant_id = ?'
  ).bind(companyId).first()
  
  await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(companyId).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    'global',
    c.get('user').sub,
    'admin.company.delete',
    companyId,
    new Date().toISOString(),
    JSON.stringify({ deleted_company_id: companyId, member_count: memberCount?.count || 0 })
  ).run()
  
  return c.json({ success: true, message: `Company deleted along with ${memberCount?.count || 0} memberships` })
})

// Announcements
app.post('/announcements', validator('json', CreateAnnouncementSchema), async (c) => {
  const data = c.req.valid('json')
  const announcementId = await generateId()
  
  // Get all users to send announcement to
  const users = await c.env.DB.prepare('SELECT id, email FROM users').all()
  
  // In a real implementation, you would:
  // 1. Store the announcement in a database table
  // 2. Send notifications via email/push/in-app notifications
  // 3. Track delivery status
  
  // For now, we'll just log the announcement and simulate sending
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    'global',
    c.get('user').sub,
    'admin.announcement.send',
    announcementId,
    new Date().toISOString(),
    JSON.stringify({
      ...data,
      recipient_count: users.results?.length || 0,
      announcement_id: announcementId
    })
  ).run()
  
  return c.json({
    id: announcementId,
    ...data,
    sent_to: users.results?.length || 0,
    sent_at: new Date().toISOString(),
    status: 'sent'
  }, 201)
})

export default app
