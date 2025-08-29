import { Hono } from 'hono'
import type { Env } from '../index'

export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// GET /integrations - List integrations (stub)
integrationsRoutes.get('/', async (c) => {
  return c.json({ integrations: [] })
})