import { Hono } from 'hono'
import type { Env } from '../index'

export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes
integrationsRoutes.get('/', (c) => {
  return c.json({ message: 'Integrations endpoint - not implemented yet' })
})