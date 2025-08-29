import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import { requireRole } from '@c360/shared'

const app = new Hono()

// Middleware to ensure user is a global admin
app.use('/*', async (c, next) => {
  // This is a placeholder. In a real app, you'd get the user from the session
  // and check if they are a global admin.
  const user = { role: 'global_admin' } // Mock user
  if (user.role !== 'global_admin') {
    throw new HTTPException(403, { message: 'Forbidden' })
  }
  await next()
})

// User Management
app.get('/users', (c) => {
  // In a real app, you'd fetch this from the database
  const users = [
    { id: 'clx2i0s0s0000s0m9c6p8a4b2', email: 'admin@comp360.com', name: 'Global Admin', is_global_admin: true },
    { id: 'user_2', email: 'test@test.com', name: 'Test User', is_global_admin: false },
  ]
  return c.json(users)
})

// Company Management
app.get('/companies', (c) => {
    // In a real app, you'd fetch this from the database
    const companies = [
        {id: '1', name: 'Test Company', region: 'EU'}
    ]
    return c.json(companies)
})

export default app
