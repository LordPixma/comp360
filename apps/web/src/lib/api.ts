export const api = {
  async get(path: string, init?: RequestInit) {
    const res = await fetch(`/api${path}`, { ...init, method: 'GET' })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  },
  async post(path: string, { json, ...init }: { json?: any } & RequestInit = {}) {
    const res = await fetch(`/api${path}`, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: json ? JSON.stringify(json) : init?.body,
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json().catch(() => ({}))
  },
}
