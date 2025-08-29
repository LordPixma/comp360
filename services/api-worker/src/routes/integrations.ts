import { Hono } from 'hono'
import type { Env } from '../index'

export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder - not implemented yet
integrationsRoutes.get('/*', (c) => {
  return c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Integrations API not implemented yet' } }, 501)
})