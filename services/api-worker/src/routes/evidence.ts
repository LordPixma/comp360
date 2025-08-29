import { Hono } from 'hono'
import { requireRole } from '@c360/shared'
import { generateId, sha256 } from '@c360/shared'
import { NotFoundError, ValidationError } from '@c360/shared'
import { UploadEvidenceSchema } from '@c360/core'
import type { Env } from '../index'

export const evidenceRoutes = new Hono<{ Bindings: Env }>()

// POST /evidence - Upload new evidence for a control
// This is adapted from the required POST /api/v1/companies/{companyId}/evidence
// The companyId is handled via tenant isolation
evidenceRoutes.post('/', async (c) => {
  requireRole(c, ['owner', 'admin', 'contributor'])
  
  const tenant = c.get('tenant')
  const body = await c.req.json()
  
  const data = UploadEvidenceSchema.parse(body)
  
  // Generate unique IDs
  const evidenceId = await generateId()
  const manifestId = await generateId()
  
  // Generate storage key for R2
  const storageKey = `${tenant}/${manifestId}/${data.file.name}`
  
  try {
    // Upload file to R2
    const fileBuffer = Uint8Array.from(atob(data.file.content), c => c.charCodeAt(0))
    const fileHash = await sha256(fileBuffer)
    
    await c.env.R2_EVIDENCE.put(storageKey, fileBuffer, {
      httpMetadata: {
        contentType: data.file.type
      }
    })
    
    // Create evidence object metadata
    const evidenceObject = {
      key: storageKey,
      sha256: fileHash,
      size: data.file.size,
      contentType: data.file.type
    }
    
    // Calculate manifest hash
    const manifestHash = await sha256(JSON.stringify(evidenceObject))
    await c.env.DB.prepare(
      `INSERT INTO evidence_manifests (id, tenant_id, control_id, collected_at, collector, objects_json, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      manifestId,
      tenant,
      data.control_id,
      new Date().toISOString(),
      data.collector,
      JSON.stringify([evidenceObject]),
      manifestHash
    ).run()
    
    // Log to audit
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      tenant,
      c.get('user').sub,
      'evidence.upload',
      manifestId,
      new Date().toISOString(),
      JSON.stringify({ control_id: data.control_id, file_name: data.file.name })
    ).run()
    
    return c.json({ 
      success: true, 
      evidenceId: manifestId,
      storageKey 
    })
    
  } catch (error) {
    console.error('Evidence upload failed:', error)
    throw new ValidationError('Failed to upload evidence')
  }
})

// GET /evidence/:id - Download a specific piece of evidence
evidenceRoutes.get('/:id', async (c) => {
  const evidenceId = c.req.param('id')
  const tenant = c.get('tenant')
  
  // Get evidence manifest
  const manifest = await c.env.DB.prepare(
    'SELECT * FROM evidence_manifests WHERE id = ? AND tenant_id = ?'
  ).bind(evidenceId, tenant).first()
  
  if (!manifest) {
    throw new NotFoundError('Evidence not found')
  }
  
  try {
    const objects = JSON.parse(manifest.objects_json)
    if (!objects || objects.length === 0) {
      throw new NotFoundError('No evidence objects found')
    }
    
    // For now, return the first object's download URL
    const firstObject = objects[0]
    
    // Generate presigned URL for download (simplified for MVP)
    const downloadUrl = await c.env.R2_EVIDENCE.get(firstObject.key)
    
    if (!downloadUrl) {
      throw new NotFoundError('Evidence file not found in storage')
    }
    
    // Log access
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      tenant,
      c.get('user').sub,
      'evidence.access',
      evidenceId,
      new Date().toISOString(),
      JSON.stringify({ action: 'download' })
    ).run()
    
    // Return the file directly
    return new Response(downloadUrl.body, {
      headers: {
        'Content-Type': firstObject.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${firstObject.key.split('/').pop()}"`
      }
    })
    
  } catch (error) {
    console.error('Evidence download failed:', error)
    throw new NotFoundError('Failed to retrieve evidence')
  }
})

// DELETE /evidence/:id - Remove a piece of evidence
evidenceRoutes.delete('/:id', async (c) => {
  requireRole(c, ['owner', 'admin'])
  
  const evidenceId = c.req.param('id')
  const tenant = c.get('tenant')
  
  // Get evidence manifest
  const manifest = await c.env.DB.prepare(
    'SELECT * FROM evidence_manifests WHERE id = ? AND tenant_id = ?'
  ).bind(evidenceId, tenant).first()
  
  if (!manifest) {
    throw new NotFoundError('Evidence not found')
  }
  
  try {
    const objects = JSON.parse(manifest.objects_json)
    
    // Delete files from R2
    for (const obj of objects) {
      await c.env.R2_EVIDENCE.delete(obj.key)
    }
    
    // Delete manifest from database
    await c.env.DB.prepare(
      'DELETE FROM evidence_manifests WHERE id = ? AND tenant_id = ?'
    ).bind(evidenceId, tenant).run()
    
    // Log to audit
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      tenant,
      c.get('user').sub,
      'evidence.delete',
      evidenceId,
      new Date().toISOString(),
      JSON.stringify({ control_id: manifest.control_id })
    ).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Evidence deletion failed:', error)
    throw new ValidationError('Failed to delete evidence')
  }
})

// POST /companies/:companyId/evidence - Upload evidence for a specific company 
// This matches the exact API requirement from the problem statement
evidenceRoutes.post('/:companyId/evidence', async (c) => {
  requireRole(c, ['owner', 'admin', 'contributor'])
  
  const companyId = c.req.param('companyId')
  const tenant = c.get('tenant')
  
  // Ensure the company ID matches the authenticated tenant
  if (companyId !== tenant) {
    throw new NotFoundError('Company not found or access denied')
  }
  
  // Use the same logic as the main evidence upload endpoint
  const body = await c.req.json()
  const data = UploadEvidenceSchema.parse(body)
  
  // Generate unique IDs
  const manifestId = await generateId()
  const storageKey = `${tenant}/${manifestId}/${data.file.name}`
  
  try {
    // Upload file to R2
    const fileBuffer = Uint8Array.from(atob(data.file.content), c => c.charCodeAt(0))
    const fileHash = await sha256(fileBuffer)
    
    await c.env.R2_EVIDENCE.put(storageKey, fileBuffer, {
      httpMetadata: {
        contentType: data.file.type
      }
    })
    
    // Create evidence object metadata
    const evidenceObject = {
      key: storageKey,
      sha256: fileHash,
      size: data.file.size,
      contentType: data.file.type
    }
    
    // Calculate manifest hash
    const manifestHash = await sha256(JSON.stringify(evidenceObject))
    
    // Create evidence manifest
    await c.env.DB.prepare(
      `INSERT INTO evidence_manifests (id, tenant_id, control_id, collected_at, collector, objects_json, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      manifestId,
      tenant,
      data.control_id,
      new Date().toISOString(),
      data.collector,
      JSON.stringify([evidenceObject]),
      manifestHash
    ).run()
    
    // Log to audit
    await c.env.DB.prepare(
      'INSERT INTO audit_log (id, tenant_id, actor, action, target, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      await generateId(),
      tenant,
      c.get('user').sub,
      'evidence.upload',
      manifestId,
      new Date().toISOString(),
      JSON.stringify({ control_id: data.control_id, file_name: data.file.name, company_id: companyId })
    ).run()
    
    return c.json({ 
      success: true, 
      evidenceId: manifestId,
      storageKey 
    })
    
  } catch (error) {
    console.error('Evidence upload failed:', error)
    throw new ValidationError('Failed to upload evidence')
  }
})