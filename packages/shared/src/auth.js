import { SignJWT, jwtVerify, importJWK } from 'jose';
export class AuthService {
    env;
    privateKey;
    publicKey;
    constructor(env) {
        this.env = env;
    }
    async init() {
        const privateJWK = await this.env.KV.get('jwks:active_private', 'json');
        const publicJWK = await this.env.KV.get('jwks:public', 'json');
        if (privateJWK) {
            this.privateKey = await importJWK(privateJWK, 'ES256');
        }
        if (publicJWK) {
            this.publicKey = await importJWK(publicJWK, 'ES256');
        }
    }
    async createToken(payload) {
        if (!this.privateKey)
            await this.init();
        const jwt = await new SignJWT({
            ...payload,
            ver: 1
        })
            .setProtectedHeader({ alg: 'ES256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(this.privateKey);
        return jwt;
    }
    async verifyToken(token) {
        if (!this.publicKey)
            await this.init();
        const { payload } = await jwtVerify(token, this.publicKey);
        return payload;
    }
}
export function requireRole(ctx, allowedRoles) {
    if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
    }
}
