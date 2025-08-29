export async function sha256(data: ArrayBuffer | string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function generateId(): Promise<string> {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)
  
  // Combine salt and password
  const combined = new Uint8Array(salt.length + passwordData.length)
  combined.set(salt)
  combined.set(passwordData, salt.length)
  
  // Hash with PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    combined,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  
  // Combine salt and hash for storage
  const result = new Uint8Array(salt.length + hashBuffer.byteLength)
  result.set(salt)
  result.set(new Uint8Array(hashBuffer), salt.length)
  
  return btoa(String.fromCharCode(...result))
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0))
    const salt = combined.slice(0, 16)
    const storedHash = combined.slice(16)
    
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    
    // Combine salt and password
    const passwordWithSalt = new Uint8Array(salt.length + passwordData.length)
    passwordWithSalt.set(salt)
    passwordWithSalt.set(passwordData, salt.length)
    
    // Hash with same parameters
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordWithSalt,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )
    
    const newHash = new Uint8Array(hashBuffer)
    
    // Compare hashes
    if (newHash.length !== storedHash.length) return false
    
    for (let i = 0; i < newHash.length; i++) {
      if (newHash[i] !== storedHash[i]) return false
    }
    
    return true
  } catch {
    return false
  }
}

export class EncryptionService {
  private masterKey: CryptoKey | null = null

  constructor(private env: any) {}

  async init() {
    const masterKeyCiphertext = this.env.ENCRYPTION_MASTER_KCV
    // Derive master key from environment secret
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterKeyCiphertext),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    this.masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('lct-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  async encrypt(plaintext: string, aad: string = ''): Promise<{ ciphertext: string; iv: string }> {
    if (!this.masterKey) await this.init()

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedText = new TextEncoder().encode(plaintext)
    const additionalData = new TextEncoder().encode(aad)

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData
      },
      this.masterKey!,
      encodedText
    )

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv))
    }
  }

  async decrypt(ciphertext: string, iv: string, aad: string = ''): Promise<string> {
    if (!this.masterKey) await this.init()

    const ciphertextBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    const additionalData = new TextEncoder().encode(aad)

    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
        additionalData
      },
      this.masterKey!,
      ciphertextBuffer
    )

    return new TextDecoder().decode(plaintext)
  }
}