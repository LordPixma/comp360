import { Hono } from 'hono'
import { z } from 'zod'
import { requireRole } from '@shared/auth'
import { generateId } from '@shared/crypto'
import type { Env } from '../index'

export const controlsRoutes = new Hono<{ Bindings: Env }>()

// GET /controls - List controls
controlsRoutes.get('/', async (c) => {
  const pack = c.req.query('pack') || 'soc2_lite'
  
  const controls = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE pack = ?'
  ).bind(pack).all()
  
  return c.json({ controls: controls.results })
})

// GET /controls/:id - Get control details
controlsRoutes.get('/:id', async (c) => {
  const controlId = c.req.param('id')
  const companyId = c.get('tenant') // JWT contains company ID in 'tenant' field
  
  const control = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE id = ?'
  ).bind(controlId).first()
  
  if (!control) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Control not found' } }, 404)
  }
  
  const status = await c.env.DB.prepare(
    'SELECT * FROM control_status WHERE company_id = ? AND control_id = ?'
  ).bind(companyId, controlId).first()
  
  return c.json({ control, status })
})

// POST /controls/:id/status - Update control status
controlsRoutes.post('/:id/status', async (c) => {
  requireRole(c, ['owner', 'admin', 'contributor'])
  
  const controlId = c.req.param('id')
  const companyId = c.get('tenant') // JWT contains company ID in 'tenant' field
  const body = await c.req.json()
  
  const UpdateStatusSchema = z.object({
    status: z.enum(['pass', 'fail', 'na', 'exception']),
    owner_user_id: z.string().optional(),
    next_review_at: z.string().optional()
  })
  
  const data = UpdateStatusSchema.parse(body)
  
  await c.env.DB.prepare(
    `INSERT INTO control_status (company_id, control_id, status, owner_user_id, next_review_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(company_id, control_id) DO UPDATE SET
       status = excluded.status,
       owner_user_id = excluded.owner_user_id,
       next_review_at = excluded.next_review_at,
       updated_at = excluded.updated_at`
  ).bind(
    companyId,
    controlId,
    data.status,
    data.owner_user_id,
    data.next_review_at,
    new Date().toISOString()
  ).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, company_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    await generateId(),
    companyId,
    c.get('user').sub,
    'control.status.update',
    controlId,
    new Date().toISOString(),
    JSON.stringify(data)
  ).run()
  
  return c.json({ success: true })
})