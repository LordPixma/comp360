import { Hono } from 'hono'
import type { Env } from '../index'

export const evidenceRoutes = new Hono<{ Bindings: Env }>()

// Placeholder - not implemented yet
evidenceRoutes.get('/*', (c) => {
  return c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Evidence API not implemented yet' } }, 501)
})