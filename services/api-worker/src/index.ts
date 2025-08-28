import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { tenantsRoutes } from './routes/tenants'
import { controlsRoutes } from './routes/controls'
import { integrationsRoutes } from './routes/integrations'
import { evidenceRoutes } from './routes/evidence'
import { tasksRoutes } from './routes/tasks'
import { auditRoutes } from './routes/audit'

export interface Env {
  DB: D1Database
  R2_EVIDENCE: R2Bucket
  KV: KVNamespace
  QUEUE: Queue
  LOCKS: DurableObjectNamespace
  
  // Secrets
  OIDC_GOOGLE_CLIENT_ID: string
  OIDC_GOOGLE_CLIENT_SECRET: string
  OIDC_MS_CLIENT_ID: string
  OIDC_MS_CLIENT_SECRET: string
  JWT_PRIVATE_JWK_KV_KEY: string
  ENCRYPTION_MASTER_KCV: string
  TURNSTILE_SITE_KEY: string
  TURNSTILE_SECRET_KEY: string
  
  // Variables
  ENV: string
}

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', cors())
app.use('*', logger())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', env: c.env.ENV })
})

// JWKS endpoint
app.get('/.well-known/jwks.json', async (c) => {
  const publicJWK = await c.env.KV.get('jwks:public', 'json')
  return c.json({ keys: [publicJWK] })
})

// Protected routes middleware
app.use('/v1/*', async (c, next) => {
  // Skip auth for public endpoints
  if (c.req.path.includes('/auth/')) {
    return next()
  }
  
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Token required' } }, 401)
  }
  
  try {
    const publicJWK = await c.env.KV.get('jwks:public', 'json')
    const payload = await jwt.verify(token, publicJWK)
    c.set('user', payload)
    c.set('tenant', payload.tenant)
    c.set('role', payload.role)
  } catch (err) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)
  }
  
  await next()
})

// Mount route groups
app.route('/v1/auth', authRoutes)
app.route('/v1/tenants', tenantsRoutes)
app.route('/v1/controls', controlsRoutes)
app.route('/v1/integrations', integrationsRoutes)
app.route('/v1/evidence', evidenceRoutes)
app.route('/v1/tasks', tasksRoutes)
app.route('/v1/audit', auditRoutes)

// Error handler
app.onError((err, c) => {
  console.error(err)
  const status = err.statusCode || 500
  return c.json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  }, status)
})

export default app