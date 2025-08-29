import { Hono } from 'hono'
import type { Env } from '../index'

export const tenantsRoutes = new Hono<{ Bindings: Env }>()

// Placeholder for tenants routes
// TODO: Implement tenant management endpoints