import { Hono } from 'hono'
import type { Env } from '../index'

export const auditRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes - will be implemented later
auditRoutes.get('/', async (c) => {
  return c.json({ message: 'Audit routes not implemented yet' })
})