import { Hono } from 'hono'
import { z } from 'zod'
import { AuthService } from '@shared/auth'
import { generateId, hashPassword, verifyPassword } from '@shared/crypto'
import { AuthenticationError, ValidationError, NotFoundError } from '@shared/errors'
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema, RefreshTokenSchema } from '@core/schemas'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

const MagicLinkSchema = z.object({
  email: z.string().email()
})

// OAuth flow - Google
authRoutes.get('/oidc/google/start', async (c) => {
  const state = await generateId()
  await c.env.KV.put(`session:${state}`, JSON.stringify({
    provider: 'google',
    created: Date.now()
  }), { expirationTtl: 900 }) // 15 min
  
  const params = new URLSearchParams({
    client_id: c.env.OIDC_GOOGLE_CLIENT_ID,
    redirect_uri: `${c.req.url.origin}/v1/auth/oidc/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state
  })
  
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

authRoutes.get('/oidc/google/callback', async (c) => {
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
      redirect_uri: `${c.req.url.origin}/v1/auth/oidc/google/callback`,
      grant_type: 'authorization_code'
    })
  })
  
  const tokens = await tokenResponse.json()
  
  // Decode ID token to get user info
  const idToken = tokens.id_token
  const payload = JSON.parse(atob(idToken.split('.')[1]))
  
  // Find or create user
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(payload.email)
    .first()
  
  if (!user) {
    const userId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, payload.email, payload.name, new Date().toISOString()).run()
    
    user = { id: userId, email: payload.email, name: payload.name }
  }
  
  // Get user's tenant and role
  const membership = await c.env.DB.prepare(
    'SELECT * FROM memberships WHERE user_id = ? LIMIT 1'
  ).bind(user.id).first()
  
  if (!membership) {
    // Create a new tenant for first-time users
    const tenantId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO companies (id, name, region, created_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, `${payload.name}'s Workspace`, 'US', new Date().toISOString()).run()
    
    await c.env.DB.prepare(
      'INSERT INTO memberships (company_id, user_id, role, added_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, user.id, 'owner', new Date().toISOString()).run()
    
    membership = { company_id: tenantId, role: 'owner' }
  }
  
  // Create JWT
  const authService = new AuthService(c.env)
  const jwt = await authService.createToken({
    sub: user.id,
    tenant: membership.company_id,
    role: membership.role
  })
  
  // Set cookie and redirect
  c.header('Set-Cookie', `token=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`)
  return c.redirect('/dashboard')
})

// Magic link
authRoutes.post('/magic-link', async (c) => {
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
  const link = `${c.req.url.origin}/v1/auth/magic-link/verify?token=${token}`
  
  return c.json({ message: 'Magic link sent', link: c.env.ENV === 'dev' ? link : undefined })
})

authRoutes.get('/magic-link/verify', async (c) => {
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

// Email/Password Authentication
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = LoginSchema.parse(body)
    
    // Find user by email
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()
    
    if (!user || !user.password_hash) {
      throw new AuthenticationError('Invalid email or password')
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password')
    }
    
    // Get user's tenant and role
    const membership = await c.env.DB.prepare(
      'SELECT * FROM memberships WHERE user_id = ? LIMIT 1'
    ).bind(user.id).first()
    
    if (!membership) {
      // Create a new tenant for first-time users
      const tenantId = await generateId()
      await c.env.DB.prepare(
        'INSERT INTO companies (id, name, region, created_at) VALUES (?, ?, ?, ?)'
      ).bind(tenantId, `${user.name}'s Workspace`, 'US', new Date().toISOString()).run()
      
      await c.env.DB.prepare(
        'INSERT INTO memberships (company_id, user_id, role, added_at) VALUES (?, ?, ?, ?)'
      ).bind(tenantId, user.id, 'owner', new Date().toISOString()).run()
      
      membership = { company_id: tenantId, role: 'owner' }
    }
    
    // Create JWT and refresh token
    const authService = new AuthService(c.env)
    const accessToken = await authService.createToken({
      sub: user.id,
      tenant: membership.company_id,
      role: membership.role
    })
    
    const refreshToken = await authService.createRefreshToken(user.id)
    
    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } }, 400)
    }
    if (error instanceof AuthenticationError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.statusCode)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } }, 500)
  }
})

authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name } = RegisterSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
    
    if (existingUser) {
      return c.json({ error: { code: 'CONFLICT', message: 'User already exists' } }, 409)
    }
    
    // Hash password
    const passwordHash = await hashPassword(password)
    
    // Create user
    const userId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, email, name, passwordHash, new Date().toISOString()).run()
    
    // Create tenant and membership
    const tenantId = await generateId()
    await c.env.DB.prepare(
      'INSERT INTO companies (id, name, region, created_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, `${name}'s Workspace`, 'US', new Date().toISOString()).run()
    
    await c.env.DB.prepare(
      'INSERT INTO memberships (company_id, user_id, role, added_at) VALUES (?, ?, ?, ?)'
    ).bind(tenantId, userId, 'owner', new Date().toISOString()).run()
    
    // Create JWT and refresh token
    const authService = new AuthService(c.env)
    const accessToken = await authService.createToken({
      sub: userId,
      tenant: tenantId,
      role: 'owner'
    })
    
    const refreshToken = await authService.createRefreshToken(userId)
    
    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      user: {
        id: userId,
        email: email,
        name: name
      }
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } }, 400)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } }, 500)
  }
})

authRoutes.post('/logout', async (c) => {
  try {
    const refreshToken = c.req.header('X-Refresh-Token')
    
    if (refreshToken) {
      const authService = new AuthService(c.env)
      await authService.revokeRefreshToken(refreshToken)
    }
    
    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Logout failed' } }, 500)
  }
})

authRoutes.post('/refresh-token', async (c) => {
  try {
    const body = await c.req.json()
    const { refresh_token } = RefreshTokenSchema.parse(body)
    
    const authService = new AuthService(c.env)
    const tokenData = await authService.verifyRefreshToken(refresh_token)
    
    if (!tokenData) {
      throw new AuthenticationError('Invalid or expired refresh token')
    }
    
    // Get user and membership info
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(tokenData.userId)
      .first()
    
    if (!user) {
      throw new NotFoundError('User not found')
    }
    
    const membership = await c.env.DB.prepare(
      'SELECT * FROM memberships WHERE user_id = ? LIMIT 1'
    ).bind(user.id).first()
    
    if (!membership) {
      throw new NotFoundError('User membership not found')
    }
    
    // Create new access token
    const accessToken = await authService.createToken({
      sub: user.id,
      tenant: membership.company_id,
      role: membership.role
    })
    
    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900 // 15 minutes
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } }, 400)
    }
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.statusCode)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' } }, 500)
  }
})

authRoutes.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json()
    const { email } = ForgotPasswordSchema.parse(body)
    
    // Find user by email
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
    
    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({ message: 'If the email exists, a password reset link has been sent' })
    }
    
    // Generate password reset token
    const token = await generateId()
    const tokenId = await generateId()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    
    await c.env.DB.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(tokenId, user.id, token, expiresAt, new Date().toISOString()).run()
    
    // In production, send email with reset link
    // For now, return the link in development
    const resetLink = `${c.req.url.origin}/reset-password?token=${token}`
    
    return c.json({
      message: 'If the email exists, a password reset link has been sent',
      reset_link: c.env.ENV === 'dev' ? resetLink : undefined
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } }, 400)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Password reset request failed' } }, 500)
  }
})

authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json()
    const { token, password } = ResetPasswordSchema.parse(body)
    
    // Find and validate reset token
    const resetToken = await c.env.DB.prepare(
      'SELECT id, user_id FROM password_reset_tokens WHERE token = ? AND expires_at > ? AND used = FALSE'
    ).bind(token, new Date().toISOString()).first()
    
    if (!resetToken) {
      throw new AuthenticationError('Invalid or expired reset token')
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password)
    
    // Update user password
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(passwordHash, resetToken.user_id).run()
    
    // Mark token as used
    await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?'
    ).bind(resetToken.id).run()
    
    // Revoke all existing refresh tokens for security
    const authService = new AuthService(c.env)
    await authService.revokeAllRefreshTokens(resetToken.user_id)
    
    return c.json({ message: 'Password reset successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } }, 400)
    }
    if (error instanceof AuthenticationError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.statusCode)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Password reset failed' } }, 500)
  }
})
