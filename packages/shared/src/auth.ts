import { SignJWT, jwtVerify, importJWK } from 'jose'
import type { JWK } from 'jose'

export interface JWTPayload {
  sub: string
  tenant: string
  role: 'owner' | 'admin' | 'contributor' | 'auditor'
  exp: number
  iat: number
  ver: number
}

export class AuthService {
  private privateKey: any
  private publicKey: any

  constructor(private env: any) {}

  async init() {
    const privateJWK = await this.env.KV.get('jwks:active_private', 'json')
    const publicJWK = await this.env.KV.get('jwks:public', 'json')
    
    if (privateJWK) {
      this.privateKey = await importJWK(privateJWK as JWK, 'ES256')
    }
    if (publicJWK) {
      this.publicKey = await importJWK(publicJWK as JWK, 'ES256')
    }
  }

  async createToken(payload: Omit<JWTPayload, 'exp' | 'iat' | 'ver'>): Promise<string> {
    if (!this.privateKey) await this.init()
    
    const jwt = await new SignJWT({
      ...payload,
      ver: 1
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('15m') // Shorter lived access tokens
      .sign(this.privateKey)

    return jwt
  }

  async createRefreshToken(userId: string): Promise<string> {
    const { generateId } = await import('./crypto')
    const tokenId = await generateId()
    const token = await generateId()
    
    // Store refresh token in database with 7 day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    await this.env.DB.prepare(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(tokenId, userId, token, expiresAt, new Date().toISOString()).run()
    
    return token
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    const refreshToken = await this.env.DB.prepare(
      'SELECT id, user_id FROM refresh_tokens WHERE token = ? AND expires_at > ? AND revoked = FALSE'
    ).bind(token, new Date().toISOString()).first()
    
    if (!refreshToken) {
      return null
    }
    
    return { userId: refreshToken.user_id, tokenId: refreshToken.id }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?'
    ).bind(token).run()
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?'
    ).bind(userId).run()
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    if (!this.publicKey) await this.init()
    
    const { payload } = await jwtVerify(token, this.publicKey)
    return payload as JWTPayload
  }
}

export function requireRole(ctx: any, allowedRoles: string[]) {
  if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }
}