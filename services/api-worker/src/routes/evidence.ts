import { Hono } from 'hono'
import type { Env } from '../index'

export const evidenceRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes - will be implemented later
evidenceRoutes.get('/', async (c) => {
  return c.json({ message: 'Evidence routes not implemented yet' })
})