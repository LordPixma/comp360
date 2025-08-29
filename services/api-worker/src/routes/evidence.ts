import { Hono } from 'hono'
import type { Env } from '../index'

export const evidenceRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes
evidenceRoutes.get('/', (c) => {
  return c.json({ message: 'Evidence endpoint - not implemented yet' })
})