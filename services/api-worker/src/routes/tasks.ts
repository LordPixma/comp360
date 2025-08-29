import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes
tasksRoutes.get('/', (c) => {
  return c.json({ message: 'Tasks endpoint - not implemented yet' })
})