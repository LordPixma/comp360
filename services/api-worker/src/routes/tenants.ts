import { Hono } from 'hono'
import type { Env } from '../index'

export const tenantsRoutes = new Hono<{ Bindings: Env }>()

// GET /tenants - List tenants (stub)
tenantsRoutes.get('/', async (c) => {
  return c.json({ tenants: [] })
})