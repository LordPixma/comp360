import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes - will be implemented later
tasksRoutes.get('/', async (c) => {
  return c.json({ message: 'Tasks routes not implemented yet' })
})