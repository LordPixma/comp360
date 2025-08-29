import { Hono } from 'hono'
import { z } from 'zod'

function requireRole(c: any, allowed: string[]) {
  const user = (c as any).get?.('user') || (c as any).user
  if (!user || !allowed.includes(user.role)) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403)
  }
}

function generateId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

const app = new Hono()

// GET /controls - List controls
app.get('/', async (c) => {
  const pack = c.req.query('pack') || 'soc2_lite'
  
  const controls = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE pack = ?'
  ).bind(pack).all()
  
  return c.json({ controls: controls.results })
})

// GET /controls/:id - Get control details
app.get('/:id', async (c) => {
  const controlId = c.req.param('id')
  const tenant = c.get('tenant')
  
  const control = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE id = ?'
  ).bind(controlId).first()
  
  if (!control) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Control not found' } }, 404)
  }
  
  const status = await c.env.DB.prepare(
    'SELECT * FROM control_status WHERE tenant_id = ? AND control_id = ?'
  ).bind(tenant, controlId).first()
  
  return c.json({ control, status })
})

// POST /controls/:id/status - Update control status
app.post('/:id/status', async (c) => {
  const forbidden = requireRole(c, ['owner', 'admin', 'contributor'])
  if (forbidden) return forbidden
  
  const controlId = c.req.param('id')
  const tenant = c.get('tenant')
  const body = await c.req.json()
  
  const UpdateStatusSchema = z.object({
    status: z.enum(['pass', 'fail', 'na', 'exception']),
    owner_user_id: z.string().optional(),
    next_review_at: z.string().optional()
  })
  
  const data = UpdateStatusSchema.parse(body)
  
  await c.env.DB.prepare(
    `INSERT INTO control_status (tenant_id, control_id, status, owner_user_id, next_review_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, control_id) DO UPDATE SET
       status = excluded.status,
       owner_user_id = excluded.owner_user_id,
       next_review_at = excluded.next_review_at,
       updated_at = excluded.updated_at`
  ).bind(
    tenant,
    controlId,
    data.status,
    data.owner_user_id,
    data.next_review_at,
    new Date().toISOString()
  ).run()
  
  // Log to audit
  await c.env.DB.prepare(
    'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
  generateId(),
    tenant,
    c.get('user').sub,
    'control.status.update',
    controlId,
    new Date().toISOString(),
    JSON.stringify(data)
  ).run()
  
  return c.json({ success: true })
})

export default app