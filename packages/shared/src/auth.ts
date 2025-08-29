import { SignJWT, jwtVerify, importJWK, type JWTPayload as JoseJWTPayload } from 'jose'
import type { JWK } from 'jose'
import { ForbiddenError } from './errors'

export interface JWTPayload {
  sub: string
  company?: string
  tenant?: string
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
      .setExpirationTime('7d')
      .sign(this.privateKey)

    return jwt
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    if (!this.publicKey) await this.init()
    
    const { payload } = await jwtVerify(token, this.publicKey)
    // Align jose JWTPayload to our app JWTPayload by permitting extra fields
    return payload as unknown as JWTPayload
  }
}

export function requireRole(ctx: any, allowedRoles: string[]) {
  if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }
}