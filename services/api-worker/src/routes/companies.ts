import { Hono } from 'hono'
import { z } from 'zod'
import { requireRole } from '@shared/auth'
import { generateId } from '@shared/crypto'
import type { Env } from '../index'

export const companiesRoutes = new Hono<{ Bindings: Env }>()

// Middleware to validate company access
async function validateCompanyAccess(c: any, companyId: string) {
  const userCompany = c.get('tenant') // JWT contains the user's company ID in 'tenant' field
  
  if (userCompany !== companyId) {
    return c.json({ 
      error: { 
        code: 'FORBIDDEN', 
        message: 'Access denied. You can only access your own company data.' 
      } 
    }, 403)
  }
  return null
}

// GET /companies/{companyId}/controls - View the status of all controls for a company
companiesRoutes.get('/:companyId/controls', async (c) => {
  const companyId = c.req.param('companyId')
  
  // Validate company access
  const accessError = await validateCompanyAccess(c, companyId)
  if (accessError) return accessError
  
  const pack = c.req.query('pack') || 'soc2_lite'
  
  // Get all controls for the pack
  const controls = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE pack = ?'
  ).bind(pack).all()
  
  // Get control statuses for this company
  const statuses = await c.env.DB.prepare(
    'SELECT * FROM control_status WHERE company_id = ?'
  ).bind(companyId).all()
  
  // Create a map of control statuses
  const statusMap = new Map()
  if (statuses.results) {
    statuses.results.forEach((status: any) => {
      statusMap.set(status.control_id, status)
    })
  }
  
  // Combine controls with their statuses
  const controlsWithStatus = controls.results?.map((control: any) => ({
    ...control,
    status: statusMap.get(control.id) || null
  })) || []
  
  return c.json({ controls: controlsWithStatus })
})

// GET /companies/{companyId}/controls/{controlId} - Get detailed status of a specific control
companiesRoutes.get('/:companyId/controls/:controlId', async (c) => {
  const companyId = c.req.param('companyId')
  const controlId = c.req.param('controlId')
  
  // Validate company access
  const accessError = await validateCompanyAccess(c, companyId)
  if (accessError) return accessError
  
  // Get the control details
  const control = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE id = ?'
  ).bind(controlId).first()
  
  if (!control) {
    return c.json({ 
      error: { 
        code: 'NOT_FOUND', 
        message: 'Control not found' 
      } 
    }, 404)
  }
  
  // Get the control status for this company
  const status = await c.env.DB.prepare(
    'SELECT * FROM control_status WHERE company_id = ? AND control_id = ?'
  ).bind(companyId, controlId).first()
  
  // Get evidence manifests for this control and company
  const evidence = await c.env.DB.prepare(
    'SELECT * FROM evidence_manifests WHERE company_id = ? AND control_id = ? ORDER BY collected_at DESC'
  ).bind(companyId, controlId).all()
  
  return c.json({ 
    control, 
    status: status || null,
    evidence: evidence.results || []
  })
})

// PUT /companies/{companyId}/controls/{controlId} - Update the status and evidence for a control
companiesRoutes.put('/:companyId/controls/:controlId', async (c) => {
  requireRole(c, ['owner', 'admin', 'contributor'])
  
  const companyId = c.req.param('companyId')
  const controlId = c.req.param('controlId')
  
  // Validate company access
  const accessError = await validateCompanyAccess(c, companyId)
  if (accessError) return accessError
  
  const body = await c.req.json()
  
  const UpdateControlSchema = z.object({
    status: z.enum(['pass', 'fail', 'na', 'exception']),
    owner_user_id: z.string().optional(),
    next_review_at: z.string().optional(),
    evidence_manifest_id: z.string().optional()
  })
  
  const data = UpdateControlSchema.parse(body)
  
  // Verify the control exists
  const control = await c.env.DB.prepare(
    'SELECT * FROM controls WHERE id = ?'
  ).bind(controlId).first()
  
  if (!control) {
    return c.json({ 
      error: { 
        code: 'NOT_FOUND', 
        message: 'Control not found' 
      } 
    }, 404)
  }
  
  // Update or insert control status
  await c.env.DB.prepare(
    `INSERT INTO control_status (company_id, control_id, status, owner_user_id, next_review_at, evidence_manifest_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(company_id, control_id) DO UPDATE SET
       status = excluded.status,
       owner_user_id = excluded.owner_user_id,
       next_review_at = excluded.next_review_at,
       evidence_manifest_id = excluded.evidence_manifest_id,
       updated_at = excluded.updated_at`
  ).bind(
    companyId,
    controlId,
    data.status,
    data.owner_user_id,
    data.next_review_at,
    data.evidence_manifest_id,
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
  
  // Get the updated status to return
  const updatedStatus = await c.env.DB.prepare(
    'SELECT * FROM control_status WHERE company_id = ? AND control_id = ?'
  ).bind(companyId, controlId).first()
  
  return c.json({ 
    success: true,
    status: updatedStatus
  })
})