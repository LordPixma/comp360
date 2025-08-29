import { Hono } from 'hono'
import type { Env } from '../index'

export const evidenceRoutes = new Hono<{ Bindings: Env }>()

// GET /evidence - List evidence (stub)
evidenceRoutes.get('/', async (c) => {
  return c.json({ evidence: [] })
})