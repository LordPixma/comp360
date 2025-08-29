import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// Placeholder - not implemented yet
tasksRoutes.get('/*', (c) => {
  return c.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Tasks API not implemented yet' } }, 501)
})