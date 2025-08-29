import { Hono } from 'hono'
import type { Env } from '../index'

export const tenantsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder routes - will be implemented later
tenantsRoutes.get('/', async (c) => {
  return c.json({ message: 'Tenants routes not implemented yet' })
})