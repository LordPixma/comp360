import { Hono } from 'hono'
import type { Env } from '../index'

export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes - will be implemented later
integrationsRoutes.get('/', async (c) => {
  return c.json({ message: 'Integrations routes not implemented yet' })
})