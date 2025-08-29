import { Hono } from 'hono'
import type { Env } from '../index'

export const tenantsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes
tenantsRoutes.get('/', (c) => {
  return c.json({ message: 'Tenants endpoint - not implemented yet' })
})