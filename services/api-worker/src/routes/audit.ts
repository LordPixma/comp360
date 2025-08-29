import { Hono } from 'hono'
import type { Env } from '../index'

export const auditRoutes = new Hono<{ Bindings: Env }>()

// Placeholder - not implemented yet
auditRoutes.get('/*', (c) => {
  return c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Audit API not implemented yet' } }, 501)
})