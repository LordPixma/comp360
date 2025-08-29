import { Hono } from 'hono'
import type { Env } from '../index'

export const tenantsRoutes = new Hono<{ Bindings: Env }>()

// Legacy route - redirect to companies
tenantsRoutes.get('/*', (c) => {
  return c.json({ error: { code: 'DEPRECATED', message: 'Use /companies endpoints instead' } }, 410)
})