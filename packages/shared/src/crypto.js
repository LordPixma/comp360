export async function sha256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export async function generateId() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export class EncryptionService {
    env;
    masterKey = null;
    constructor(env) {
        this.env = env;
    }
    async init() {
        const masterKeyCiphertext = this.env.ENCRYPTION_MASTER_KCV;
        // Derive master key from environment secret
        const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(masterKeyCiphertext), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
        this.masterKey = await crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: new TextEncoder().encode('lct-salt'),
            iterations: 100000,
            hash: 'SHA-256'
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    }
    async encrypt(plaintext, aad = '') {
        if (!this.masterKey)
            await this.init();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(plaintext);
        const additionalData = new TextEncoder().encode(aad);
        const ciphertext = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv,
            additionalData
        }, this.masterKey, encodedText);
        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }
    async decrypt(ciphertext, iv, aad = '') {
        if (!this.masterKey)
            await this.init();
        const ciphertextBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
        const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
        const additionalData = new TextEncoder().encode(aad);
        const plaintext = await crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv: ivBuffer,
            additionalData
        }, this.masterKey, ciphertextBuffer);
        return new TextDecoder().decode(plaintext);
    }
}
