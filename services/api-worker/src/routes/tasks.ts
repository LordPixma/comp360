import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// Placeholder for tasks routes
// TODO: Implement task management endpoints