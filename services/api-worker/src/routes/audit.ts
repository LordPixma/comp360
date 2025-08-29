import { Hono } from 'hono'
import type { Env } from '../index'

export const auditRoutes = new Hono<{ Bindings: Env }>()

// GET /audit - List audit logs (stub)
auditRoutes.get('/', async (c) => {
  return c.json({ logs: [] })
})