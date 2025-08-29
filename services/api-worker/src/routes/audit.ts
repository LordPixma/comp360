import { Hono } from 'hono'
import type { Env } from '../index'

export const auditRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes
auditRoutes.get('/', (c) => {
  return c.json({ message: 'Audit endpoint - not implemented yet' })
})