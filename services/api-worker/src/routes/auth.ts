import { Hono } from 'hono'
import { z } from 'zod'
import { generateId } from '@shared/crypto'
const app = new Hono()

const MagicLinkSchema = z.object({
  email: z.string().email()
})

// OAuth flow - Google
app.get('/oidc/google/start', async (c) => {
  const state = await generateId()
  await c.env.KV.put(`session:${state}`, JSON.stringify({
    provider: 'google',
    created: Date.now()
  }), { expirationTtl: 900 }) // 15 min
  
  const origin = new URL(c.req.url).origin
  const params = new URLSearchParams({
    client_id: c.env.OIDC_GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/v1/auth/oidc/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state
  })
  
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

app.get('/oidc/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  
  if (!code || !state) {
    return c.json({ error: { code: 'INVALID_REQUEST', message: 'Missing code or state' } }, 400)
  }
  
  // Verify state
  const session = await c.env.KV.get(`session:${state}`, 'json')
  if (!session) {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Invalid or expired state' } }, 400)
  }
  await c.env.KV.delete(`session:${state}`)
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.OIDC_GOOGLE_CLIENT_ID,
      client_secret: c.env.OIDC_GOOGLE_CLIENT_SECRET,
  redirect_uri: `${new URL(c.req.url).origin}/v1/auth/oidc/google/callback`,
      grant_type: 'authorization_code'
    })
  })
  
  const tokens = await tokenResponse.json()
  
  // Decode ID token to get user info
  const idToken = tokens.id_token
  const idPayload = JSON.parse(atob(idToken.split('.')[1]))
  
  // Find or create user
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
  .bind(idPayload.email)
    .first()
  
  if (!user) {
    const userId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
  ).bind(userId, idPayload.email, idPayload.name, new Date().toISOString()).run()
    
  user = { id: userId, email: idPayload.email, name: idPayload.name }
  }
  
  // Get user's tenant and role
  let membership = await c.env.DB.prepare(
    'SELECT * FROM memberships WHERE user_id = ? LIMIT 1'
  ).bind(user.id).first()
  
  if (!membership) {
    // Create a new tenant for first-time users
    const tenantId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO tenants (id, name, region, created_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, `${idPayload.name}'s Workspace`, 'US', new Date().toISOString()).run()
    
    await c.env.DB.prepare(
      'INSERT INTO memberships (tenant_id, user_id, role, added_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, user.id, 'owner', new Date().toISOString()).run()
    
    membership = { tenant_id: tenantId, role: 'owner' }
  }
  
  // Create JWT
  // TODO: Replace with real JWT from KV-backed JWKs. For now, stub a token.
  const payload = { sub: user.id, tenant: membership.tenant_id, role: membership.role }
  const jwt = btoa(JSON.stringify(payload))
  
  // Set cookie and redirect
  c.header('Set-Cookie', `token=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`)
  return c.redirect('/dashboard')
})

// Magic link
app.post('/magic-link', async (c) => {
  const body = await c.req.json()
  const { email } = MagicLinkSchema.parse(body)
  
  // Verify turnstile
  const turnstileToken = c.req.header('X-Turnstile-Token')
  if (c.env.ENV === 'prod' && turnstileToken) {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken
      })
    })
    const result = await verification.json()
    if (!result.success) {
      return c.json({ error: { code: 'CAPTCHA_FAILED', message: 'Verification failed' } }, 400)
    }
  }
  
  // Generate magic link token
  const token = await generateId()
  await c.env.KV.put(`magic:${token}`, email, { expirationTtl: 900 }) // 15 min
  
  // In production, send email
  // For now, return the link
  const link = `${new URL(c.req.url).origin}/v1/auth/magic-link/verify?token=${token}`
  
  return c.json({ message: 'Magic link sent', link: c.env.ENV === 'dev' ? link : undefined })
})

app.get('/magic-link/verify', async (c) => {
  const token = c.req.query('token')
  if (!token) {
    return c.json({ error: { code: 'INVALID_TOKEN', message: 'Token required' } }, 400)
  }
  
  const email = await c.env.KV.get(`magic:${token}`)
  if (!email) {
    return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }, 400)
  }
  
  await c.env.KV.delete(`magic:${token}`)
  
  // Find or create user (similar to OAuth flow)
  // ... (implementation similar to above)
  
  return c.redirect('/dashboard')
})

export default app
