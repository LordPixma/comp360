import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// GET /tasks - List tasks (stub)
tasksRoutes.get('/', async (c) => {
  return c.json({ tasks: [] })
})